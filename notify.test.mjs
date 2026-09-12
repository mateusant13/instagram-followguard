// IG FollowGuard — notification-path tests with a stubbed chrome global.
'use strict';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const created = [];
const CHROME_FAKE = {
  alarms: { clear: async () => {}, create: async () => {}, onAlarm: { addListener() {} } },
  storage: { local: { get: async () => ({}), set: async () => {}, remove: async () => {} } },
  runtime: {
    getURL: (p) => `chrome-extension://test/${p}`,
    onInstalled: { addListener() {} },
    onStartup: { addListener() {} },
    onMessage: { addListener() {} },
  },
  notifications: {
    create: async (id, opts) => { created.push({ id, opts }); },
    clear: async () => {},
    onClicked: { addListener() {} },
  },
  tabs: { create: async () => {} },
};


// See backup.test.mjs: `chrome` is confined to this file's test window so it
// never leaks into sibling files, and background.js is imported from before()
// to avoid resuming a top-level await inside another file's test registration
// (bun#5090). ?iso= gives this file a fresh module instance.
let notifyUnfollows;
before(async () => {
  globalThis.chrome = CHROME_FAKE;
  ({ notifyUnfollows } = await import('./background.js?iso=notify'));
});
after(() => {
  delete globalThis.chrome;
});

test('single unfollows produce one notification each with profile text', async () => {
  created.length = 0;
  await notifyUnfollows([
    { username: 'alanzoka', pk: '1', fullName: 'Alan Ferreira', detectedAt: 1000, stillFollowing: true },
    { username: 'gaveta', pk: '2', fullName: '', detectedAt: 1001, stillFollowing: true },
  ]);
  assert.equal(created.length, 2);
  assert.equal(created[0].opts.title, 'alanzoka deixou de te seguir');
  assert.match(created[0].opts.message, /Alan Ferreira/);
  assert.equal(created[1].opts.title, 'gaveta deixou de te seguir');
  assert.match(created[1].opts.message, /Você ainda segue esta conta/);
  assert.ok(created[0].id.startsWith('igf-uf-'));
  assert.ok(created[0].opts.iconUrl.endsWith('images/icon128.png'));
});

test('>5 unfollows collapse into a single summary notification', async () => {
  created.length = 0;
  const evs = Array.from({ length: 10 }, (_, i) => ({
    username: `u${i}`, pk: String(i), fullName: '', detectedAt: i, stillFollowing: true,
  }));
  await notifyUnfollows(evs);
  assert.equal(created.length, 1);
  assert.equal(created[0].opts.title, '10 pessoas deixaram de te seguir');
  assert.match(created[0].opts.message, /últimas 10/);
});
