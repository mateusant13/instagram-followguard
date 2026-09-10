// Lifecycle regression tests (gate r1 / lens finding C-4): the 83-test unit
// suite never executed sync() nor the onStartup/onInstalled listeners, which
// is exactly how the settings0 / hasPartials ReferenceErrors shipped green.
// These tests drive the REAL module through the handlers Chrome itself calls.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// In-memory chrome.storage.local (JSON round-trip like the real one).
const store = new Map();
const getC = (k) => (store.has(k) ? JSON.parse(JSON.stringify(store.get(k))) : undefined);

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
    getManifest: () => ({ version: '0.6.4' }),
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
    async query() { return []; },
    async create() { throw new Error('REGRESSION: extension opened an IG tab automatically'); },
    async get() { throw new Error('no tab'); },
    async sendMessage() { throw new Error('no listener'); },
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
    async getAll() { return []; }, // no session -> readSession yields ds_user_id-only session
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
