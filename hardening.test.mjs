// IG FollowGuard — delete-all + HTML escaping tests.
'use strict';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
globalThis.chrome = {
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

globalThis.document = {
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
globalThis.parent = { postMessage() {} };

const { deleteAllData } = await import('./background.js');

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
  assert.equal(store['igf.settings'].refreshMinutes, 60);
  assert.equal(store['igf.state'].status, 'idle');
  assert.equal(store['other.key'], 'keep');
});

globalThis.__IGF_SKIP_UI_BOOT__ = true;
const { itemHtml } = await import('./dashboard.js');

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
