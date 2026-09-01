// IG FollowGuard — detect friendship actions on instagram.com (page fetch/XHR hook).
// Runs at document_start; injects a page-world script so we see same-origin requests
// when the user follows, unfollows, removes a follower, approves a request, or blocks.
'use strict';

(() => {
  if (window.__igfFriendshipWatch) return;
  window.__igfFriendshipWatch = true;

  const inject = () => {
    if (document.getElementById('igf-friendship-hook')) return;
    const s = document.createElement('script');
    s.id = 'igf-friendship-hook';
    s.textContent = `(() => {
  if (window.__igfFriendshipHook) return;
  window.__igfFriendshipHook = true;
  const RULES = [
    { action: 'unfollow', re: /\\/api\\/v1\\/friendships\\/(?:destroy|unfollow)\\/([^/?#]+)/i },
    { action: 'follow', re: /\\/api\\/v1\\/friendships\\/create\\/([^/?#]+)/i },
    { action: 'remove_follower', re: /\\/api\\/v1\\/friendships\\/remove_follower\\/([^/?#]+)/i },
    { action: 'approve', re: /\\/api\\/v1\\/friendships\\/approve\\/([^/?#]+)/i },
    { action: 'block', re: /\\/api\\/v1\\/friendships\\/block\\/([^/?#]+)/i },
  ];
  const notify = (url) => {
    try {
      const s = String(url || '');
      for (const { action, re } of RULES) {
        const m = s.match(re);
        if (m && m[1]) {
          window.postMessage({ type: 'igf-friendship', action, pk: m[1] }, '*');
          return;
        }
      }
    } catch {}
  };
  const origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = function(input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      notify(url);
      return origFetch.apply(this, arguments);
    };
  }
  const XHR = window.XMLHttpRequest;
  if (XHR && XHR.prototype) {
    const open = XHR.prototype.open;
    XHR.prototype.open = function(method, url) {
      this.__igfUrl = url;
      return open.apply(this, arguments);
    };
    const send = XHR.prototype.send;
    XHR.prototype.send = function() {
      notify(this.__igfUrl);
      return send.apply(this, arguments);
    };
  }
})();`;
    (document.documentElement || document.head || document.body).appendChild(s);
    s.remove();
  };

  if (document.documentElement) inject();
  else document.addEventListener('DOMContentLoaded', inject, { once: true });

  window.addEventListener('message', (ev) => {
    if (ev.source !== window || !ev.data || ev.data.type !== 'igf-friendship') return;
    const action = String(ev.data.action || '').trim();
    const pk = String(ev.data.pk || '').trim();
    if (!action || !pk) return;
    try {
      chrome.runtime.sendMessage({ type: 'igf-friendship-action', action, pk });
    } catch { /* SW asleep — next action will retry */ }
  });
})();
