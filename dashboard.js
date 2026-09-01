// IG FollowGuard — dashboard (popup + injected panel share this).
'use strict';

const TABS = {
  nonFollowers: 'nonFollowers',
  fans: 'fans',
  mutual: 'mutual',
  events: 'events',
  newFollowers: 'newFollowers',
};
const PAGE = 60;
const R = 60 * 1000;

const $ = (id) => document.getElementById(id);

const el = {
  pill: () => $('pill'),
  pillText: () => $('pill-text'),
  lastSync: () => $('last-sync'),
  refresh: () => $('refresh'),
  cardK: () => $('card-k'),
  cardF: () => $('card-f'),
  cardM: () => $('card-m'),
  tabs: () => $('tabs'),
  search: () => $('search'),
  list: () => $('list'),
  error: () => $('error'),
  syncHint: () => $('sync-hint'),
  errText: () => $('err-text'),
  errBtn: () => $('err-btn'),
  meta: () => $('meta'),
  interval: () => $('interval'),
  notif: () => $('notif'),
  openIg: () => $('open-ig'),
  toolbar: () => $('toolbar'),
};

let state = { status: 'idle' };
let settings = {};
let followers = {};
let following = {};
let events = [];
let newFollowers = [];
let history = {};
let tab = TABS.nonFollowers;
let filterType = 'all';
let query = '';
let shown = 0;
let lastOwnKey = '';
let listsCache = null;
let listsFollowersRef = null;
let listsFollowingRef = null;
let poolCache = null;
let poolCacheSig = '';
let listRenderedCount = 0;
let renderRaf = 0;
let listObserver = null;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function relTime(iso) {
  if (!iso) return 'nunca';
  const d = Date.now() - new Date(iso).getTime();
  if (d < R) return 'agora';
  const m = Math.floor(d / R);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  return `há ${days} d`;
}

function avatarImg(u) {
  if (u.profile_pic_url) {
    // No direct src: fbcdn serves `Cross-Origin-Resource-Policy: same-origin`
    // for no-referrer/cross-site requests, which the browser enforces on <img>
    // (net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin — the old placeholder bug).
    // hydrateAvatars() fetches the pic with an instagram.com referrer (CDN
    // then answers `cross-origin`) and swaps in a same-origin blob URL.
    const pic = esc(u.profile_pic_url);
    return `<img class="avatar" data-pic="${pic}" alt="">`;
  }
  return placeholder(u);
}
function placeholder(u) {
  const letter = esc((u.username || '?')[0].toUpperCase());
  return `<span class="avatar" style="display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#fff;background:linear-gradient(135deg,#feda75,#d62976,#962fbf,#4f5bd5)">${letter}</span>`;
}

// Resolve profile pics as same-origin blob URLs (deduped per page instance).
// LRU-capped: the Map holds only the most-recent 512 URLs, so pathological
// scrolling on huge accounts can't grow the string Map unboundedly.
// ponytail: evicted blobs are NOT revoked — revoking a URL that is still in
// the DOM (re-rendered items) would break a visible avatar; blobs are freed
// anyway when the document (popup/panel iframe) is destroyed.
const PIC_CACHE_MAX = 512;
const picCache = new Map(); // url -> Promise<blobUrl>
function isAllowedPicUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    return h === 'instagram.com' || h.endsWith('.instagram.com')
      || h.endsWith('.cdninstagram.com') || h.endsWith('.fbcdn.net');
  } catch {
    return false;
  }
}
function hydrateAvatars(root) {
  for (const img of root.querySelectorAll('img.avatar[data-pic]')) {
    const url = img.dataset.pic;
    img.removeAttribute('data-pic');
    if (!isAllowedPicUrl(url)) {
      const item = img.closest('.item');
      img.outerHTML = placeholder(item && item.dataset ? { username: item.dataset.u } : {});
      continue;
    }
    let p = picCache.get(url);
    if (!p) {
      p = fetch(url, { referrer: 'https://www.instagram.com/', credentials: 'omit' })
        .then((r) => {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.blob();
        })
        .then((b) => URL.createObjectURL(b))
        .catch((err) => { picCache.delete(url); throw err; });
      picCache.set(url, p);
      if (picCache.size > PIC_CACHE_MAX) {
        const oldest = picCache.keys().next().value; // Map = insertion order
        picCache.delete(oldest);
      }
    }
    p.then((blobUrl) => { if (img.isConnected) img.src = blobUrl; })
      .catch(() => {
        if (img.isConnected) {
          const item = img.closest('.item');
          img.outerHTML = placeholder(item && item.dataset ? { username: item.dataset.u } : {});
        }
      });
  }
}

function matchesTypeFilter(u) {
  if (filterType === 'verified') return !!u.is_verified;
  if (filterType === 'private') return !!u.is_private;
  return true;
}
function itemHtml(u) {
  const tags = [];
  if (u.is_private) tags.push('<span class="tag private">privado</span>');
  if (u.is_verified) tags.push('<span class="tag verified">✓</span>');
  const user = esc(u.username);
  const full = esc(u.full_name || '');
  return `
    <div class="item" data-u="${user}">
      ${avatarImg(u)}
      <div class="who">
        <b><a href="https://www.instagram.com/${encodeURIComponent(u.username)}/" target="_blank" rel="noopener">${user}</a></b>
        <span title="${full}">${full}</span>
      </div>
      ${tags.join('')}
    </div>`;
}

function eventHtml(e) {
  const tags = [];
  if (e.stillFollowing) tags.push('<span class="tag unfollowed">você segue</span>');
  const user = esc(e.username);
  const full = esc(e.fullName || '');
  return `
    <div class="item" data-u="${user}">
      ${avatarImg({ username: e.username, profile_pic_url: e.profilePicUrl })}
      <div class="who">
        <b><a href="https://www.instagram.com/${encodeURIComponent(e.username)}/" target="_blank" rel="noopener">${user}</a></b>
        <span title="${full}">${full}</span>
      </div>
      ${tags.join('')}
      <time>${relTime(new Date(e.detectedAt).toISOString())}</time>
    </div>`;
}

function invalidateListCaches() {
  listsCache = null;
  poolCache = null;
  poolCacheSig = '';
  listRenderedCount = 0;
}

function computeLists() {
  const fKeys = new Set(Object.keys(followers));
  const gKeys = Object.keys(following);
  const nonFollowers = gKeys.filter((u) => !fKeys.has(u));
  const mutual = gKeys.filter((u) => fKeys.has(u));
  const fans = Object.keys(followers).filter((u) => !following[u]);
  return { nonFollowers, mutual, fans };
}

function getLists() {
  if (listsCache && listsFollowersRef === followers && listsFollowingRef === following) return listsCache;
  listsFollowersRef = followers;
  listsFollowingRef = following;
  listsCache = computeLists();
  return listsCache;
}

function renderHeader() {
  const pill = el.pill();
  pill.className = 'pill';
  const t = el.pillText();
  switch (state.status) {
    case 'syncing':
      pill.classList.add('sync');
      if (state.syncProgress) {
        const p = state.syncProgress;
        const label = p.phase === 'followers' ? 'seguidores' : (p.phase === 'following' ? 'seguindo' : 'listas');
        if (p.segmentPause && p.resumeAt) {
          const sec = Math.max(0, Math.ceil((p.resumeAt - Date.now()) / 1000));
          t.textContent = `pausa entre blocos… ${label}: ${Number(p.fetched || 0).toLocaleString('pt-BR')} — continua em ${sec}s`;
        } else {
          t.textContent = `sincronizando… ${label}: ${Number(p.fetched || 0).toLocaleString('pt-BR')}`;
        }
      } else {
        t.textContent = 'sincronizando…';
      }
      break;
    case 'ok': pill.classList.add('ok'); t.textContent = 'atualizado'; break;
    case 'error':
      pill.classList.add('err');
      t.textContent = state.incomplete ? 'incompleto' : 'erro';
      break;
    case 'idle': t.textContent = 'aguardando'; break;
    default: t.textContent = state.status;
  }
  el.lastSync().textContent = `última: ${relTime(state.lastSyncAt)}`;
  el.refresh().disabled = state.status === 'syncing';
  el.cardK().querySelector('.count').textContent = state.notFollowingBackCount;
  el.cardF().querySelector('.count').textContent = state.followersCount;
  el.cardM().querySelector('.count').textContent = state.followingCount;
}

function renderSyncHint() {
  const hint = el.syncHint();
  if (!hint) return;
  if (state.status === 'syncing') {
    hint.style.display = 'block';
    const p = state.syncProgress;
    if (p && p.segmentPause) {
      hint.innerHTML =
        '<strong>Pausa entre blocos</strong> — a sincronização continua sozinha em instantes. ' +
        'Não feche a aba do Instagram.';
    } else {
      hint.innerHTML =
        '<strong>Não feche a aba do Instagram</strong> enquanto sincroniza. ' +
        'A aba pode ficar em segundo plano — não precisa estar em foco.';
    }
  } else {
    hint.style.display = 'none';
  }
}

function renderError() {
  if (state.status === 'error' && state.error) {
    el.error().style.display = 'block';
    el.errText().textContent = state.error;
    const isLogin = /sessão|login|verificação|limitada|feedback|aguarde|temporariamente|verificação/i.test(state.error);
    el.errBtn().textContent = isLogin ? 'Abrir Instagram' : 'Tentar de novo';
    el.errBtn().onclick = isLogin ? openInstagram : () => sendSync();
  } else {
    el.error().style.display = 'none';
  }
}

function renderTabs() {
  const { nonFollowers, mutual, fans } = getLists();
  const tabs = [
    { key: TABS.nonFollowers, label: `Não seguem (${nonFollowers.length})` },
    { key: TABS.fans, label: `Te seguem (${fans.length})` },
    { key: TABS.mutual, label: `Mútuos (${mutual.length})` },
    { key: TABS.events, label: `Deixaram (${events.length})` },
    { key: TABS.newFollowers, label: `Novos (${newFollowers.length})` },
  ];
  el.tabs().innerHTML = tabs
    .map((t) => `<button class="tab ${t.key === tab ? 'active' : ''}" data-tab="${t.key}">${t.label}</button>`)
    .join('');
  el.tabs().querySelectorAll('.tab').forEach((b) => {
    b.onclick = () => { tab = b.dataset.tab; shown = 0; invalidateListCaches(); render(); };
  });
  const meta = el.meta();
  if (meta && state.ownUsername) meta.textContent = `@${state.ownUsername} · listas completas`;
}

function renderToolbar() {
  const bar = el.toolbar();
  if (!bar) return;
  const chips = [
    { key: 'all', label: 'Todos' },
    { key: 'verified', label: 'Verificados' },
    { key: 'private', label: 'Privados' },
  ];
  bar.innerHTML = `
    <div class="chip-row">
      ${chips.map((c) => `<button type="button" class="chip ${filterType === c.key ? 'active' : ''}" data-filter="${c.key}">${c.label}</button>`).join('')}
    </div>`;
  bar.querySelectorAll('.chip').forEach((b) => {
    b.onclick = () => { filterType = b.dataset.filter; shown = 0; invalidateListCaches(); renderToolbar(); renderList(); };
  });
}

async function exportBackupFile() {
  const res = await chrome.runtime.sendMessage({ type: 'igf-export-backup' });
  if (!res || !res.ok || !res.backup) {
    alert((res && res.error) || 'Não foi possível exportar o backup.');
    return;
  }
  const name = `igfollowguard-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(res.backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    await chrome.downloads.download({ url, filename: name, saveAs: false });
  } catch {
    alert('Não foi possível baixar o backup.');
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

async function importBackupFile(file) {
  if (!file) return;
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    alert('Arquivo inválido — escolha um .json exportado pelo IG FollowGuard.');
    return;
  }
  if (!confirm('Substituir os dados atuais desta instalação pelo backup?')) return;
  const res = await chrome.runtime.sendMessage({ type: 'igf-import-backup', backup });
  if (!res || !res.ok) {
    alert((res && res.error) || 'Falha ao importar backup.');
    return;
  }
  await load();
}

function buildPool() {
  const sig = `${tab}|${filterType}|${query}|${Object.keys(followers).length}|${Object.keys(following).length}`;
  if (poolCache && poolCacheSig === sig) return poolCache;
  const { nonFollowers, mutual, fans } = getLists();
  const q = query.trim().toLowerCase();
  let pool;
  if (tab === TABS.events) {
    pool = events.filter((e) => !q || e.username.toLowerCase().includes(q) || (e.fullName || '').toLowerCase().includes(q));
  } else if (tab === TABS.newFollowers) {
    pool = newFollowers.filter((e) => !q || e.username.toLowerCase().includes(q) || (e.fullName || '').toLowerCase().includes(q));
  } else {
    let keys;
    let map;
    if (tab === TABS.nonFollowers) { keys = nonFollowers; map = following; }
    else if (tab === TABS.fans) { keys = fans; map = followers; }
    else { keys = mutual; map = following; }
    pool = keys
      .map((u) => map[u])
      .filter(Boolean)
      .filter((u) => matchesTypeFilter(u))
      .filter((u) => !q || u.username.toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q));
  }
  poolCacheSig = sig;
  poolCache = pool;
  return pool;
}

function wireListItems(root) {
  root.querySelectorAll('.item').forEach((it) => {
    it.onclick = (ev) => {
      if (ev.target.closest('a, button')) return;
      openProfile(it.dataset.u);
    };
  });
}

function ensureListObserver() {
  if (listObserver) return;
  listObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { shown += PAGE; renderList(); break; }
    }
  }, { root: null, rootMargin: '160px' });
}

function renderList() {
  const pool = buildPool();
  const target = shown + PAGE;
  const slice = pool.slice(0, target);
  const listEl = el.list();
  if (slice.length === 0) {
    listEl.innerHTML = '<div class="empty">Nada aqui' + (query ? ' para essa busca' : '') + '.</div>';
    listRenderedCount = 0;
    if (listObserver) { listObserver.disconnect(); listObserver = null; }
    return;
  }
  const htmlFn = (tab === TABS.events || tab === TABS.newFollowers) ? eventHtml : itemHtml;
  const hasMore = pool.length > slice.length;
  if (listRenderedCount === 0 || listRenderedCount > slice.length) {
    listEl.innerHTML = slice.map(htmlFn).join('') + (hasMore ? '<div class="sentinel" aria-hidden="true"></div>' : '');
    listRenderedCount = slice.length;
    wireListItems(listEl);
    hydrateAvatars(listEl);
  } else if (slice.length > listRenderedCount) {
    const sentinel = listEl.querySelector('.sentinel');
    if (sentinel) sentinel.remove();
    const tmp = document.createElement('div');
    tmp.innerHTML = slice.slice(listRenderedCount).map(htmlFn).join('');
    while (tmp.firstChild) listEl.appendChild(tmp.firstChild);
    if (hasMore) {
      const s = document.createElement('div');
      s.className = 'sentinel';
      s.setAttribute('aria-hidden', 'true');
      listEl.appendChild(s);
    }
    listRenderedCount = slice.length;
    wireListItems(listEl);
    hydrateAvatars(listEl);
  }
  if (hasMore) {
    ensureListObserver();
    const sentinel = listEl.querySelector('.sentinel');
    if (sentinel) listObserver.observe(sentinel);
  } else if (listObserver) {
    listObserver.disconnect();
    listObserver = null;
  }
}

function renderSettings() {
  el.interval().value = String(settings.refreshMinutes || 60);
  el.notif().checked = settings.notificationsEnabled !== false;
}

function renderHeavy() {
  renderTabs();
  renderToolbar();
  renderList();
  renderSettings();
}

function scheduleRender() {
  if (renderRaf) return;
  renderRaf = requestAnimationFrame(() => {
    renderRaf = 0;
    render();
  });
}

function render() {
  renderHeader();
  renderSyncHint();
  renderError();
  if (state.status === 'syncing') return;
  renderHeavy();
}

function sendSync() {
  chrome.runtime.sendMessage({ type: 'igf-sync', trigger: 'manual' });
}

function eventPicUrl(e) {
  const u = e.username;
  return (
    (following[u] && following[u].profile_pic_url) ||
    (followers[u] && followers[u].profile_pic_url) ||
    (history[u] && history[u].profilePicUrl) ||
    e.profilePicUrl ||
    ''
  );
}

function enrichEvents(list) {
  return list.map((e) => {
    const pic = eventPicUrl(e);
    return pic ? { ...e, profilePicUrl: pic } : e;
  });
}

function openInstagram() {
  chrome.tabs.create({ url: 'https://www.instagram.com/' });
}

function openProfile(username) {
  chrome.tabs.create({ url: `https://www.instagram.com/${encodeURIComponent(username)}/` });
}

async function load() {
  const o = await chrome.storage.local.get([
    'igf.state', 'igf.settings', 'igf.followers', 'igf.following', 'igf.followHistory', 'igf.unfollowEvents', 'igf.newFollowerEvents',
  ]);
  state = o['igf.state'] || { status: 'idle' };
  settings = o['igf.settings'] || {};
  followers = o['igf.followers'] || {};
  following = o['igf.following'] || {};
  history = o['igf.followHistory'] || {};
  events = enrichEvents(o['igf.unfollowEvents'] || []);
  newFollowers = enrichEvents(o['igf.newFollowerEvents'] || []);
  render();
  // Panel: auto-sync when data is stale (popup relies on the manual button).
  if (document.body.classList.contains('panel') && settings.consentAt) {
    const staleMs = (settings.refreshMinutes || 60) * 60 * 1000;
    if (!state.lastSyncAt || Date.now() - new Date(state.lastSyncAt).getTime() > staleMs) {
      sendSync();
    }
  }
  // Announce the dashboard is live (the injected panel listens; harmless
  // when this page runs as the toolbar popup — posting to self, no receiver).
  try {
    parent.postMessage({ type: 'igf-panel-ready' }, '*');
  } catch { /* never break the UI */ }
}

// --- events ----------------------------------------------------------------
el.refresh().onclick = sendSync;
el.cardK().onclick = () => { tab = TABS.nonFollowers; shown = 0; invalidateListCaches(); render(); };
el.cardF().onclick = () => { tab = TABS.fans; shown = 0; invalidateListCaches(); render(); };
el.cardM().onclick = () => { tab = TABS.nonFollowers; shown = 0; invalidateListCaches(); render(); };
el.search().addEventListener('input', (e) => { query = e.target.value; shown = 0; invalidateListCaches(); renderHeavy(); });
el.interval().addEventListener('change', async (e) => {
  await chrome.runtime.sendMessage({
    type: 'igf-settings-update',
    settings: { refreshMinutes: Number(e.target.value) },
  });
});
el.notif().addEventListener('change', async (e) => {
  await chrome.runtime.sendMessage({
    type: 'igf-settings-update',
    settings: { notificationsEnabled: e.target.checked },
  });
});
el.openIg().onclick = openInstagram;

// CSP-safe avatar fallback: a failed <img> becomes the letter placeholder.
// (Inline onerror= handlers are blocked by the extension CSP.)
document.addEventListener('error', (ev) => {
  const t = ev.target;
  if (!t || t.tagName !== 'IMG' || !t.classList || !t.classList.contains('avatar')) return;
  const item = t.closest && t.closest('.item');
  t.outerHTML = placeholder(item && item.dataset ? { username: item.dataset.u } : {});
}, true);

// Panel-only: the inline close script was removed from panel.html (extension
// CSP blocks inline scripts -> console errors); wired here, guarded for the
// popup which has no #close button.
const closeBtn = $('close');
if (closeBtn) closeBtn.addEventListener('click', () => parent.postMessage({ type: 'igf-close-panel' }, '*'));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes['igf.state']) {
    const newState = changes['igf.state'].newValue || { status: 'idle' };
    const ownKey = `${newState.ownUserId || ''}:${newState.ownUsername || ''}`;
    if (lastOwnKey && ownKey !== lastOwnKey) {
      shown = 0;
      query = '';
      const search = el.search();
      if (search) search.value = '';
    }
    lastOwnKey = ownKey;
    state = newState;
  }
  if (changes['igf.settings']) settings = changes['igf.settings'].newValue || {};
  if (changes['igf.followers']) { followers = changes['igf.followers'].newValue || {}; invalidateListCaches(); }
  if (changes['igf.following']) { following = changes['igf.following'].newValue || {}; invalidateListCaches(); }
  if (changes['igf.followHistory']) history = changes['igf.followHistory'].newValue || {};
  if (changes['igf.unfollowEvents']) events = enrichEvents(changes['igf.unfollowEvents'].newValue || []);
  else if (changes['igf.followers'] || changes['igf.following'] || changes['igf.followHistory']) events = enrichEvents(events);
  if (changes['igf.newFollowerEvents']) newFollowers = enrichEvents(changes['igf.newFollowerEvents'].newValue || []);
  else if (changes['igf.followers'] || changes['igf.following'] || changes['igf.followHistory']) newFollowers = enrichEvents(newFollowers);
  render();
});

const exportBackupBtn = $('export-backup');
if (exportBackupBtn) exportBackupBtn.addEventListener('click', () => exportBackupFile());

const importBackupInput = $('import-backup');
if (importBackupInput) {
  importBackupInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    await importBackupFile(file);
  });
}

const deleteBtn = $('delete-data');
if (deleteBtn) {
  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Apagar todos os dados do IG FollowGuard neste navegador?')) return;
    await chrome.runtime.sendMessage({ type: 'igf-delete-all' });
    await load();
  });
}


export { esc, itemHtml };

if (!globalThis.__IGF_SKIP_UI_BOOT__) load();
