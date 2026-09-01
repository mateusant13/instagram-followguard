// IG FollowGuard — detect friendship actions on instagram.com (page fetch/XHR hook).
// Runs at document_start; injects a page-world script file (CSP-safe) so we see
// same-origin requests when the user follows, unfollows, removes a follower, etc.
'use strict';

(() => {
  if (window.__igfFriendshipWatch) return;
  window.__igfFriendshipWatch = true;

  const inject = () => {
    if (document.getElementById('igf-friendship-hook')) return;
    const s = document.createElement('script');
    s.id = 'igf-friendship-hook';
    s.src = chrome.runtime.getURL('friendship_hook.js');
    s.async = false;
    s.onload = () => { s.remove(); };
    (document.documentElement || document.head || document.body).appendChild(s);
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
