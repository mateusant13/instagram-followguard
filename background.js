// IG FollowGuard — service worker.
// Owns: full followers/following sync (complete lists), not-following-back
// diffing, unfollow detection vs the previous snapshot, notifications,
// periodic alarms. Reads ONLY follow/follower relationships.
'use strict';

import { readSession, fetchAllUsers, IgApiError, buildResume, apiFetch, transientRetry, __setTransport } from './ig_api.mjs';
import { diffAndRecord, mergeEvents, detectNewFollowers } from './diff.mjs';

const K = {
  settings: 'igf.settings',
  state: 'igf.state',
  followers: 'igf.followers',
  following: 'igf.following',
  prevFollowers: 'igf.prevFollowers',
  history: 'igf.followHistory',
  events: 'igf.unfollowEvents',
  newFollowers: 'igf.newFollowerEvents',
  snapshotUid: 'igf.snapshotUid',
};
const EVENTS_MAX = 100;
const SYNC_ALARM = 'igf-sync';
const DEFAULT_SETTINGS = {
  // No username here: the logged-in profile is resolved at runtime from the
  // session cookie (ds_user_id -> /api/v1/users/{pk}/info/). Never hardcode.
  refreshMinutes: 60,
  notificationsEnabled: true,
  autoSync: true,
  consentAt: null,
};

/** Account-isolation policy for prevFollowers snapshots (exported for tests). */
export function evaluateSnapshotPolicy(storedSnapshotUid, currentUid) {
  const cur = currentUid != null && currentUid !== '' ? String(currentUid) : null;
  if (!cur) {
    return { skipDiff: false, skipNotify: false, migrateUid: false };
  }
  const stored = storedSnapshotUid != null && storedSnapshotUid !== ''
    ? String(storedSnapshotUid) : null;
  if (stored === null) {
    // Legacy snapshot without uid — diff once, notify once skipped, tag uid.
    return { skipDiff: false, skipNotify: true, migrateUid: true };
  }
  if (stored !== cur) {
    return { skipDiff: true, skipNotify: true, migrateUid: true };
  }
  return { skipDiff: false, skipNotify: false, migrateUid: true };
}

/** Pure sync snapshot step — diff, baseline, and notify eligibility (tests). */
export function processSyncSnapshot({
  storedSnapshotUid,
  currentUid,
  prev,
  followers,
  following,
  history,
  now = Date.now(),
}) {
  const policy = evaluateSnapshotPolicy(storedSnapshotUid, currentUid);
  const fMap = followers instanceof Map ? followers : new Map(Object.entries(followers || {}));
  const gMap = following instanceof Map ? following : new Map(Object.entries(following || {}));
  const hist = history || {};
  let events = [];
  let newHistory = hist;
  if (!policy.skipDiff) {
    const diff = diffAndRecord(prev || {}, fMap, gMap, hist, now);
    events = diff.events;
    newHistory = diff.newHistory;
  }
  const notifyable = policy.skipNotify ? [] : events.filter((e) => e.stillFollowing);
  return {
    events,
    newHistory: policy.skipDiff ? hist : newHistory,
    notifyable,
    snapshotUid: curUid(currentUid),
    freshBaseline: policy.skipDiff,
  };
}

function curUid(uid) {
  return uid != null && uid !== '' ? String(uid) : null;
}


const emptyState = () => ({
  status: 'idle', // idle | syncing | ok | error
  trigger: null,
  lastSyncAt: null,
  lastDurationMs: null,
  error: null,
  ownUsername: null,
  ownUserId: null,
  followersCount: 0,
  followingCount: 0,
  notFollowingBackCount: 0,
  incomplete: false, // true when a list was truncated by the page cap
});

async function getSettings() {
  const o = await chrome.storage.local.get(K.settings);
  return { ...DEFAULT_SETTINGS, ...(o[K.settings] || {}) };
}

async function saveSettings(s) {
  const clean = { ...s };
  delete clean.username; // legacy hardcoded field — never persist/use it
  await chrome.storage.local.set({ [K.settings]: clean });
}

async function getState() {
  const o = await chrome.storage.local.get(K.state);
  return { ...emptyState(), ...(o[K.state] || {}) };
}

async function setState(patch) {
  const o = await chrome.storage.local.get(K.state);
  await chrome.storage.local.set({ [K.state]: { ...emptyState(), ...(o[K.state] || {}), ...patch } });
}


export async function deleteAllData() {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.startsWith('igf.'));
  if (keys.length) await chrome.storage.local.remove(keys);
  await chrome.storage.local.set({
    [K.settings]: { ...DEFAULT_SETTINGS },
    [K.state]: emptyState(),
  });
}

/** Export every igf.* key for backup / reinstall migration. */
export async function exportBackup() {
  const all = await chrome.storage.local.get(null);
  const data = {};
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith('igf.')) data[k] = v;
  }
  return { schema: 1, exportedAt: Date.now(), data };
}

/** Restore igf.* keys from a prior exportBackup() payload. */
export async function importBackup(raw) {
  if (!raw || typeof raw !== 'object' || !raw.data || typeof raw.data !== 'object') {
    throw new Error('Backup inválido — arquivo corrompido ou formato antigo.');
  }
  const entries = Object.entries(raw.data).filter(([k]) => k.startsWith('igf.'));
  if (!entries.length) {
    throw new Error('Backup vazio — nenhum dado do IG FollowGuard.');
  }
  const all = await chrome.storage.local.get(null);
  const stale = Object.keys(all).filter((k) => k.startsWith('igf.'));
  if (stale.length) await chrome.storage.local.remove(stale);
  await chrome.storage.local.set(Object.fromEntries(entries));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Sync checkpoints: persist per-page progress so a failed/restarted sync
// RESUMES from the last page instead of re-fetching everything from scratch
// (the "fez tudo do scratch" complaint). Keyed by uid — never resumes across
// accounts; TTL-guarded; only the contiguous page prefix is ever resumed.
// ---------------------------------------------------------------------------

// 'igf.resume.' namespace (v2): the pre-fix build wrote `seq: page` — a
// restarted loop counter clobbered old checkpoints, so storage can hold
// contiguous labels with TORN content. Bumping the prefix invalidates any
// such partials on upgrade (a torn checkpoint would resume an incomplete
// list). Old keys are never read again (harmless orphans).
const PART_META = 'igf.resume.meta';
const PART_PREFIX = 'igf.resume.';
const partKey = (kind, uid, seq) => `${PART_PREFIX}${kind}.${uid}.${seq}`;

// Serializes the PART_META read-modify-write across the two parallel sync
// branches — without it, a lost key in the index truncates the resume prefix
// and the unindexed value key is never cleaned by clearPartials.
let metaLock = Promise.resolve();

// Best-effort: a failing checkpoint write only costs resume granularity.
function savePagePart(kind, uid, seq, maxId, users) {
  const key = partKey(kind, uid, seq);
  metaLock = metaLock.then(async () => {
    await chrome.storage.local.set({ [key]: { maxId, at: Date.now(), users } });
    const o = await chrome.storage.local.get(PART_META);
    const meta = o[PART_META] || { keys: [] };
    if (!meta.keys.includes(key)) meta.keys.push(key);
    await chrome.storage.local.set({ [PART_META]: meta });
  });
  return metaLock;
}

async function readPartials(uid) {
  try {
    const o = await chrome.storage.local.get(PART_META);
    const meta = o[PART_META];
    if (!meta || !meta.keys.length) return { following: null, followers: null };
    const values = await chrome.storage.local.get(meta.keys);
    return buildResume(uid, meta, values);
  } catch {
    return { following: null, followers: null };
  }
}

async function clearPartials() {
  try {
    const o = await chrome.storage.local.get(PART_META);
    const meta = o[PART_META];
    if (meta && meta.keys.length) await chrome.storage.local.remove([...meta.keys, PART_META]);
  } catch { /* best-effort */ }
}

// ---------------------------------------------------------------------------
// Sync: fetch the COMPLETE following + followers lists, diff, notify.
// ---------------------------------------------------------------------------

let runningSync = null;

// --- Page-context transport ---
// The sync's HTTP requests run on an instagram.com tab via content_proxy.js:
// same-origin fetch with the browser's real headers and native cookies —
// byte-indistinguishable from the web app's own requests (see
// content_proxy.js). One tab is used for the whole sync; a tab WE opened is
// closed when the sync ends ("fecha a aba q tu abriu"), the user's own tab
// is never touched.
//
// Tabs opened BEFORE an extension reload have no content_proxy listener
// (content scripts inject only on load) — pinging selects only tabs that can
// actually serve, and the transport self-heals mid-sync (a closed/navigated
// tab re-ensures a fresh one instead of retrying into a dead listener).
let syncTabId = null;   // tab the active sync is using
let pinnedForeignTabId = null; // user-owned IG tab we marked non-discardable
let openedTabId = null; // tab we created for the sync (must be closed after)

async function pingProxy(tabId) {
  try {
    const r = await chrome.tabs.sendMessage(tabId, { igf: 'ping' });
    return !!(r && r.pong);
  } catch {
    return false;
  }
}

async function waitForProxy(tabId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await pingProxy(tabId)) return true;
    await sleep(400);
  }
  return false;
}

async function pinSyncTab(active, { hint = false } = {}) {
  if (syncTabId == null) return;
  try {
    if (active) {
      await chrome.tabs.update(syncTabId, { autoDiscardable: false });
      if (openedTabId == null) pinnedForeignTabId = syncTabId;
    } else if (pinnedForeignTabId === syncTabId) {
      await chrome.tabs.update(syncTabId, { autoDiscardable: true }).catch(() => {});
      pinnedForeignTabId = null;
    }
    // Banner only during real sync runs — not igf-get-own tab ensure.
    if (!active || hint) {
      await chrome.tabs.sendMessage(syncTabId, { igf: 'sync-hint', active: !!active });
    }
  } catch { /* tab gone or listener not ready */ }
}

async function ensureIgTab() {
  // Prefer an existing IG tab whose content script ANSWERS — a pre-reload
  // tab (no listener) is skipped, never navigated.
  const tabs = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
  for (const t of tabs) {
    if (await pingProxy(t.id)) {
      syncTabId = t.id;
      await pinSyncTab(true);
      return;
    }
  }
  // Reuse our own still-open tab, else open a fresh one (content script is
  // guaranteed after the page loads; ping until it answers).
  if (openedTabId != null) {
    try {
      await chrome.tabs.get(openedTabId);
      syncTabId = openedTabId;
      await pinSyncTab(true);
      return;
    } catch { openedTabId = null; }
  }
  const t = await chrome.tabs.create({ url: 'https://www.instagram.com/', active: false });
  openedTabId = t.id;
  syncTabId = t.id;
  await waitForProxy(t.id, 10000);
  await pinSyncTab(true);
}


[Showing lines 1-300 of 766. Use :301 to continue]