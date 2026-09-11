// Lifecycle regression tests (gate r1 / lens finding C-4): the 83-test unit
// suite never executed sync() nor the onStartup/onInstalled listeners, which
// is exactly how the settings0 / hasPartials ReferenceErrors shipped green.
// These tests drive the REAL module through the handlers Chrome itself calls.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// In-memory chrome.storage.local (JSON round-trip like the real one).
const store = new Map();
const getC = (k) => (store.has(k) ? JSON.parse(JSON.stringify(store.get(k))) : undefined);

// Page-transport lane for the v0.6.5 reuse tests: a fake IG tab let
// ensureIgTab drive the REAL pageTransport, which turns every IG request
// into a chrome.tabs.sendMessage({igf:'fetch', path}) — where we record the
// path. The lane is inert by default (igTabs/cookieJar empty, no proxy
// script), so the dormant-path tests below keep their exact semantics —
// including the tabs.create tripwire.
const FAKE_TAB_ID = 4242;
let igTabs = [];
let cookieJar = [];
let proxyScript = null; // (path) => {ok,status,text}; unset answers ok-empty
const requestedPaths = [];
async function proxyMessage(tabId, msg) {
  if (!msg || !msg.igf || tabId !== FAKE_TAB_ID) throw new Error('no listener');
  if (msg.igf === 'sync-hint') return {};
  if (msg.igf === 'ping') return { pong: true, version: chrome.runtime.getManifest().version };
  if (msg.igf === 'fetch') {
    requestedPaths.push(msg.path);
    const r = proxyScript ? proxyScript(msg.path) : undefined;
    return r ?? { ok: true, status: 200, text: JSON.stringify({ status: 'ok', users: [] }) };
  }
  throw new Error('no listener');
}

let startupCb = null;
let messageCb = null;

globalThis.chrome = {
  storage: {
    local: {
      async get(keys) {
        const list = Array.isArray(keys) ? keys : keys == null ? [...store.keys()] : [keys];
        if (keys == null) {
          const all = {};
          for (const k of store.keys()) all[k] = getC(k);
          return all;
        }
        const out = {};
        for (const k of list) {
          const v = getC(k);
          if (v !== undefined) out[k] = v;
        }
        return out;
      },
      async set(items) {
        for (const [k, v] of Object.entries(items)) store.set(k, JSON.parse(JSON.stringify(v)));
      },
      async remove(keys) {
        for (const k of (Array.isArray(keys) ? keys : [keys])) store.delete(k);
      },
      async clear() { store.clear(); },
    },
    onChanged: { addListener() {} },
    session: { get: async () => undefined, set: async () => {} },
  },
  runtime: {
    id: 'test-ext-id',
    getURL: (p) => `chrome-extension://test-ext-id/${p}`,
    onMessage: { addListener: (cb) => { messageCb = cb; } },
    onStartup: { addListener: (cb) => { startupCb = cb; } },
    onInstalled: { addListener() {} },
    onConnect: { addListener() {} },
    getManifest: () => ({ version: '0.6.5' }),
    lastError: null,
  },
  alarms: {
    _created: [],
    async create(name, info) { this._created.push({ name, info }); },
    async clear() { return true; },
    async getAll() { return []; },
    onAlarm: { addListener() {} },
  },
  tabs: {
    // NO IG tab exists: any code path that forgets the gate and calls
    // ensureIgTab would reach create() below and trip the assertion instead
    // of silently opening a tab.
    async query() { return igTabs.slice(); },
    async create() { throw new Error('REGRESSION: extension opened an IG tab automatically'); },
    async get() { throw new Error('no tab'); },
    async sendMessage(tabId, msg) { return proxyMessage(tabId, msg); },
    async update() {},
    async remove() {},
    onRemoved: { addListener() {} },
    onUpdated: { addListener() {} },
    onActivated: { addListener() {} },
    onCreated: { addListener() {} },
    queryPermission: async () => true,
  },
  notifications: {
    async create() {},
    async clear() { return true; },
    onClicked: { addListener() {} },
  },
  cookies: {
    async getAll() { return cookieJar.slice(); }, // default: no session -> sync fails honest
  },
  action: {
    async setBadgeText() {},
    async setBadgeBackgroundColor() {},
    async setIcon() {},
  },
};

const mod = await import('./background.js');

test('manual sync without consent proceeds (records consent) and survives no session — no ReferenceError', async () => {
  assert.ok(messageCb, 'onMessage listener must be registered at import');
  const res = await new Promise((resolve, reject) => {
    const ok = messageCb(
      { type: 'igf-sync', trigger: 'manual' },
      { id: 'test-ext-id' },
      resolve,
    );
    if (!ok) reject(new Error('handler did not claim async response'));
  });
  assert.ok(res && typeof res === 'object', 'handler must answer with an object');
  // THE P1 (lens C-1/O-1): a ReferenceError surfaces as an error message here.
  assert.doesNotMatch(String(res.error || ''), /settings0 is not defined|hasPartials is not defined|PART_META is not defined/,
    `ReferenceError inside sync(): ${JSON.stringify(res)}`);
  // First manual click = consent gesture (hunt V4): consentAt must be stored.
  const st = getC('igf.settings') || {};
  assert.ok(st.consentAt, 'a manual sync must record consentAt');
  // No session cookies -> sync must fail honest, not crash; lastAttemptAt stamped
  // in the catch (hunt V2 r2 anchor for the error cooldown).
  const state = getC('igf.state') || {};
  assert.equal(state.status, 'error');
  assert.ok(state.lastAttemptAt, 'failed sync must stamp lastAttemptAt');
});

test('automatic trigger without consent skips — zero IG contact', async () => {
  store.clear();
  // consentAt is null after a fresh storage clear (defaults).
  const res = await new Promise((resolve) => {
    messageCb({ type: 'igf-sync', trigger: 'alarm' }, { id: 'test-ext-id' }, resolve);
  });
  assert.deepEqual(res, { ok: false, skipped: 'no-consent' });
  const st = getC('igf.settings') || {};
  assert.equal(st.consentAt ?? null, null, 'automatic triggers must never grant consent');
});

test('onStartup runs clean and never opens a tab (dormant default)', async () => {
  store.clear();
  assert.ok(startupCb, 'onStartup listener must be registered at import');
  // THE P1 (lens C-2/O-3): hasPartials was undeclared here — a raw call would
  // throw ReferenceError, which (async listener) shows as an unhandled rejection.
  await startupCb();
  // Nothing to resume, no consent: startup must have done ZERO IG work and
  // armed ZERO auto-sync alarms (autoSync default is now off).
  const state = getC('igf.state');
  assert.ok(!state || state.status !== 'syncing', 'startup must not start a sync');
  const syncAlarms = chrome.alarms._created.filter((a) => a.name === 'igf-sync');
  assert.equal(syncAlarms.length, 0, 'no consent -> no periodic sync alarm');
});

test('getSettings migrates stored 30/60 cadences to the 180 floor (O-6)', async () => {
  store.set('igf.settings', { refreshMinutes: 30, autoSync: true, consentAt: 1 });
  // Alarm scheduling path uses getSettings; assert the persisted read clamps.
  await startupCb();
  const syncAlarms = chrome.alarms._created.filter((a) => a.name === 'igf-sync' && a.info && a.info.periodInMinutes);
  assert.ok(syncAlarms.length >= 1, 'consented autoSync must arm the alarm');
  const period = syncAlarms[syncAlarms.length - 1].info.periodInMinutes;
  assert.ok(period >= 180, `alarm floored to >=180 min, got ${period}`);
});

// --- v0.6.5 bounded `following` reuse: sync-level proof ---------------------
// The tests above proved sync() survives while dormant. These drive the REAL
// onMessage -> sync() path end-to-end: a logged-in session, a user-owned IG
// tab that answers the ping (so tabs.create — the tripwire above — is never
// reached), and the page transport recording every requested endpoint path.
// The reuse decision must be visible in the TRAFFIC: zero `following`
// requests when the gate holds, and `followers` walked in full either way.
const { __setPageDelayMsForTests, __setRetryBaseMsForTests } = await import('./ig_api.mjs');
__setPageDelayMsForTests(0); // no human inter-page sleeps in a test run
__setRetryBaseMsForTests(1); // transient backoff: 30-240s ladder -> 1ms

const R_UID = '42';
const rUser = (n, full = false) => full
  ? { pk: String(n), username: `u${n}`, full_name: `U ${n}`, is_private: false, is_verified: false, profile_pic_url: '' }
  : { pk: String(n), username: `u${n}`, full_name: `U ${n}` };
// Stored baseline: exactly two followed accounts.
const R_STORED_FOLLOWING = { u1: rUser(1), u2: rUser(2) };
// Age signal 2h old — inside the 7d window: the reuse gate's ONLY variable
// across these two tests is the declared-vs-stored count.
const R_WALKED_AT = new Date(Date.now() - 2 * 3600000).toISOString();
const followingReq = (p) => p.startsWith(`/api/v1/friendships/${R_UID}/following/`);
const followersReq = (p) => p.startsWith(`/api/v1/friendships/${R_UID}/followers/`);

function seedReuseSync({ declaredFollowing }) {
  store.clear();
  requestedPaths.length = 0;
  store.set('igf.settings', {
    refreshMinutes: 180, notificationsEnabled: false, autoSync: false,
    consentAt: Date.now() - 86400000,
  });
  // status idle + no lastSyncAt -> the manual cooldown never blocks; the only
  // gate decided in this sync is the reuse gate itself.
  store.set('igf.state', { status: 'idle', followingWalkedAt: R_WALKED_AT });
  store.set('igf.following', R_STORED_FOLLOWING);
  store.set('igf.followers', {});
  store.set('igf.snapshotUid', R_UID);
  cookieJar = [
    { name: 'sessionid', value: 's3cr3t', domain: '.instagram.com' },
    { name: 'ds_user_id', value: R_UID, domain: '.instagram.com' },
    { name: 'csrftoken', value: 'c', domain: '.instagram.com' },
  ];
  igTabs = [{ id: FAKE_TAB_ID, active: true }];
  // IG-side truth: follower_count 2, walked in TWO pages (the full-walk
  // proof); following declared `declaredFollowing` — the walk, when it
  // happens, returns 3 accounts (a follow we never recorded locally).
  proxyScript = (path) => {
    const ok = (body) => ({ ok: true, status: 200, text: JSON.stringify({ status: 'ok', ...body }) });
    if (path.startsWith(`/api/v1/users/${R_UID}/info/`)) {
      return ok({ user: { pk: R_UID, username: 'me', follower_count: 2, following_count: declaredFollowing } });
    }
    if (path.startsWith(`/api/v1/friendships/${R_UID}/followers/`)) {
      return path.includes('max_id=f1')
        ? ok({ users: [rUser(3)] })
        : ok({ users: [rUser(4)], next_max_id: 'f1' });
    }
    if (path.startsWith(`/api/v1/friendships/${R_UID}/following/`)) {
      return ok({ users: [rUser(1), rUser(2), rUser(5)] });
    }
    return undefined; // unscripted -> ok-empty fallback; path recorder still sees it
  };
}

function clearReuseLane() {
  cookieJar = [];
  igTabs = [];
  proxyScript = null;
}

function runManualSync() {
  return new Promise((resolve, reject) => {
    const ok = messageCb({ type: 'igf-sync', trigger: 'manual' }, { id: 'test-ext-id' }, resolve);
    if (!ok) reject(new Error('handler did not claim async response'));
  });
}

test('following reuse: fresh matching map => zero /following/ requests; followers still walked in full', async () => {
  seedReuseSync({ declaredFollowing: 2 }); // declared === stored size
  let res;
  try {
    res = await runManualSync();
  } finally {
    clearReuseLane();
  }
  assert.equal(res.ok, true, `sync must complete, got ${JSON.stringify(res)}`);
  // THE reuse proof, in the traffic itself: the endpoint is never requested.
  assert.deepEqual(requestedPaths.filter(followingReq), [],
    `a reused map must cost ZERO requests: ${JSON.stringify(requestedPaths)}`);
  // `followers` is NEVER reusable: walked first page to last cursor.
  const fp = requestedPaths.filter(followersReq);
  assert.equal(fp.length, 2, `followers must be walked in full (both pages): ${JSON.stringify(fp)}`);
  assert.ok(!fp[0].includes('max_id='), 'followers walk starts from scratch');
  assert.ok(fp[1].includes('max_id=f1'), 'followers walk follows the cursor to the end');
  assert.equal(res.following, 2);
  assert.equal(res.followers, 2);
  const state = getC('igf.state');
  assert.equal(state.status, 'ok');
  assert.equal(state.followingReused, true);
  assert.equal(state.followingWalkedAt, R_WALKED_AT,
    'a reuse must NOT slide the age signal forward (the 7d window would never expire)');
  assert.deepEqual(getC('igf.following'), R_STORED_FOLLOWING,
    'reuse must skip the stored-map rewrite entirely');
  assert.deepEqual([...store.keys()].filter((k) => k.startsWith('igf.resume.')), [],
    'a completed walk leaves no checkpoints behind');
});

test('following reuse: an orphan resume checkpoint vetoes reuse => both lists walked', async () => {
  // The partials veto lives OUTSIDE the pure gate (background.js sync):
  // `!partials0.following && !partials0.followers &&` before the gate call.
  // Seed a stale FOLLOWERS checkpoint — deleting that veto kept the old
  // suite green while reusing `following` off a half-walked state.
  seedReuseSync({ declaredFollowing: 2 });
  store.set('igf.resume.followers.42.0', { maxId: 'f0', at: Date.now(), users: [rUser(9)] });
  store.set('igf.resume.meta', { keys: ['igf.resume.followers.42.0'] });
  let res;
  try {
    res = await runManualSync();
  } finally {
    clearReuseLane();
  }
  assert.equal(res.ok, true, `sync must complete, got ${JSON.stringify(res)}`);
  assert.deepEqual(requestedPaths.filter(followingReq).length > 0, true,
    'a leftover checkpoint must veto reuse: following IS walked');
  assert.deepEqual(getC('igf.following'), { u1: rUser(1, true), u2: rUser(2, true), u5: rUser(5, true) },
    'vetoed reuse rewrites the stored map from the real walk');
  assert.deepEqual([...store.keys()].filter((k) => k.startsWith('igf.resume.')), [],
    'a completed walk clears the checkpoints');
  const state = getC('igf.state');
  assert.equal(state.followingReused, false, 'vetoed sync is not a reuse');
});

test('following reuse: declared-vs-stored count mismatch => /following/ IS walked and the age signal re-stamps', async () => {
  seedReuseSync({ declaredFollowing: 3 }); // stored map holds 2 -> unwatched change
  let res;
  try {
    res = await runManualSync();
  } finally {
    clearReuseLane();
  }
  assert.equal(res.ok, true, `sync must complete, got ${JSON.stringify(res)}`);
  const fp = requestedPaths.filter(followingReq);
  assert.equal(fp.length, 1, `one mismatched count must re-walk following (single complete walk): ${JSON.stringify(requestedPaths)}`);
  assert.equal(res.following, 3, 'the walked list (3 accounts) replaces the stale map');
  assert.equal(requestedPaths.filter(followersReq).length, 2, 'followers stays fully walked here too');
  const state = getC('igf.state');
  assert.equal(state.followingReused, false);
  assert.ok(state.followingWalkedAt && state.followingWalkedAt !== R_WALKED_AT,
    'a real completed walk must re-stamp followingWalkedAt');
  assert.deepEqual(Object.keys(getC('igf.following')).sort(), ['u1', 'u2', 'u5'],
    'the store must hold the walked list, not the seed');
});
