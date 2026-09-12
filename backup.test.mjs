// IG FollowGuard — backup export/import tests.
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
  tabs: { query: async () => [], create: async () => {}, sendMessage: async () => ({ ok: true }) },
  notifications: { create: async () => {}, clear: async () => {}, onClicked: { addListener() {} } },
};


// `chrome` must exist ONLY inside this file's test window. Bun evaluates every
// test file in ONE process over a shared global, so a module-scope assignment
// leaks into sibling files and pushes their apiFetch calls down the
// "chrome present -> page transport required" branch (ig_api.mjs), which
// fail-closes with 'IGF interno: requisição sem transporte de página.'
// Importing inside before() (rather than a top-level await) additionally keeps
// module evaluation out of other files' registration windows — resuming a
// suspended top-level await mid-test makes the file's own `test()` calls throw
// NotImplementedError (bun#5090). The ?iso= query gives this file its own
// fresh background.js instance (own listener captures), while its static
// imports (ig_api.mjs, diff.mjs) stay shared as before.
let exportBackup;
let importBackup;
before(async () => {
  globalThis.chrome = CHROME_FAKE;
  ({ exportBackup, importBackup } = await import('./background.js?iso=backup'));
});
after(() => {
  delete globalThis.chrome;
});

test('exportBackup collects only igf.* keys', async () => {
  Object.keys(store).forEach((k) => delete store[k]);
  store['igf.followers'] = { a: { pk: '1' } };
  store['igf.following'] = { b: { pk: '2' } };
  store['other'] = { x: 1 };
  const out = await exportBackup();
  assert.equal(out.schema, 1);
  assert.ok(out.exportedAt > 0);
  assert.deepEqual(Object.keys(out.data).sort(), ['igf.followers', 'igf.following']);
});

test('importBackup restores igf.* payload', async () => {
  Object.keys(store).forEach((k) => delete store[k]);
  const payload = {
    schema: 1,
    exportedAt: 1,
    data: {
      'igf.followers': { z: { pk: '9' } },
      'igf.unfollowEvents': [{ username: 'z' }],
      'not-igf': { bad: true },
    },
  };
  await importBackup(payload);
  assert.deepEqual(store['igf.followers'], { z: { pk: '9' } });
  assert.equal(store['igf.unfollowEvents'].length, 1);
  assert.equal(store['not-igf'], undefined);
});

test('importBackup replaces stale igf.* keys', async () => {
  Object.keys(store).forEach((k) => delete store[k]);
  store['igf.followers'] = { old: { pk: '1' } };
  store['igf.history'] = { old: {} };
  await importBackup({
    schema: 1,
    exportedAt: 1,
    data: { 'igf.followers': { new: { pk: '2' } } },
  });
  assert.deepEqual(store['igf.followers'], { new: { pk: '2' } });
  assert.equal(store['igf.history'], undefined);
});

test('importBackup rejects invalid payload', async () => {
  await assert.rejects(() => importBackup(null), /inválido/i);
  await assert.rejects(() => importBackup({ data: {} }), /vazio/i);
});
