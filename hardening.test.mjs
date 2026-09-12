// IG FollowGuard — delete-all + HTML escaping tests.
'use strict';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
const CHROME_FAKE = {
  alarms: { clear: async () => {}, create: async () => {}, onAlarm: { addListener() {} } },
  storage: {
    onChanged: { addListener() {} },
    local: {
      get: async (keys) => {
        if (keys == null) return { ...store };
        if (typeof keys === 'string') return { [keys]: store[keys] };
        const o = {};
        for (const k of keys) if (k in store) o[k] = store[k];
        return o;
      },
      set: async (obj) => { Object.assign(store, obj); },
      remove: async (keys) => {
        for (const k of (Array.isArray(keys) ? keys : [keys])) delete store[k];
      },
    },
  },
  runtime: {
    getURL: (p) => `chrome-extension://test/${p}`,
    onInstalled: { addListener() {} },
    onStartup: { addListener() {} },
    onMessage: { addListener() {} },
  },
  notifications: { create: async () => {}, clear: async () => {}, onClicked: { addListener() {} } },
  tabs: { create: async () => {}, query: async () => [], sendMessage: async () => ({ pong: true }), remove: async () => {}, get: async () => { throw new Error('gone'); } },
};

const DOCUMENT_FAKE = {
  getElementById: () => ({
    onclick: null,
    addEventListener() {},
    textContent: '',
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
  }),
  addEventListener() {},
  body: { classList: { contains: () => false } },
};
const PARENT_FAKE = { postMessage() {} };

// chrome/document/parent are confined to this file's test window and both
// modules are imported from before() — see backup.test.mjs for the full
// rationale (shared bun process, leaked `chrome` poisoning sibling apiFetch
// guards; top-level awaits resuming inside sibling registration windows).
let deleteAllData;
let manualSyncCooldownInfo;
let manualSyncCooldownMs;
let recordManualUnfollowMaps;
let restoreListsAfterFailedWalk;
let shouldReuseFollowingList;
let FOLLOWING_REUSE_MAX_AGE_MS;
let itemHtml;
before(async () => {
  globalThis.chrome = CHROME_FAKE;
  globalThis.document = DOCUMENT_FAKE;
  globalThis.parent = PARENT_FAKE;
  globalThis.__IGF_SKIP_UI_BOOT__ = true;
  ({
    deleteAllData, manualSyncCooldownInfo, manualSyncCooldownMs, recordManualUnfollowMaps,
    restoreListsAfterFailedWalk, shouldReuseFollowingList, FOLLOWING_REUSE_MAX_AGE_MS,
  } = await import('./background.js?iso=hardening'));
  ({ itemHtml } = await import('./dashboard.js?iso=hardening'));
});
after(() => {
  delete globalThis.chrome;
  delete globalThis.document;
  delete globalThis.parent;
  delete globalThis.__IGF_SKIP_UI_BOOT__;
});

test('delete-all wipes every igf.* key incl. resume.* and resets defaults', async () => {
  Object.assign(store, {
    'igf.settings': { refreshMinutes: 30, notificationsEnabled: false, autoSync: false, consentAt: 123 },
    'igf.state': { status: 'ok', ownUsername: 'x' },
    'igf.followers': { a: 1 },
    'igf.following': { b: 1 },
    'igf.prevFollowers': { c: 1 },
    'igf.followHistory': { d: 1 },
    'igf.unfollowEvents': [{ username: 'z' }],
    'igf.snapshotUid': '99',
    'igf.resume.meta': { keys: ['igf.resume.followers.1.0'] },
    'igf.resume.followers.1.0': { users: [] },
    'other.key': 'keep',
  });
  await deleteAllData();
  const keys = Object.keys(store).filter((k) => k.startsWith('igf.'));
  assert.deepEqual(keys.sort(), ['igf.settings', 'igf.state']);
  assert.equal(store['igf.settings'].consentAt, null);
  assert.equal(store["igf.settings"].refreshMinutes, 180); // hunt V5: 3h floor is the new default
  assert.equal(store['igf.state'].status, 'idle');
  assert.equal(store['other.key'], 'keep');
});


test('manual sync cooldown scales with follower count', () => {
  const small = manualSyncCooldownMs(200, 100);
  const mid = manualSyncCooldownMs(20000, 15000);
  const huge = manualSyncCooldownMs(20000, 20000);
  // 10-min floor even for tiny accounts: early retry-happiness is capped.
  // 300 users total -> 10 + floor(300/300) = 11 min (scale starts early).
  assert.equal(small, 11 * 60 * 1000);
  // 20k+15k lists = 35k users -> 10 + floor(35000/300) = 126 -> capped 120 min.
  assert.equal(mid, 120 * 60 * 1000);
  // Ceiling clamps regardless of size growth beyond it.
  assert.equal(huge, 120 * 60 * 1000);
  const last = new Date('2026-01-01T12:00:00.000Z').toISOString();
  const now = new Date('2026-01-01T12:04:00.000Z').getTime();
  const cd = manualSyncCooldownInfo(last, { followersCount: 200, followingCount: 100 }, now);
  assert.equal(cd.blocked, true);
  const ok = manualSyncCooldownInfo(last, { followersCount: 200, followingCount: 100 }, now + small);
  assert.equal(ok.blocked, false);
});

test('free manual refresh bypasses cooldown', () => {
  const last = new Date('2026-01-01T12:00:00.000Z').toISOString();
  const now = new Date('2026-01-01T12:01:00.000Z').getTime();
  const cd = manualSyncCooldownInfo(last, { followersCount: 5000, followingCount: 5000, freeRefreshPending: true }, now);
  assert.equal(cd.blocked, false);
  assert.equal(cd.freeRefresh, true);
});

test('recordManualUnfollowMaps removes user and updates counts', () => {
  const following = { alice: { pk: '1', username: 'alice' }, bob: { pk: '2', username: 'bob' } };
  const followers = { carol: { pk: '3', username: 'carol' } };
  const patch = recordManualUnfollowMaps(following, followers, { pk: '2' });
  assert.ok(patch);
  assert.equal(patch.removedUsername, 'bob');
  assert.equal(patch.followingCount, 1);
  assert.equal(patch.notFollowingBackCount, 1);
  assert.equal(patch.followingObj.alice.username, 'alice');
  assert.equal(patch.followingObj.bob, undefined);
});

test('failed walk rolls the counter back to the last-known-good lists', async () => {
  // The progress tracker publishes the growing lists under the authoritative
  // igf.following / igf.followers keys. When the walk then dies those keys —
  // and igf.state — keep the TRUNCATED data, so the "não seguem de volta"
  // badge shows a number computed from a partial list as if it were final.
  const prewalk = {
    'igf.following': { a: { pk: '1', username: 'a' }, b: { pk: '2', username: 'b' }, c: { pk: '3', username: 'c' } },
    'igf.followers': { a: { pk: '1', username: 'a' } },
  };
  Object.assign(store, {
    'igf.following': { a: { pk: '1', username: 'a' } }, // mid-walk partial
    'igf.followers': {},
    'igf.state': { status: 'error', followingCount: 1, followersCount: 0, notFollowingBackCount: 1 },
  });
  await restoreListsAfterFailedWalk(prewalk);
  assert.deepEqual(Object.keys(store['igf.following']), ['a', 'b', 'c']);
  assert.deepEqual(Object.keys(store['igf.followers']), ['a']);
  assert.equal(store['igf.state'].followingCount, 3);
  assert.equal(store['igf.state'].followersCount, 1);
  assert.equal(store['igf.state'].notFollowingBackCount, 2, 'counter recomputed from restored lists');
});

test('itemHtml escapes full_name XSS payload in text and title', () => {
  const html = itemHtml({
    username: 'safeuser',
    full_name: '"><img src=x>',
    is_private: false,
    is_verified: false,
    profile_pic_url: '',
  });
  assert.match(html, /&quot;&gt;&lt;img src=x&gt;/);
  assert.doesNotMatch(html, /title=""><img/);
  assert.doesNotMatch(html, /<span title=""><img/);
});

// --- v0.6.5 following-reuse gate: pure decision matrix ----------------------
// Mirror of shouldReuseFollowingList (background.js). Every signal must be
// present and agree, or sync() walks the `following` list (fail closed).
const REUSE_NOW = Date.parse('2026-01-08T12:00:00.000Z');
const REUSE_DAY = 24 * 60 * 60 * 1000;
const walkedAgo = (ms) => new Date(REUSE_NOW - ms).toISOString();
// Steady state: same account, declared 20000 === stored 20000, walk 2h old.
const REUSE_OK = {
  snapshotUid: '42',
  currentUid: '42',
  followingWalkedAt: walkedAgo(2 * 60 * 60 * 1000),
  declaredFollowingCount: 20000,
  storedFollowingSize: 20000,
  now: REUSE_NOW,
};
const gate = (over) => shouldReuseFollowingList({ ...REUSE_OK, ...over });

test('following-reuse gate: all signals agree -> reuse; exact 7d boundary inclusive', () => {
  assert.equal(FOLLOWING_REUSE_MAX_AGE_MS, 7 * REUSE_DAY);
  assert.equal(gate(), true);
  // uid comparison normalizes types (IG pks arrive as numbers elsewhere).
  assert.equal(gate({ snapshotUid: 42, currentUid: '42' }), true);
  // Number() coercion at the seam: a numeric-string declared count still
  // matches an equal stored size (exact value match, not string identity).
  assert.equal(gate({ declaredFollowingCount: '20000' }), true);
  assert.equal(gate({ followingWalkedAt: walkedAgo(7 * REUSE_DAY) }), true, 'age == maxAgeMs still reuses');
});

test('following-reuse gate: one ms past the window walks', () => {
  assert.equal(gate({ followingWalkedAt: walkedAgo(7 * REUSE_DAY + 1) }), false, 'age > 7d must re-walk');
  assert.equal(gate({ followingWalkedAt: walkedAgo(8 * REUSE_DAY) }), false);
});

test('following-reuse gate: declared count must equal stored size exactly', () => {
  assert.equal(gate({ declaredFollowingCount: 20003 }), false, 'IG says 20003, we hold 20000 -> unwatched change -> walk');
  assert.equal(gate({ declaredFollowingCount: 19999 }), false, 'off-by-one has no slack');
  assert.equal(gate({ storedFollowingSize: 20001 }), false);
  // null/'' must fail closed even against an EMPTY stored map: Number(null)
  // coerces to 0 and would otherwise satisfy size 0 exactly.
  assert.equal(gate({ declaredFollowingCount: null, storedFollowingSize: 0 }), false);
  assert.equal(gate({ declaredFollowingCount: '', storedFollowingSize: 0 }), false);
  assert.equal(gate({ declaredFollowingCount: undefined, storedFollowingSize: 0 }), false);
  assert.equal(gate({ declaredFollowingCount: null }), false);
  assert.equal(gate({ declaredFollowingCount: undefined }), false);
  assert.equal(gate({ declaredFollowingCount: 'many' }), false);
  assert.equal(gate({ declaredFollowingCount: -5 }), false);
  // Non-integer / negative stored size is malformed state -> walk.
  assert.equal(gate({ storedFollowingSize: -1 }), false);
  assert.equal(gate({ storedFollowingSize: 2.5 }), false);
  assert.equal(gate({ storedFollowingSize: Number.NaN }), false);
});

test('following-reuse gate: missing walk timestamp and account switch walk', () => {
  // Legacy state / last walk never completed: no usable timestamp at all.
  assert.equal(gate({ followingWalkedAt: null }), false);
  assert.equal(gate({ followingWalkedAt: undefined }), false);
  assert.equal(gate({ followingWalkedAt: '' }), false);
  assert.equal(gate({ followingWalkedAt: 'garbage' }), false, 'unparseable timestamp is not a fresh walk');
  assert.equal(gate({ now: Number.NaN }), false, 'unparseable now -> walk');
  // Different / absent account: the stored map is not this account's.
  assert.equal(gate({ currentUid: '43' }), false);
  assert.equal(gate({ snapshotUid: null }), false, 'fresh baseline has no trustworthy snapshot');
  assert.equal(gate({ snapshotUid: '' }), false);
  assert.equal(gate({ currentUid: null }), false);
});

test('following-reuse gate: malformed maxAgeMs disables reuse rather than trusting it', () => {
  assert.equal(gate({ maxAgeMs: '7d' }), false);
  assert.equal(gate({ maxAgeMs: 0 }), false);
  assert.equal(gate({ maxAgeMs: -1 }), false);
  assert.equal(gate({ maxAgeMs: Number.NaN }), false);
  assert.equal(gate({ maxAgeMs: Number.POSITIVE_INFINITY }), false, 'an unbounded window is never a safe cache');
  // A valid custom window is honoured on both sides of the boundary.
  assert.equal(gate({ maxAgeMs: 3 * 60 * 60 * 1000 }), true, '2h walk inside a 3h window');
  assert.equal(gate({ maxAgeMs: 60 * 60 * 1000 }), false, '2h walk past a 1h window');
});
