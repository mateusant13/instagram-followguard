// IG FollowGuard — detect manual unfollows on instagram.com (page fetch/XHR hook).
// Runs at document_start; injects a page-world script so we see the same-origin
// requests the Instagram UI makes when the user taps "Deixar de seguir".
'use strict';

(() => {
  if (window.__igfUnfollowWatch) return;
  window.__igfUnfollowWatch = true;

  const inject = () => {
    if (document.getElementById('igf-unfollow-hook')) return;
    const s = document.createElement('script');
    s.id = 'igf-unfollow-hook';
    s.textContent = `(() => {
  if (window.__igfUnfollowHook) return;
  window.__igfUnfollowHook = true;
  const RE = /\\/api\\/v1\\/friendships\\/(?:destroy|unfollow)\\/([^/?#]+)/i;
  const notify = (url) => {
    try {
      const m = String(url || '').match(RE);
      if (m && m[1]) window.postMessage({ type: 'igf-unfollow', pk: m[1] }, '*');
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
    if (ev.source !== window || !ev.data || ev.data.type !== 'igf-unfollow') return;
    const pk = String(ev.data.pk || '').trim();
    if (!pk) return;
    try {
      chrome.runtime.sendMessage({ type: 'igf-manual-unfollow', pk });
    } catch { /* SW asleep — next unfollow will retry */ }
  });
})();
