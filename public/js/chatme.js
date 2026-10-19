/*!
 * Almara Chat (ChatMe) — klien PWA
 * Vanilla JS + Laravel Reverb (protokol Pusher). Tanpa build step.
 * @2026-Alifiandra
 */

const CFG = window.CHATME || {};
const SIGNATURE = CFG.signature || '@2026-Alifiandra';

/* =========================================================
   Utilitas
   ========================================================= */
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = (s) => new Raw(s);
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
function val(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(val).join('');
  return esc(v);
}
function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => { out += s + (i < vals.length ? val(vals[i]) : ''); });
  return raw(out);
}
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function uuid() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const store = {
  get(k, d = null) { try { const v = localStorage.getItem('chatme.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('chatme.' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('chatme.' + k); } catch {} },
};
const isMobile = () => matchMedia('(max-width: 860px)').matches;

/* ---------- Ikon (garis 24px) ---------- */
const ICONS = {
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  more: '<circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/>',
  send: '<path d="M4 12 20 4l-4 16-4-6.5L4 12Z"/><path d="m12 13.5 3.5-5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  clip: '<path d="m20 11.5-8.2 8.2a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.6 17.3a1.7 1.7 0 0 1-2.4-2.4L15 7"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checks: '<path d="m2.5 12.5 4.5 4.5 9.5-9.5"/><path d="m11.5 16 1 1 9.5-9.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01" stroke-width="2.4"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  devices: '<rect x="2" y="4" width="14" height="10" rx="1.5"/><path d="M5 18h8"/><rect x="17" y="8" width="5" height="12" rx="1.2"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  bellOff: '<path d="M8.5 5A6 6 0 0 1 18 11v5l1.5 2H6M6 11v5l-1.5 2"/><path d="M10 20.5a2 2 0 0 0 4 0M3 3l18 18"/>',
  pin: '<path d="M9 4h6l-1 6 3 3v1H7v-1l3-3-1-6Z"/><path d="M12 14v6"/>',
  archive: '<rect x="3" y="4" width="18" height="4.5" rx="1"/><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 12.5h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
  reply: '<path d="M10 8 5 12.5 10 17"/><path d="M5.5 12.5H14a5 5 0 0 1 5 5V19"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16.5 14.5 12 10 7.5M14.5 12H4"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5H14zM18 18h2v2h-2zM14 19h1.5M19 14h1"/>',
  camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/>',
  install: '<path d="M12 3v11M7.5 9.5 12 14l4.5-4.5"/><rect x="3" y="15" width="18" height="6" rx="2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01" stroke-width="2.4"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  play: '<path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  wifiOff: '<path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M14.5 10.4A10 10 0 0 1 19 13M2 9.5a15 15 0 0 1 4.5-2.8M11 6a15 15 0 0 1 11 3.5"/><path d="M12 20h.01" stroke-width="2.6"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  status: '<circle cx="12" cy="12" r="9" stroke-dasharray="3.2 2.6"/><circle cx="12" cy="12" r="4.2"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.7-1 1.2-1.9-.5-1 0-2.1 1.3-2.1H17a4 4 0 0 0 4-4C21 7.5 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10.5" cy="7.3" r="1.1"/><circle cx="15.2" cy="7.6" r="1.1"/>',
  type: '<path d="M4 18 8.5 6 13 18M5.6 14h5.8M15.5 18v-5.2a2.8 2.8 0 0 1 5.5 0V18M15.5 15.4H21"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8L12 3.5Z"/>',
};
const icon = (name, cls = '') => raw(`<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`);

/* ---------- Format ---------- */
const LOCALE = 'id-ID';
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' }) : '';
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function fmtListTime(iso) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  if (sameDay(d, now)) return fmtTime(iso);
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return 'Kemarin';
  if (now - d < 6 * 864e5) return d.toLocaleDateString(LOCALE, { weekday: 'long' });
  return d.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fmtDay(iso) {
  const d = new Date(iso), now = new Date();
  if (sameDay(d, now)) return 'Hari ini';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return 'Kemarin';
  return d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
function fmtLastSeen(iso) {
  if (!iso) return '';
  const d = new Date(iso), diff = (Date.now() - d) / 1000;
  if (diff < 90) return 'terakhir dilihat baru saja';
  if (sameDay(d, new Date())) return 'terakhir dilihat hari ini ' + fmtTime(iso);
  return 'terakhir dilihat ' + fmtListTime(iso) + (diff < 6 * 86400 ? ' ' + fmtTime(iso) : '');
}
const fmtSize = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const fmtDur = (s) => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtPhone = (p) => { if (!p) return ''; const s = String(p); return s.startsWith('62') ? '+62 ' + s.slice(2).replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3') : '+' + s; };

const AV_COLORS = ['#6B4C93', '#9A5B2E', '#2F7D6D', '#A23E5C', '#3E6AA8', '#7C6A1E', '#5B5BA8', '#2E6E8E'];
const SENDER_COLORS = ['#B07A12', '#2F8F7A', '#B4466A', '#4C7CC2', '#8A5CC2', '#C2622F', '#4F8F2F', '#C24F9A'];
const hashColor = (seed, list) => { let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return list[h % list.length]; };
const initials = (name) => (String(name || '?').replace(/^\+/, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
function avatar(name, url, seed, cls = '') {
  return html`<span class="avatar ${cls}" style="--av:${hashColor(seed ?? name, AV_COLORS)}">${url ? html`<img src="${url}" alt="" loading="lazy">` : initials(name)}</span>`;
}

function richText(text) {
  let s = esc(text);
  s = s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?])/g, '$1<b>$2</b>');
  s = s.replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?])/g, '$1<i>$2</i>');
  s = s.replace(/(^|[\s(])~([^~\n]+)~(?=$|[\s).,!?])/g, '$1<s>$2</s>');
  return raw(s);
}
const isEmojiOnly = (t) => !!t && t.length <= 12 && /^(\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u.test(t) && /\p{Extended_Pictographic}/u.test(t);

/* ---------- Toast ---------- */
function toast(msg, opts = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (opts.error ? ' error' : '');
  el.innerHTML = val(html`<span>${msg}</span>${opts.action ? html`<button class="btn-link">${opts.action}</button>` : ''}`);
  if (opts.action) el.querySelector('button').onclick = () => { opts.onAction?.(); el.remove(); };
  $('#toasts').append(el);
  setTimeout(() => el.remove(), opts.duration || 3600);
}

/* =========================================================
   API
   ========================================================= */
function xsrf() { const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/); return m ? decodeURIComponent(m[1]) : null; }
function firstError(data) {
  if (!data) return null;
  if (data.errors) { const k = Object.keys(data.errors)[0]; if (k) return data.errors[k][0]; }
  return data.message || null;
}
async function api(method, path, body, opts = {}) {
  const headers = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
  const token = xsrf(); if (token) headers['X-XSRF-TOKEN'] = token;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try {
    res = await fetch((opts.raw ? '' : '/api/v1') + path, { method, headers, body: payload, credentials: 'same-origin', signal: opts.signal });
  } catch (e) {
    const err = new Error('Tidak ada koneksi. Periksa internet Anda.'); err.network = true; throw err;
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (res.status === 419 && !opts.retried) {
    await fetch('/', { credentials: 'same-origin' }); // menyegarkan cookie XSRF
    return api(method, path, body, { ...opts, retried: true });
  }
  if (!res.ok) {
    const err = new Error(firstError(data) || `Permintaan gagal (${res.status}).`);
    err.status = res.status; err.data = data;
    if (res.status === 401 && !opts.allow401 && S.me) onSignedOut(data?.code === 'device_revoked' ? 'Perangkat ini telah diputus dari akun Anda.' : 'Sesi berakhir. Silakan masuk kembali.');
    throw err;
  }
  return data;
}

/* =========================================================
   State
   ========================================================= */
const S = {
  me: null, device: null,
  convs: new Map(),
  msgs: new Map(),          // convId -> { items: [], hasMore, loaded, loading }
  activeId: null,
  filter: 'all', query: '',
  typing: new Map(),        // convId -> Map(userId -> {name, until})
  online: new Set(),
  cursor: 0,
  reply: null, editing: null, files: [],
  search: null,             // { q, results, index }
  rt: 'off',                // status koneksi real-time
  installPrompt: null,
  outbox: [],
  view: 'chats',            // chats | status
  statusFeed: null,
};
const myId = () => S.me?.id;
const activeConv = () => S.convs.get(S.activeId);
const setting = (k) => S.me?.settings?.[k];

/* =========================================================
   Tema & PWA
   ========================================================= */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme || 'system';
  store.set('theme', theme || 'system');
  try { localStorage.setItem('chatme.theme', theme || 'system'); } catch {}
  const dark = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]')?.setAttribute('content', dark ? '#120C1A' : '#2A1D40');
}

let swReg = null;
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('/sw.js').then((r) => { swReg = r; }).catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.open) openConversation(Number(e.data.open)); });
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installPrompt = e; renderBanners(); });
window.addEventListener('appinstalled', () => { S.installPrompt = null; store.set('installed', true); renderBanners(); toast('Almara Chat terpasang di perangkat ini.'); });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
async function installApp() {
  if (S.installPrompt) {
    S.installPrompt.prompt();
    const r = await S.installPrompt.userChoice.catch(() => null);
    if (r?.outcome === 'accepted') S.installPrompt = null;
    renderBanners();
  } else if (isIOS()) {
    modal('Pasang di iPhone/iPad', html`<ol class="steps"><li>Buka halaman ini di Safari.</li><li>Ketuk tombol <b>Bagikan</b>.</li><li>Pilih <b>Tambahkan ke Layar Utama</b>.</li></ol>`);
  } else if (!window.isSecureContext) {
    modal('Install memerlukan HTTPS', html`<p>Browser hanya mengizinkan pemasangan aplikasi dari alamat <b>https://</b> atau <b>localhost</b>.</p><p class="hint">Di Laragon: menu <b>Apache/Nginx → SSL → Enabled</b>, lalu buka <b>https://${location.host}</b>.</p>`);
  } else {
    modal('Pasang aplikasi', html`<p>Buka menu browser (⋮) lalu pilih <b>Install aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</p>`);
  }
}

/* ---------- Notifikasi ---------- */
let audioCtx;
function chime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    [[880, 0], [1320, 0.11]].forEach(([f, d]) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.18, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.28);
      o.connect(g).connect(audioCtx.destination); o.start(t + d); o.stop(t + d + 0.3);
    });
  } catch {}
}
async function showNotification(title, body, convId) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, icon: '/icons/icon-192.png', badge: '/icons/icon-96.png', tag: 'conv-' + convId, renotify: true, silent: true, data: { url: '/?c=' + convId, conversation_id: convId } };
  try {
    const reg = swReg || (navigator.serviceWorker && await navigator.serviceWorker.getRegistration());
    if (reg) return reg.showNotification(title, opts);
    const n = new Notification(title, opts); n.onclick = () => { window.focus(); openConversation(convId); n.close(); };
  } catch {}
}
function notifyIncoming(conv, m) {
  const mode = setting('notify_mode') || 'normal';
  if (conv.muted || mode === 'silent') return;
  const visible = document.visibilityState === 'visible' && document.hasFocus();
  if (visible && S.activeId === conv.id) return;
  chime();
  if (mode === 'sound' || (visible && !isMobile())) return;
  if (mode === 'private') return showNotification(CFG.name || 'Almara Chat', 'Anda menerima pesan baru', conv.id);
  const title = conv.type === 'group' ? `${conv.title}` : (m.sender?.name || conv.title);
  const prefix = conv.type === 'group' && m.sender ? m.sender.name + ': ' : '';
  showNotification(title, setting('notify_preview') === false ? 'Pesan baru' : prefix + m.preview, conv.id);
}
function updateAppBadge() {
  const total = [...S.convs.values()].reduce((n, c) => n + (c.muted || c.archived ? 0 : c.unread_count), 0);
  document.title = (total ? `(${total}) ` : '') + (CFG.name || 'Almara Chat');
  try { if (navigator.setAppBadge) total ? navigator.setAppBadge(total) : navigator.clearAppBadge(); } catch {}
  const b = $('#rail-badge'); if (b) { b.hidden = !total; b.textContent = total > 99 ? '99+' : total; }
}

/* =========================================================
   Boot
   ========================================================= */
const app = () => $('#app');

async function boot() {
  applyTheme(store.get('theme', 'system'));
  try {
    const r = await api('GET', '/me', undefined, { allow401: true });
    S.me = r.user; S.device = r.device;
    applyTheme(S.me.settings?.theme);
    if (S.me.needs_profile) return renderProfileSetup();
    await startApp();
  } catch (e) {
    if (e.status === 401 || e.status === 419) return renderAuth();
    if (e.network && store.get('me')) {
      // Offline: tampilkan data terakhir dari cache lokal.
      S.me = store.get('me');
      await startApp(true);
      return;
    }
    renderAuth();
    if (e.network) toast(e.message, { error: true });
  }
}

function onSignedOut(message) {
  stopRealtime();
  S.me = null; S.convs.clear(); S.msgs.clear(); S.activeId = null;
  store.del('me'); store.del('convs');
  closeAllLayers();
  renderAuth();
  if (message) toast(message, { error: true, duration: 6000 });
}

/* =========================================================
   AUTH
   ========================================================= */
function authLayout(content) {
  return html`
  <div class="auth">
    <section class="auth-art">
      <div class="brand-row"><img src="/icons/icon-192.png" alt="">${CFG.name || 'Almara Chat'}</div>
      <div>
        <h1 class="auth-headline">Satu akun. Semua percakapan Anda.</h1>
        <p class="auth-sub">Chat pribadi dan bisnis dalam satu aplikasi — masuk dengan nomor HP, lanjutkan di perangkat mana pun.</p>
        <ul class="auth-points">
          <li>${icon('devices')}<span>Satu nomor, banyak perangkat. Tautkan laptop lewat kode QR.</span></li>
          <li>${icon('shield')}<span>Setiap perangkat punya sesi sendiri dan bisa diputus dari jarak jauh.</span></li>
          <li>${icon('install')}<span>Pasang sebagai aplikasi di HP dan komputer, tanpa toko aplikasi.</span></li>
        </ul>
      </div>
      <p class="auth-foot">${SIGNATURE}</p>
    </section>
    <main class="auth-main"><div class="auth-card">${content}</div></main>
  </div>`;
}

function renderAuth(prefill = '') {
  stopLinkPolling();
  app().innerHTML = val(authLayout(html`
    <h2>Masuk atau daftar</h2>
    <p class="lead">Masukkan nomor HP Anda. Kami akan mengirim kode verifikasi 6 digit.</p>
    <form id="phone-form" novalidate>
      <label class="field"><span>Nomor HP</span>
        <div class="phone-input"><span class="cc">+62</span><input id="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="812 3456 7890" value="${prefill}" required></div>
      </label>
      <p class="error-text" id="auth-err"></p>
      <button class="btn btn-block" id="phone-btn" type="submit">Kirim kode</button>
    </form>
    <div class="auth-alt">
      Sudah masuk di HP?
      <button class="btn-link" data-action="auth-link">${icon('qr', 'i-sm')} Tautkan perangkat ini dengan QR</button>
    </div>`));
  const input = $('#phone'); input.focus();
  $('#phone-form').onsubmit = async (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    if (raw.replace(/\D/g, '').length < 8) { $('#auth-err').textContent = 'Masukkan nomor HP yang valid.'; return; }
    const phone = /^(\+|0|62)/.test(raw) ? raw : '0' + raw;
    const btn = $('#phone-btn'); btn.disabled = true; btn.textContent = 'Mengirim…';
    try {
      const r = await api('POST', '/auth/otp', { phone });
      renderOtp(r);
    } catch (err) {
      $('#auth-err').textContent = err.message;
      btn.disabled = false; btn.textContent = 'Kirim kode';
    }
  };
}

function renderOtp(info) {
  app().innerHTML = val(authLayout(html`
    <button class="btn-link" data-action="auth-back">${icon('back', 'i-sm')} Ganti nomor</button>
    <h2>Masukkan kode</h2>
    <p class="lead">Kode 6 digit dikirim ke <b>${fmtPhone(info.phone)}</b>.</p>
    ${info.debug_code ? html`<p class="debug-otp">Mode pengembangan — kode Anda: <b>${info.debug_code}</b></p>` : ''}
    <form id="otp-form" novalidate>
      <div class="otp-boxes">${[0, 1, 2, 3, 4, 5].map((i) => html`<input inputmode="numeric" pattern="[0-9]*" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" aria-label="Digit ${i + 1}">`)}</div>
      <p class="error-text" id="auth-err"></p>
      <button class="btn btn-block" id="otp-btn" type="submit">Verifikasi</button>
    </form>
    <p class="hint row-between"><span id="resend-info"></span><button class="btn-link" id="resend" hidden>Kirim ulang kode</button></p>`));
  const boxes = $$('.otp-boxes input');
  boxes[0].focus();
  const code = () => boxes.map((b) => b.value).join('');
  const submit = async () => {
    if (code().length !== 6) return;
    const btn = $('#otp-btn'); btn.disabled = true; btn.textContent = 'Memeriksa…';
    try {
      const r = await api('POST', '/auth/verify', { phone: info.phone, code: code() });
      S.me = r.user; S.device = r.device;
      if (S.me.needs_profile) renderProfileSetup(); else startApp();
    } catch (err) {
      $('#auth-err').textContent = err.message;
      boxes.forEach((b) => { b.value = ''; }); boxes[0].focus();
      btn.disabled = false; btn.textContent = 'Verifikasi';
    }
  };
  boxes.forEach((b, i) => {
    b.addEventListener('input', () => {
      const digits = b.value.replace(/\D/g, '');
      if (digits.length > 1) { digits.slice(0, 6).split('').forEach((d, j) => { if (boxes[j]) boxes[j].value = d; }); boxes[Math.min(5, digits.length - 1)].focus(); }
      else { b.value = digits.slice(-1); if (digits && boxes[i + 1]) boxes[i + 1].focus(); }
      if (code().length === 6) submit();
    });
    b.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !b.value && boxes[i - 1]) boxes[i - 1].focus(); });
  });
  $('#otp-form').onsubmit = (e) => { e.preventDefault(); submit(); };
  let left = info.resend_in || 60;
  const tick = () => {
    const el = $('#resend-info'); if (!el) return clearInterval(t);
    if (left <= 0) { el.textContent = 'Belum menerima kode?'; $('#resend').hidden = false; return clearInterval(t); }
    el.textContent = `Kirim ulang dalam ${left--} detik`;
  };
  const t = setInterval(tick, 1000); tick();
  $('#resend').onclick = async () => {
    try { renderOtp(await api('POST', '/auth/otp', { phone: info.phone })); } catch (err) { $('#auth-err').textContent = err.message; }
  };
  $('[data-action="auth-back"]').onclick = () => renderAuth(info.phone.replace(/^62/, ''));
}

let linkPoll = null;
function stopLinkPolling() { if (linkPoll) { clearInterval(linkPoll); linkPoll = null; } }
async function renderAuthLink() {
  stopLinkPolling();
  app().innerHTML = val(authLayout(html`<div class="spinner"></div>`));
  let link;
  try { link = await api('POST', '/devices/link-requests', {}); } catch (e) { toast(e.message, { error: true }); return renderAuth(); }
  let left = link.expires_in;
  app().innerHTML = val(authLayout(html`
    <button class="btn-link" data-action="auth-back">${icon('back', 'i-sm')} Masuk dengan nomor HP</button>
    <h2>Tautkan perangkat ini</h2>
    <p class="lead">Pindai kode ini dari perangkat yang sudah masuk.</p>
    <div class="qr-box">${raw(link.qr_svg)}</div>
    <p class="link-code">${link.code}</p>
    <p class="hint" style="text-align:center" id="link-left"></p>
    <ol class="steps">
      <li>Buka Almara Chat di HP Anda.</li>
      <li>Masuk ke <b>Pengaturan → Perangkat tertaut → Tautkan perangkat</b>.</li>
      <li>Pindai QR di atas, atau ketik kodenya.</li>
    </ol>`));
  $('[data-action="auth-back"]').onclick = () => renderAuth();
  const leftEl = () => $('#link-left');
  linkPoll = setInterval(async () => {
    left -= 2;
    if (leftEl()) leftEl().textContent = left > 0 ? `Kode berlaku ${fmtDur(left)} lagi` : 'Kode kedaluwarsa';
    if (left <= 0) {
      stopLinkPolling();
      if (leftEl()) leftEl().innerHTML = val(html`Kode kedaluwarsa. <button class="btn-link" data-action="auth-link">Buat kode baru</button>`);
      return;
    }
    try {
      const r = await api('GET', `/devices/link-requests/${link.id}?secret=${encodeURIComponent(link.secret)}`);
      if (r.status === 'linked') {
        stopLinkPolling();
        S.me = r.user; S.device = r.device;
        toast('Perangkat berhasil ditautkan.');
        if (S.me.needs_profile) renderProfileSetup(); else startApp();
      } else if (r.status === 'expired' || r.status === 'consumed') { left = 0; }
    } catch {}
  }, 2000);
}

function renderProfileSetup() {
  app().innerHTML = val(authLayout(html`
    <h2>Lengkapi profil</h2>
    <p class="lead">Nama Anda akan terlihat oleh kontak dan anggota grup.</p>
    <form id="profile-form" novalidate>
      <div class="avatar-picker">
        <label>${avatar(S.me.name || '?', S.me.avatar_url, S.me.id, 'lg')}<span class="cam">${icon('camera', 'i-sm')}</span>
          <input type="file" accept="image/*" id="avatar-input" hidden></label>
        <span class="hint">Foto profil (opsional)</span>
      </div>
      <label class="field"><span>Nama</span><input class="input" id="pname" maxlength="80" placeholder="Nama lengkap" required value="${S.me.name || ''}"></label>
      <label class="field"><span>Info</span><input class="input" id="pabout" maxlength="140" placeholder="Contoh: Tersedia" value="${S.me.about || ''}"></label>
      <p class="error-text" id="auth-err"></p>
      <button class="btn btn-block" type="submit">Mulai chat</button>
    </form>`));
  $('#pname').focus();
  $('#avatar-input').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('avatar', f);
    try { S.me = (await api('POST', '/me/avatar', fd)).user; $('.avatar-picker .avatar').outerHTML = val(avatar(S.me.name || '?', S.me.avatar_url, S.me.id, 'lg')); }
    catch (err) { toast(err.message, { error: true }); }
  };
  $('#profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = $('#pname').value.trim();
    if (name.length < 2) { $('#auth-err').textContent = 'Nama minimal 2 karakter.'; return; }
    try {
      S.me = (await api('PATCH', '/me', { name, about: $('#pabout').value.trim() || null })).user;
      startApp();
    } catch (err) { $('#auth-err').textContent = err.message; }
  };
}

/* =========================================================
   APP SHELL
   ========================================================= */
async function startApp(offline = false) {
  store.set('me', S.me);
  renderShell();
  const cached = store.get('convs');
  if (cached && !S.convs.size) { cached.forEach((c) => S.convs.set(c.id, c)); renderList(); }
  if (!offline) {
    await loadConversations();
    loadStatuses();
    connectRealtime();
    flushOutbox();
  }
  const params = new URLSearchParams(location.search);
  if (params.get('c')) openConversation(Number(params.get('c')));
  if (params.get('action') === 'new-chat') openNewChat();
  if (params.get('action') === 'link-device') openApproveLink();
  if (params.toString()) history.replaceState(null, '', '/');
}

function renderShell() {
  app().innerHTML = val(html`
  <div class="shell" id="shell">
    <nav class="rail" aria-label="Navigasi">
      <img class="logo" src="/icons/icon-192.png" alt="${CFG.name}">
      <button class="icon-btn active" data-action="filter" data-filter="all" title="Chat">${icon('chat')}<span class="badge" id="rail-badge" hidden></span></button>
      <button class="icon-btn" data-action="view" data-view="status" id="rail-status" title="Status">${icon('status')}<span class="status-dot" id="rail-status-dot" hidden></span></button>
      <button class="icon-btn" data-action="filter" data-filter="groups" title="Grup">${icon('users')}</button>
      <button class="icon-btn" data-action="filter" data-filter="archived" title="Arsip">${icon('archive')}</button>
      <span class="spacer"></span>
      <button class="icon-btn" data-action="settings-devices" title="Perangkat tertaut">${icon('devices')}</button>
      <button class="icon-btn" data-action="settings" title="Pengaturan">${icon('settings')}</button>
      <button class="icon-btn" data-action="settings" title="Profil" id="rail-me" style="margin-top:6px">${avatar(S.me.name, S.me.avatar_url, S.me.id, 'sm')}</button>
    </nav>
    <aside class="sidebar">
      <header class="side-head">
        <div class="side-tabs" role="tablist">
          <button role="tab" data-action="view" data-view="chats">Chat</button>
          <button role="tab" data-action="view" data-view="status">Status<span class="status-dot" id="tab-status-dot" hidden></span></button>
        </div>
        <span class="side-actions" data-for="chats">
          <button class="icon-btn" data-action="new-group" title="Grup baru">${icon('users')}</button>
          <button class="icon-btn" data-action="new-chat" title="Chat baru">${icon('edit')}</button>
        </span>
        <span class="side-actions" data-for="status">
          <button class="icon-btn" data-action="status-text" title="Status teks">${icon('type')}</button>
          <button class="icon-btn" data-action="status-media" title="Status foto/video">${icon('camera')}</button>
          <button class="icon-btn" data-action="status-privacy" title="Privasi status">${icon('lock')}</button>
        </span>
        <button class="icon-btn mobile-only" data-action="settings" title="Pengaturan">${icon('settings')}</button>
      </header>
      <div data-for="chats">
        <div class="search">${icon('search', 'i-sm')}<input id="conv-search" type="search" placeholder="Cari chat" autocomplete="off"></div>
        <div class="filters" role="tablist">
          ${[['all', 'Semua'], ['unread', 'Belum dibaca'], ['groups', 'Grup'], ['archived', 'Arsip']].map(([k, l]) => html`<button class="chip ${S.filter === k ? 'on' : ''}" data-action="filter" data-filter="${k}" role="tab">${l}</button>`)}
        </div>
      </div>
      <div id="banners"></div>
      <div class="conv-list" id="conv-list"><div class="spinner"></div></div>
      <input type="file" id="status-file" accept="image/*,video/*" hidden>
      <button class="fab" data-action="new-chat" data-for="chats" aria-label="Chat baru">${icon('edit')}</button>
      <button class="fab fab-2" data-action="status-text" data-for="status" aria-label="Status teks">${icon('type')}</button>
      <button class="fab" data-action="status-media" data-for="status" aria-label="Status foto/video">${icon('camera')}</button>
    </aside>
    <section class="pane" id="pane"></section>
  </div>`);
  $('#conv-search').addEventListener('input', debounce((e) => { S.query = e.target.value.trim().toLowerCase(); renderList(); }, 120));
  $('#status-file').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) openStatusMediaComposer(f); };
  applyView();
  renderPane();
  renderBanners();
}

function renderBanners() {
  const el = $('#banners'); if (!el) return;
  const parts = [];
  if (S.rt === 'polling' || S.rt === 'offline') {
    parts.push(html`<div class="conn-banner">${icon(S.rt === 'offline' ? 'wifiOff' : 'clock', 'i-sm')}<span>${S.rt === 'offline' ? 'Offline — pesan akan dikirim saat tersambung.' : 'Mode sinkronisasi berkala (server real-time tidak aktif).'}</span></div>`);
  }
  if (!isStandalone() && !store.get('install-dismissed') && (S.installPrompt || isIOS())) {
    parts.push(html`<div class="install-banner">${icon('install')}<p><b>Pasang Almara Chat</b>Buka lebih cepat, langsung dari layar utama.</p><button class="btn btn-gold" data-action="install" style="padding:8px 14px">Pasang</button><button class="icon-btn" data-action="dismiss-install" aria-label="Tutup">${icon('x', 'i-sm')}</button></div>`);
  }
  if ('Notification' in window && Notification.permission === 'default' && S.convs.size && !store.get('notif-dismissed')) {
    parts.push(html`<div class="install-banner">${icon('bell')}<p><b>Aktifkan notifikasi</b>Dapatkan kabar saat ada pesan baru.</p><button class="btn" data-action="enable-notif" style="padding:8px 14px">Aktifkan</button><button class="icon-btn" data-action="dismiss-notif" aria-label="Tutup">${icon('x', 'i-sm')}</button></div>`);
  }
  el.innerHTML = val(parts);
}

/* ---------- Daftar percakapan ---------- */
async function loadConversations() {
  try {
    const r = await api('GET', '/conversations');
    S.convs.clear();
    r.data.forEach((c) => S.convs.set(c.id, c));
    S.cursor = Math.max(S.cursor, ...r.data.map((c) => c.last_message?.id || 0), store.get('cursor-' + myId(), 0));
    persistConvs();
    renderList();
    if (S.activeId && S.convs.has(S.activeId)) renderHead();
    renderBanners();
  } catch (e) {
    if (!e.status) toast(e.message, { error: true });
  }
}
const persistConvs = debounce(() => store.set('convs', [...S.convs.values()].slice(0, 100)), 800);

function sortedConvs() {
  return [...S.convs.values()].sort((a, b) => (b.pinned - a.pinned) || String(b.last_message_at).localeCompare(String(a.last_message_at)) || b.id - a.id);
}

function renderList() {
  const el = $('#conv-list'); if (!el) return;
  if (S.view === 'status') { updateAppBadge(); return renderStatusList(); }
  let list = sortedConvs();
  if (S.filter === 'archived') list = list.filter((c) => c.archived);
  else {
    list = list.filter((c) => !c.archived);
    if (S.filter === 'unread') list = list.filter((c) => c.unread_count > 0);
    if (S.filter === 'groups') list = list.filter((c) => c.type === 'group');
  }
  if (S.query) list = list.filter((c) => c.title.toLowerCase().includes(S.query) || (c.peer?.phone || '').includes(S.query.replace(/\D/g, '') || '§'));

  $$('[data-action="filter"]').forEach((b) => b.classList.toggle(b.classList.contains('chip') ? 'on' : 'active', b.dataset.filter === S.filter));

  if (!list.length) {
    el.innerHTML = val(S.convs.size
      ? html`<div class="empty">${icon('search')}<b>Tidak ada yang cocok</b>Coba kata kunci atau filter lain.</div>`
      : html`<div class="empty">${icon('chat')}<b>Belum ada percakapan</b>Mulai chat dengan mencari nomor HP atau nama kontak.<br><br><button class="btn" data-action="new-chat">${icon('edit', 'i-sm')} Chat baru</button></div>`);
    updateAppBadge();
    return;
  }

  el.innerHTML = val(list.map((c) => {
    const typing = typingText(c.id);
    const lm = c.last_message;
    let preview = lm ? lm.preview : (c.type === 'group' ? 'Grup dibuat' : 'Mulai percakapan');
    let tick = '';
    if (lm && lm.is_mine && !lm.deleted && lm.type !== 'system') tick = statusIcon(c, lm.id);
    if (lm && c.type === 'group' && lm.sender && lm.type !== 'system') preview = (lm.is_mine ? 'Anda' : lm.sender.name.split(' ')[0]) + ': ' + preview;
    const online = c.type === 'direct' && c.peer && S.online.has(c.peer.id);
    return html`
      <button class="conv ${c.id === S.activeId ? 'active' : ''} ${c.unread_count ? 'unread' : ''}" data-action="open" data-id="${c.id}">
        <span class="avatar-wrap">${avatar(c.title, c.avatar_url, c.type === 'group' ? 'g' + c.id : c.peer?.id)}${online ? html`<span class="presence-dot"></span>` : ''}</span>
        <span class="conv-body">
          <span class="conv-top"><span class="conv-title">${c.title}</span><span class="conv-time">${fmtListTime(c.last_message_at)}</span></span>
          <span class="conv-bottom">
            <span class="conv-preview">${typing ? html`<span class="typing">${typing}</span>` : html`${tick}<span style="overflow:hidden;text-overflow:ellipsis">${preview}</span>`}</span>
            <span class="conv-flags">${c.muted ? icon('bellOff', 'i-xs') : ''}${c.pinned ? icon('pin', 'i-xs') : ''}${c.unread_count ? html`<span class="badge ${c.muted ? 'muted' : ''}">${c.unread_count > 99 ? '99+' : c.unread_count}</span>` : ''}</span>
          </span>
        </span>
      </button>`;
  }));
  updateAppBadge();
}

/* ---------- Status centang ---------- */
function msgStatus(conv, id) {
  if (!id) return 'pending';
  const others = (conv.members || []).filter((m) => m.user && m.user.id !== myId());
  if (!others.length) return 'sent';
  if (others.every((m) => m.last_read_message_id !== null && m.last_read_message_id >= id)) return 'read';
  if (others.every((m) => (m.last_delivered_message_id || 0) >= id || (m.last_read_message_id || 0) >= id)) return 'delivered';
  return 'sent';
}
function statusIcon(conv, id, failed = false) {
  if (failed) return html`<span class="fail" title="Gagal terkirim">${icon('alert', 'i-xs')}</span>`;
  const s = msgStatus(conv, id);
  if (s === 'pending') return html`<span title="Menunggu">${icon('clock', 'i-xs')}</span>`;
  if (s === 'read') return html`<span class="read" title="Dibaca">${icon('checks', 'i-sm')}</span>`;
  if (s === 'delivered') return html`<span title="Diterima">${icon('checks', 'i-sm')}</span>`;
  return html`<span title="Terkirim">${icon('check', 'i-sm')}</span>`;
}

/* ---------- Mengetik ---------- */
function typingText(convId) {
  const map = S.typing.get(convId); if (!map) return '';
  const now = Date.now();
  const names = [...map.values()].filter((t) => t.until > now).map((t) => t.name.split(' ')[0]);
  if (!names.length) return '';
  const conv = S.convs.get(convId);
  if (conv?.type === 'direct') return 'sedang mengetik…';
  return names.length === 1 ? `${names[0]} mengetik…` : `${names.length} orang mengetik…`;
}

/* =========================================================
   CHAT PANE
   ========================================================= */
function renderPane() {
  const pane = $('#pane'); if (!pane) return;
  const conv = activeConv();
  $('#shell')?.classList.toggle('in-chat', !!conv);
  if (!conv) {
    pane.innerHTML = val(html`
      <div class="welcome">
        <svg class="motif" viewBox="0 0 120 120" aria-hidden="true">
          <g fill="none" stroke="var(--gold-bright)" stroke-width="2.5"><path d="M60 6 114 60 60 114 6 60Z"/><path d="M60 24 96 60 60 96 24 60Z" stroke="var(--brand)" stroke-width="2"/></g>
          <rect x="38" y="44" width="44" height="30" rx="12" fill="var(--brand)"/><path d="M48 72 44 84 58 74Z" fill="var(--brand)"/>
          <g fill="#fff"><circle cx="50" cy="59" r="3.4"/><circle cx="60" cy="59" r="3.4"/><circle cx="70" cy="59" r="3.4"/></g>
        </svg>
        <h2>${CFG.name || 'Almara Chat'}</h2>
        <p>Pilih percakapan di sebelah kiri, atau mulai yang baru. Akun Anda tetap tersinkron di semua perangkat yang tertaut.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
          <button class="btn" data-action="new-chat">${icon('edit', 'i-sm')} Chat baru</button>
          <button class="btn btn-ghost" data-action="settings-devices">${icon('devices', 'i-sm')} Perangkat tertaut</button>
        </div>
        <p class="sig">${SIGNATURE}</p>
      </div>`);
    return;
  }
  const canSend = !(conv.type === 'group' && conv.send_policy === 'admins' && !['owner', 'admin'].includes(conv.role));
  pane.innerHTML = val(html`
    <header class="chat-head" id="chat-head"></header>
    <div id="chat-search-bar"></div>
    <div class="messages" id="messages" tabindex="-1"></div>
    <button class="scroll-down" id="scroll-down" hidden data-action="scroll-bottom" aria-label="Ke pesan terbaru">${icon('down')}<span class="badge" id="new-count" hidden></span></button>
    <footer class="composer-wrap" id="composer-wrap">
      ${canSend ? html`
      <div id="composer-extra"></div>
      <div class="composer" id="composer">
        <button class="icon-btn" data-action="emoji" title="Emoji">${icon('smile')}</button>
        <button class="icon-btn" data-action="attach" title="Lampirkan file">${icon('clip')}</button>
        <input type="file" id="file-input" multiple hidden>
        <textarea id="composer-input" rows="1" placeholder="Tulis pesan" aria-label="Tulis pesan"></textarea>
        <button class="send-btn" id="send-btn" data-action="send" title="Kirim">${icon('mic')}</button>
      </div>` : html`<p class="readonly-note">${icon('lock', 'i-sm')} Hanya admin yang dapat mengirim pesan di grup ini.</p>`}
    </footer>`);
  renderHead();
  renderMessages({ toBottom: true });
  if (canSend) bindComposer();
  bindMessagesScroll();
}

function renderHead() {
  const el = $('#chat-head'); const conv = activeConv(); if (!el || !conv) return;
  const typing = typingText(conv.id);
  let status = '';
  if (typing) status = typing;
  else if (conv.type === 'group') status = conv.members.map((m) => m.user?.id === myId() ? 'Anda' : m.user?.name).filter(Boolean).join(', ');
  else if (conv.peer) status = S.online.has(conv.peer.id) ? 'online' : (fmtLastSeen(conv.peer.last_seen_at) || fmtPhone(conv.peer.phone));
  el.innerHTML = val(html`
    <button class="icon-btn back" data-action="close-chat" aria-label="Kembali">${icon('back')}</button>
    <button class="who" data-action="info">
      ${avatar(conv.title, conv.avatar_url, conv.type === 'group' ? 'g' + conv.id : conv.peer?.id)}
      <span class="who-text"><div class="who-name">${conv.title}</div><div class="who-status ${typing ? 'typing' : ''}">${status}</div></span>
    </button>
    <button class="icon-btn" data-action="chat-search" title="Cari pesan">${icon('search')}</button>
    <button class="icon-btn" data-action="conv-menu" title="Menu">${icon('more')}</button>`);
}

/* ---------- Pesan ---------- */
function msgState(convId) {
  if (!S.msgs.has(convId)) S.msgs.set(convId, { items: [], hasMore: true, loaded: false, loading: false });
  return S.msgs.get(convId);
}

async function openConversation(id, opts = {}) {
  if (!id) return;
  if (!S.convs.has(id)) {
    try { const r = await api('GET', `/conversations/${id}`); S.convs.set(id, r.conversation); }
    catch { return toast('Percakapan tidak ditemukan.', { error: true }); }
  }
  const switching = S.activeId !== id;
  S.activeId = id; S.reply = null; S.editing = null; S.files = []; S.search = null;
  if (switching && isMobile() && !opts.fromHistory) history.pushState({ chat: id }, '', '#chat');
  renderList();
  renderPane();
  subscribeConversation(id);
  const st = msgState(id);
  if (!st.loaded) await loadMessages(id);
  else if (switching) fetchNewer(id);
  markRead();
  if (!isMobile()) $('#composer-input')?.focus();
}

function closeChat() {
  S.activeId = null;
  renderList(); renderPane();
}

async function loadMessages(convId, before = null) {
  const st = msgState(convId);
  if (st.loading) return; st.loading = true;
  try {
    const r = await api('GET', `/conversations/${convId}/messages?limit=50${before ? '&before=' + before : ''}`);
    const pending = st.items.filter((m) => !m.id);
    const known = new Map(st.items.filter((m) => m.id).map((m) => [m.id, m]));
    r.data.forEach((m) => known.set(m.id, m));
    st.items = [...known.values()].sort((a, b) => a.id - b.id).concat(pending);
    st.hasMore = r.has_more; st.loaded = true;
    if (S.activeId === convId) renderMessages(before ? { keepTopOffset: true } : { toBottom: true });
  } catch (e) {
    if (S.activeId === convId && !st.loaded) $('#messages').innerHTML = val(html`<div class="empty">${icon('alert')}<b>Pesan tidak dapat dimuat</b>${e.message}</div>`);
  } finally { st.loading = false; }
}
async function fetchNewer(convId) {
  const st = msgState(convId);
  const last = [...st.items].reverse().find((m) => m.id)?.id;
  if (!last) return loadMessages(convId);
  try {
    const r = await api('GET', `/conversations/${convId}/messages?after=${last}&limit=100`);
    r.data.forEach((m) => upsertMessage(m, { silent: true }));
  } catch {}
}

function groupMessages(items, conv) {
  const out = [];
  let lastDay = null;
  const unreadFrom = conv._unreadMarker;
  items.forEach((m, i) => {
    const day = new Date(m.created_at).toDateString();
    if (day !== lastDay) { out.push({ kind: 'day', label: fmtDay(m.created_at) }); lastDay = day; }
    if (unreadFrom && m.id === unreadFrom) out.push({ kind: 'unread' });
    if (m.type === 'system') { out.push({ kind: 'sys', m }); return; }
    const prev = items[i - 1], next = items[i + 1];
    const sameAsPrev = prev && prev.type !== 'system' && prev.sender?.id === m.sender?.id && new Date(prev.created_at).toDateString() === day && (new Date(m.created_at) - new Date(prev.created_at)) < 5 * 60e3 && !(unreadFrom && m.id === unreadFrom);
    const sameAsNext = next && next.type !== 'system' && next.sender?.id === m.sender?.id && new Date(next.created_at).toDateString() === day && (new Date(next.created_at) - new Date(m.created_at)) < 5 * 60e3;
    out.push({ kind: 'msg', m, first: !sameAsPrev, last: !sameAsNext });
  });
  return out;
}

function renderMessages(opts = {}) {
  const el = $('#messages'); const conv = activeConv(); if (!el || !conv) return;
  const st = msgState(conv.id);
  if (!st.loaded) { el.innerHTML = val(html`<div class="spinner"></div>`); return; }
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  const prevHeight = el.scrollHeight, prevTop = el.scrollTop;

  const rows = groupMessages(st.items, conv).map((r) => {
    if (r.kind === 'day') return html`<div class="day-sep">${r.label}</div>`;
    if (r.kind === 'unread') return html`<div class="unread-sep">Pesan belum dibaca</div>`;
    if (r.kind === 'sys') return html`<div class="sys-msg">${r.m.body}</div>`;
    return renderBubble(r.m, conv, r.first, r.last);
  });
  if (!st.items.length) rows.push(html`<div class="sys-msg">${conv.type === 'group' ? 'Grup ini belum memiliki pesan.' : 'Kirim pesan pertama untuk memulai percakapan.'}</div>`);
  el.innerHTML = val(html`${st.hasMore && st.items.length >= 50 ? html`<button class="btn btn-ghost load-more" data-action="load-older">Muat pesan sebelumnya</button>` : ''}${rows}`);

  if (opts.keepTopOffset) el.scrollTop = el.scrollHeight - prevHeight + prevTop;
  else if (opts.toBottom || atBottom || opts.forceBottom) el.scrollTop = el.scrollHeight;
  else el.scrollTop = prevTop;
  updateScrollButton();
}

function renderBubble(m, conv, first, last) {
  const mine = m.is_mine;
  const deleted = m.deleted;
  const atts = m.attachments || [];
  const visual = atts.filter((a) => /^(image|video)\//.test(a.mime));
  const audio = m.type === 'audio' ? atts[0] : null;
  const files = atts.filter((a) => !/^(image|video)\//.test(a.mime) && m.type !== 'audio');
  const senderColor = hashColor(m.sender?.id, SENDER_COLORS);
  const hasReactions = !deleted && m.reactions?.length;
  const media = !deleted && visual.length ? html`
    <div class="media ${visual.length === 1 ? 'single' : 'grid-2'}" data-action="lightbox" data-mid="${m.id || m.client_uuid}">
      ${visual.slice(0, 4).map((a, i) => a.mime.startsWith('video/') ? html`<video src="${a.url}" preload="metadata" muted playsinline data-idx="${i}"></video>` : html`<img src="${a.url}" alt="${a.name}" loading="lazy" data-idx="${i}">`)}
    </div>` : '';
  const meta = html`<span class="meta ${!m.body && visual.length && !deleted ? 'overlay' : ''}">${m.edited && !deleted ? 'diedit · ' : ''}${fmtTime(m.created_at)}${mine && !deleted ? statusIcon(conv, m.id, m._failed) : ''}</span>`;
  const body = deleted
    ? html`<div class="text">${icon('trash', 'i-xs')} ${mine ? 'Anda menghapus pesan ini' : 'Pesan ini telah dihapus'}</div>`
    : m.body ? html`<div class="text ${isEmojiOnly(m.body) && !atts.length ? 'big-emoji' : ''}">${richText(m.body)}</div>` : '';

  return html`
  <div class="msg ${mine ? 'mine' : ''} ${conv.type === 'direct' ? 'direct' : ''} ${first ? 'first' : ''} ${last ? 'last' : ''} ${hasReactions ? 'has-reactions' : ''}" data-mid="${m.id || ''}" data-cuid="${m.client_uuid || ''}">
    ${!mine ? avatar(m.sender?.name, m.sender?.avatar_url, m.sender?.id) : ''}
    <div class="bubble ${deleted ? 'deleted' : ''}" data-action="msg-menu" data-ctx="1">
      ${!mine && conv.type === 'group' && first ? html`<div class="sender" style="--sc:${senderColor}">${m.sender?.name}</div>` : ''}
      ${m.reply_to && !deleted ? html`<div class="quote" data-action="jump" data-target="${m.reply_to.id}"><b>${m.reply_to.sender_name || ''}</b><span>${m.reply_to.preview}</span></div>` : ''}
      ${m.meta?.status_reply && !deleted ? statusQuote(m.meta.status_reply) : ''}
      ${media}
      ${audio && !deleted ? voicePlayer(m, audio) : ''}
      ${!deleted ? files.map((a) => html`<a class="file-card" href="${a.url}?download=1" target="_blank" rel="noopener" download="${a.name}"><span class="ext">${(a.name.split('.').pop() || 'file').slice(0, 4)}</span><span><div class="fname">${a.name}</div><div class="fsize">${fmtSize(a.size)}</div></span>${icon('download', 'i-sm')}</a>`) : ''}
      ${body}
      ${meta}
      ${m._failed ? html`<div style="clear:both;padding-top:4px"><button class="btn-link" style="color:inherit;font-size:13px" data-action="retry" data-cuid="${m.client_uuid}">Gagal terkirim · Coba lagi</button></div>` : ''}
      ${hasReactions ? html`<div class="reactions">${m.reactions.map((r) => html`<button class="reaction ${r.mine ? 'mine' : ''}" data-action="react" data-emoji="${r.emoji}" title="${r.users.join(', ')}">${r.emoji}${r.count > 1 ? html` <span>${r.count}</span>` : ''}</button>`)}</div>` : ''}
    </div>
    ${m.id && !deleted ? html`<div class="msg-tools"><button class="icon-btn" data-action="quick-reply" title="Balas">${icon('reply', 'i-sm')}</button><button class="icon-btn" data-action="msg-menu" title="Lainnya">${icon('more', 'i-sm')}</button></div>` : ''}
  </div>`;
}

function voicePlayer(m, a) {
  let seed = (m.id || 7) * 9301;
  const bars = Array.from({ length: 28 }, () => { seed = (seed * 9301 + 49297) % 233280; return 25 + Math.round((seed / 233280) * 75); });
  return html`<div class="voice" data-src="${a.url}" data-duration="${a.duration || 0}">
    <button class="play" data-action="voice-play" aria-label="Putar">${icon('play', 'i-sm')}</button>
    <div class="track" data-action="voice-seek">${bars.map((h) => html`<i style="height:${h}%"></i>`)}</div>
    <span class="dur">${fmtDur(a.duration)}</span></div>`;
}

function bindMessagesScroll() {
  const el = $('#messages'); if (!el) return;
  el.addEventListener('scroll', () => {
    updateScrollButton();
    if (el.scrollTop < 60) {
      const st = msgState(S.activeId);
      const first = st.items.find((m) => m.id);
      if (st.hasMore && st.loaded && !st.loading && first && st.items.length >= 50) loadMessages(S.activeId, first.id);
    }
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) markRead();
  }, { passive: true });
}
function updateScrollButton() {
  const el = $('#messages'), btn = $('#scroll-down'); if (!el || !btn) return;
  const far = el.scrollHeight - el.scrollTop - el.clientHeight > 300;
  btn.hidden = !far;
  if (!far) { const n = $('#new-count'); if (n) n.hidden = true; }
}
function scrollToBottom(smooth = true) { const el = $('#messages'); if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); }

/* ---------- Upsert ---------- */
function findMsg(convId, idOrCuid) {
  const st = msgState(convId);
  return st.items.find((m) => (m.id && m.id === idOrCuid) || (m.client_uuid && m.client_uuid === idOrCuid));
}
function upsertMessage(m, opts = {}) {
  const conv = S.convs.get(m.conversation_id);
  if (!conv) { loadConversations(); return; }
  const st = msgState(m.conversation_id);
  const i = st.items.findIndex((x) => (m.id && x.id === m.id) || (m.client_uuid && x.client_uuid === m.client_uuid));
  const isNew = i === -1;
  if (isNew) {
    if (!st.loaded) { /* akan dimuat saat percakapan dibuka */ }
    else {
      st.items.push(m);
      st.items.sort((a, b) => (a.id || Infinity) - (b.id || Infinity));
    }
  } else {
    st.items[i] = { ...m, _localUrls: st.items[i]._localUrls };
  }
  if (m.id) S.cursor = Math.max(S.cursor, m.id);
  store.set('cursor-' + myId(), S.cursor);

  // Ringkasan daftar
  if (!conv.last_message || (m.id && m.id >= (conv.last_message.id || 0))) {
    conv.last_message = m; conv.last_message_at = m.created_at;
  }
  // Pengirim pesan baru otomatis sudah membaca percakapan hingga pesan ini.
  if (isNew && m.id && m.sender && m.sender.id !== myId()) {
    const mem = (conv.members || []).find((x) => x.user?.id === m.sender.id);
    if (mem) {
      mem.last_delivered_message_id = Math.max(mem.last_delivered_message_id || 0, m.id);
      if (mem.last_read_message_id !== null) mem.last_read_message_id = Math.max(mem.last_read_message_id || 0, m.id);
    }
  }
  if (isNew && m.id && !m.is_mine && m.type !== 'system') {
    const viewing = S.activeId === conv.id && document.visibilityState === 'visible' && isNearBottom();
    if (!viewing) conv.unread_count = (conv.unread_count || 0) + 1;
    if (!opts.silent) notifyIncoming(conv, m);
    sendDelivered(conv.id, m.id);
    // Hapus indikator mengetik pengirim
    S.typing.get(conv.id)?.delete(m.sender?.id);
  }
  if (isNew && conv.archived && m.type !== 'system') conv.archived = false;
  persistConvs();
  renderList();
  if (S.activeId === conv.id) {
    renderMessages(m.is_mine && isNew ? { forceBottom: true } : {});
    if (isNew && !m.is_mine) {
      if (isNearBottom()) markRead();
      else { const n = $('#new-count'); if (n) { n.hidden = false; n.textContent = Number(n.textContent || 0) + 1; } }
    }
    renderHead();
  }
}
function isNearBottom() { const el = $('#messages'); return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120; }

/* ---------- Receipt ---------- */
const deliveredQueue = new Map();
const flushDelivered = debounce(() => {
  deliveredQueue.forEach((id, convId) => api('POST', `/conversations/${convId}/receipt`, { delivered_up_to: id }).catch(() => {}));
  deliveredQueue.clear();
}, 700);
function sendDelivered(convId, id) { deliveredQueue.set(convId, Math.max(deliveredQueue.get(convId) || 0, id)); flushDelivered(); }

const markRead = debounce(async () => {
  const conv = activeConv(); if (!conv || document.visibilityState !== 'visible') return;
  const st = msgState(conv.id);
  const lastId = [...st.items].reverse().find((m) => m.id)?.id || 0;
  if (!lastId || (conv.last_read_message_id >= lastId && !conv.unread_count)) return;
  conv.unread_count = 0; conv.last_read_message_id = lastId;
  renderList();
  try { await api('POST', `/conversations/${conv.id}/receipt`, { read_up_to: lastId }); } catch {}
}, 400);

/* =========================================================
   Composer
   ========================================================= */
function bindComposer() {
  const ta = $('#composer-input'); if (!ta) return;
  const draftKey = 'draft-' + S.activeId;
  ta.value = store.get(draftKey, '');
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; updateSendBtn(); };
  grow();
  ta.addEventListener('input', () => { grow(); store.set(draftKey, ta.value); sendTyping(); });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && setting('enter_to_send') !== false && !isMobile()) { e.preventDefault(); submitComposer(); }
    if (e.key === 'Escape') { if (S.editing || S.reply) { S.editing = null; S.reply = null; renderComposerExtra(); ta.value = ''; grow(); } }
    if (e.key === 'ArrowUp' && !ta.value) {
      const st = msgState(S.activeId);
      const mine = [...st.items].reverse().find((m) => m.is_mine && m.id && !m.deleted && m.body);
      if (mine && canEdit(mine)) { e.preventDefault(); startEdit(mine); }
    }
  });
  ta.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addFiles(files); }
  });
  $('#file-input').onchange = (e) => { addFiles([...e.target.files]); e.target.value = ''; };
  const pane = $('#pane');
  pane.ondragover = (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); };
  pane.ondrop = (e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); addFiles([...e.dataTransfer.files]); } };
  renderComposerExtra();
}
function updateSendBtn() {
  const btn = $('#send-btn'), ta = $('#composer-input'); if (!btn || !ta) return;
  const ready = ta.value.trim() || S.files.length || S.editing;
  btn.classList.toggle('ready', !!ready);
  btn.innerHTML = val(icon(ready ? (S.editing ? 'check' : 'send') : 'mic'));
  btn.title = ready ? (S.editing ? 'Simpan' : 'Kirim') : 'Rekam pesan suara';
}
function renderComposerExtra() {
  const el = $('#composer-extra'); if (!el) return;
  const parts = [];
  if (S.files.length) {
    parts.push(html`<div class="pending-files">${S.files.map((f, i) => html`<div class="pf">${f.preview ? html`<img src="${f.preview}" alt="">` : html`${icon('file')}<span>${f.file.name.slice(0, 18)}</span>`}<button data-action="remove-file" data-i="${i}" aria-label="Hapus">${icon('x', 'i-xs')}</button></div>`)}</div>`);
  } else if (S.editing) {
    parts.push(html`<div class="edit-bar">${icon('edit', 'i-sm')}<div class="quote" style="flex:1;margin:0;cursor:default"><b>Edit pesan</b><span>${S.editing.body}</span></div><button class="icon-btn" data-action="cancel-extra">${icon('x')}</button></div>`);
  } else if (S.reply) {
    parts.push(html`<div class="reply-bar"><div class="quote"><b>${S.reply.is_mine ? 'Anda' : S.reply.sender?.name}</b><span>${S.reply.preview}</span></div><button class="icon-btn" data-action="cancel-extra">${icon('x')}</button></div>`);
  }
  el.innerHTML = val(parts);
  updateSendBtn();
}
function addFiles(list) {
  const max = (CFG.maxUploadMb || 20) * 1048576;
  for (const f of list) {
    if (f.size > max) { toast(`${f.name} melebihi ${CFG.maxUploadMb} MB.`, { error: true }); continue; }
    if (S.files.length >= 10) break;
    S.files.push({ file: f, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null });
  }
  S.editing = null;
  renderComposerExtra();
  $('#composer-input')?.focus();
}

async function submitComposer() {
  const ta = $('#composer-input'); if (!ta) return;
  const text = ta.value.trim();
  if (S.editing) {
    const m = S.editing; S.editing = null;
    ta.value = ''; store.del('draft-' + S.activeId); renderComposerExtra(); ta.style.height = 'auto';
    if (text && text !== m.body) {
      try { upsertMessage((await api('PATCH', `/messages/${m.id}`, { body: text })).message, { silent: true }); }
      catch (e) { toast(e.message, { error: true }); }
    }
    return;
  }
  if (!text && !S.files.length) return startRecording();
  const files = S.files.map((f) => f.file);
  const locals = S.files.map((f) => f.preview);
  S.files = [];
  ta.value = ''; ta.style.height = 'auto'; store.del('draft-' + S.activeId);
  const reply = S.reply; S.reply = null;
  renderComposerExtra();
  await sendMessage(S.activeId, { body: text, files, reply, locals });
}

async function sendMessage(convId, { body = '', files = [], reply = null, kind = null, duration = null, locals = [] }) {
  const conv = S.convs.get(convId);
  const cuid = uuid();
  const type = kind === 'voice' ? 'audio' : files.length ? (files[0].type.startsWith('image/') ? 'image' : files[0].type.startsWith('video/') ? 'video' : 'file') : 'text';
  const temp = {
    id: null, client_uuid: cuid, conversation_id: convId, type, body: body || null,
    preview: body || (type === 'audio' ? '🎤 Pesan suara' : type === 'image' ? '📷 Foto' : '📎 ' + (files[0]?.name || 'File')),
    sender: { id: S.me.id, name: S.me.name, avatar_url: S.me.avatar_url }, is_mine: true,
    created_at: new Date().toISOString(), attachments: files.map((f, i) => ({ id: 'l' + i, url: locals[i] || URL.createObjectURL(f), name: f.name, mime: f.type || 'application/octet-stream', size: f.size, duration })),
    reactions: [], reply_to: reply ? { id: reply.id, sender_name: reply.is_mine ? 'Anda' : reply.sender?.name, preview: reply.preview } : null,
    _send: { body, files, reply_to_id: reply?.id || null, kind, duration },
  };
  const st = msgState(convId);
  st.items.push(temp);
  conv.last_message = temp; conv.last_message_at = temp.created_at;
  renderList();
  if (S.activeId === convId) renderMessages({ forceBottom: true });
  await deliver(convId, temp);
}

async function deliver(convId, temp) {
  const p = temp._send;
  const fd = new FormData();
  fd.append('client_uuid', temp.client_uuid);
  if (p.body) fd.append('body', p.body);
  if (p.reply_to_id) fd.append('reply_to_id', p.reply_to_id);
  if (p.kind) fd.append('kind', p.kind);
  if (p.duration) fd.append('duration', Math.round(p.duration));
  p.files.forEach((f) => fd.append('files[]', f, f.name || 'file'));
  try {
    const r = await api('POST', `/conversations/${convId}/messages`, fd);
    temp._failed = false;
    upsertMessage(r.message);
    S.outbox = S.outbox.filter((o) => o.client_uuid !== temp.client_uuid);
  } catch (e) {
    temp._failed = true;
    if (e.network) { if (!S.outbox.includes(temp)) S.outbox.push(temp); }
    else toast(e.message, { error: true });
    if (S.activeId === convId) renderMessages();
  }
}
async function flushOutbox() {
  const items = [...S.outbox]; S.outbox = [];
  for (const t of items) await deliver(t.conversation_id, t);
}
window.addEventListener('online', () => { S.rt === 'offline' && (S.rt = 'polling'); flushOutbox(); syncNow(); renderBanners(); });
window.addEventListener('offline', () => { S.rt = 'offline'; renderBanners(); });

const canEdit = (m) => m.is_mine && m.id && !m.deleted && ['text', 'image', 'video', 'file'].includes(m.type) && (Date.now() - new Date(m.created_at)) < (CFG.editWindowMinutes || 15) * 60e3;
function startEdit(m) {
  S.editing = m; S.reply = null; S.files = [];
  renderComposerExtra();
  const ta = $('#composer-input'); ta.value = m.body || ''; ta.focus(); ta.dispatchEvent(new Event('input'));
}

/* ---------- Rekam suara ---------- */
let rec = null;
async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) return toast(window.isSecureContext ? 'Perangkat ini tidak mendukung rekam suara.' : 'Rekam suara memerlukan HTTPS (aktifkan SSL di Laragon).', { error: true });
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { return toast('Izin mikrofon ditolak.', { error: true }); }
  const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || '';
  const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec = { mr, stream, chunks, start: Date.now(), cancel: false, convId: S.activeId };
  mr.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    clearInterval(rec.timer);
    const r = rec; rec = null; renderPaneComposerOnly();
    if (r.cancel || !chunks.length) return;
    const duration = (Date.now() - r.start) / 1000;
    if (duration < 0.8) return toast('Pesan suara terlalu singkat.');
    const type = (mr.mimeType || 'audio/webm').split(';')[0];
    const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm';
    const file = new File([new Blob(chunks, { type })], `pesan-suara.${ext}`, { type });
    await sendMessage(r.convId, { files: [file], kind: 'voice', duration });
  };
  mr.start();
  const composer = $('#composer');
  composer.innerHTML = val(html`
    <button class="icon-btn" data-action="rec-cancel" title="Batal">${icon('trash')}</button>
    <div class="recording"><span class="rec-dot"></span><span class="rec-time" id="rec-time">0:00</span><span class="hint" style="margin:0">Merekam…</span></div>
    <button class="send-btn ready" data-action="rec-send" title="Kirim">${icon('send')}</button>`);
  rec.timer = setInterval(() => { const t = $('#rec-time'); if (t) t.textContent = fmtDur((Date.now() - rec.start) / 1000); if (Date.now() - rec.start > 300e3) rec.mr.stop(); }, 250);
}
function renderPaneComposerOnly() {
  const conv = activeConv(); if (!conv) return;
  const composer = $('#composer'); if (!composer) return;
  composer.innerHTML = val(html`
    <button class="icon-btn" data-action="emoji" title="Emoji">${icon('smile')}</button>
    <button class="icon-btn" data-action="attach" title="Lampirkan file">${icon('clip')}</button>
    <input type="file" id="file-input" multiple hidden>
    <textarea id="composer-input" rows="1" placeholder="Tulis pesan" aria-label="Tulis pesan"></textarea>
    <button class="send-btn" id="send-btn" data-action="send" title="Kirim">${icon('mic')}</button>`);
  bindComposer();
}

/* ---------- Pemutar suara ---------- */
let currentAudio = null;
function playVoice(box) {
  if (currentAudio && currentAudio.box !== box) { currentAudio.pause(); }
  if (currentAudio?.box === box) { currentAudio.paused ? currentAudio.play() : currentAudio.pause(); return; }
  const a = new Audio(box.dataset.src); a.box = box; currentAudio = a;
  const btn = box.querySelector('.play'), bars = [...box.querySelectorAll('.track i')], dur = box.querySelector('.dur');
  a.onplay = () => { btn.innerHTML = val(icon('pause', 'i-sm')); };
  a.onpause = () => { btn.innerHTML = val(icon('play', 'i-sm')); };
  a.ontimeupdate = () => {
    const total = isFinite(a.duration) ? a.duration : Number(box.dataset.duration) || 1;
    const p = a.currentTime / total; bars.forEach((b, i) => b.classList.toggle('on', i / bars.length < p)); dur.textContent = fmtDur(a.currentTime);
  };
  a.onended = () => { bars.forEach((b) => b.classList.remove('on')); dur.textContent = fmtDur(box.dataset.duration); currentAudio = null; btn.innerHTML = val(icon('play', 'i-sm')); };
  a.play().catch(() => toast('Audio tidak dapat diputar.', { error: true }));
}

/* ---------- Emoji ---------- */
const EMOJI = '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😜 🤪 🤗 🤭 🤔 🤐 😐 😏 😒 🙄 😬 😌 😔 😴 😷 🤒 🥳 😎 🤓 😕 😟 😮 😲 😳 🥺 😢 😭 😱 😤 😡 🤬 👍 👎 👌 ✌️ 🤞 🤝 🙏 👏 🙌 💪 👋 ✋ 👀 🎉 🎊 🔥 ✨ 💯 ✅ ❌ ⚠️ ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 💕 💬 📌 📎 📷 📄 📊 💰 🕌 🌙 ☀️ ⭐ 🌹 🍚 ☕ 🍰 🚗 ✈️ 🏠 ⏰ 📅 🇮🇩'.split(' ');
const QUICK = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/* =========================================================
   Lapisan: menu, drawer, modal, lightbox
   ========================================================= */
function closeMenu() { $$('.menu, .emoji-pop').forEach((m) => m.remove()); }
function closeAllLayers() { closeMenu(); $$('.overlay, .lightbox').forEach((o) => o.remove()); stopScanner(); }

function showMenu(x, y, content, onClick) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu'; m.setAttribute('role', 'menu');
  m.innerHTML = val(content);
  document.body.append(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
  m.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { e.stopPropagation(); closeMenu(); onClick(b.dataset.cmd, b); } });
  m.querySelector('button')?.focus({ preventScroll: true });
  return m;
}

function layer(kind, title, body, foot = '', opts = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay' + (kind === 'modal' ? ' center' : '');
  ov.innerHTML = val(html`
    <div class="${kind}" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="d-head">${opts.back ? html`<button class="icon-btn" data-close="1" aria-label="Kembali">${icon('back')}</button>` : ''}<h3>${title}</h3>${!opts.back ? html`<button class="icon-btn" data-close="1" aria-label="Tutup">${icon('x')}</button>` : ''}</div>
      <div class="d-body">${body}</div>
      ${foot ? html`<div class="d-foot">${foot}</div>` : ''}
    </div>`);
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
  ov.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => close()));
  function close() { ov.remove(); stopScanner(); opts.onClose?.(); }
  ov.close = close;
  document.body.append(ov);
  setTimeout(() => ov.querySelector('input:not([type=file]):not([type=checkbox]):not([type=radio]), textarea')?.focus(), 40);
  return ov;
}
const drawer = (t, b, f, o) => layer('drawer', t, b, f, o);
const modal = (t, b, f, o) => layer('modal', t, b, f || html`<button class="btn" data-close="1">Mengerti</button>`, o);
function confirmDialog(title, text, okLabel = 'Ya', danger = false) {
  return new Promise((resolve) => {
    const ov = layer('modal', title, html`<p style="margin:0">${text}</p>`, html`<button class="btn btn-ghost" data-close="1">Batal</button><button class="btn ${danger ? 'btn-danger' : ''}" id="dlg-ok">${okLabel}</button>`, { onClose: () => resolve(false) });
    ov.querySelector('#dlg-ok').onclick = () => { resolve(true); ov.remove(); };
  });
}

function openLightbox(items, idx) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  const draw = () => {
    const a = items[idx];
    lb.innerHTML = val(html`
      <div class="lb-head">
        ${items.length > 1 ? html`<button class="icon-btn" data-lb="prev" aria-label="Sebelumnya">${icon('back')}</button><button class="icon-btn" data-lb="next" aria-label="Berikutnya" style="transform:scaleX(-1)">${icon('back')}</button>` : ''}
        <a class="icon-btn" href="${a.url}?download=1" download="${a.name}" aria-label="Unduh">${icon('download')}</a>
        <button class="icon-btn" data-lb="close" aria-label="Tutup">${icon('x')}</button>
      </div>
      <div class="lb-body">${a.mime.startsWith('video/') ? html`<video src="${a.url}" controls autoplay playsinline></video>` : html`<img src="${a.url}" alt="${a.name}">`}</div>`);
  };
  lb.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lb]');
    if (b?.dataset.lb === 'close' || e.target.classList.contains('lb-body')) lb.remove();
    if (b?.dataset.lb === 'prev') { idx = (idx - 1 + items.length) % items.length; draw(); }
    if (b?.dataset.lb === 'next') { idx = (idx + 1) % items.length; draw(); }
  });
  draw(); document.body.append(lb);
}

/* ---------- Menu pesan ---------- */
function messageFromEl(el) {
  const row = el.closest('.msg'); if (!row) return null;
  const id = Number(row.dataset.mid) || row.dataset.cuid;
  return findMsg(S.activeId, id);
}
function openMessageMenu(m, x, y) {
  if (!m || !m.id) return;
  const conv = activeConv();
  const canDelete = m.is_mine || (conv.type === 'group' && ['owner', 'admin'].includes(conv.role));
  const content = html`
    ${!m.deleted ? html`<div class="quick-react">${QUICK.map((e) => html`<button data-cmd="react" data-emoji="${e}" aria-label="Reaksi ${e}">${e}</button>`)}</div><hr>` : ''}
    ${!m.deleted ? html`<button data-cmd="reply">${icon('reply', 'i-sm')} Balas</button>` : ''}
    ${m.body && !m.deleted ? html`<button data-cmd="copy">${icon('copy', 'i-sm')} Salin teks</button>` : ''}
    ${canEdit(m) && m.body !== null ? html`<button data-cmd="edit">${icon('edit', 'i-sm')} Edit</button>` : ''}
    ${(m.attachments || []).length && !m.deleted ? html`<button data-cmd="download">${icon('download', 'i-sm')} Unduh lampiran</button>` : ''}
    ${canDelete && !m.deleted ? html`<hr><button class="danger" data-cmd="delete">${icon('trash', 'i-sm')} Hapus untuk semua</button>` : ''}`;
  showMenu(x, y, content, async (cmd, b) => {
    if (cmd === 'react') return react(m, b.dataset.emoji);
    if (cmd === 'reply') { S.reply = m; S.editing = null; renderComposerExtra(); $('#composer-input')?.focus(); }
    if (cmd === 'copy') { try { await navigator.clipboard.writeText(m.body); toast('Teks disalin.'); } catch { toast('Tidak dapat menyalin.', { error: true }); } }
    if (cmd === 'edit') startEdit(m);
    if (cmd === 'download') m.attachments.forEach((a) => { const l = document.createElement('a'); l.href = a.url + '?download=1'; l.download = a.name; l.click(); });
    if (cmd === 'delete') {
      if (!(await confirmDialog('Hapus pesan?', 'Pesan akan dihapus untuk semua anggota percakapan. Penerima mungkin sudah membaca atau menyalinnya.', 'Hapus', true))) return;
      try { upsertMessage((await api('DELETE', `/messages/${m.id}`)).message, { silent: true }); } catch (e) { toast(e.message, { error: true }); }
    }
  });
}
async function react(m, emoji) {
  try { upsertMessage((await api('POST', `/messages/${m.id}/reactions`, { emoji })).message, { silent: true }); }
  catch (e) { toast(e.message, { error: true }); }
}

function openConvMenu(x, y) {
  const conv = activeConv(); if (!conv) return;
  showMenu(x, y, html`
    <button data-cmd="info">${icon('info', 'i-sm')} ${conv.type === 'group' ? 'Info grup' : 'Info kontak'}</button>
    <button data-cmd="search">${icon('search', 'i-sm')} Cari pesan</button>
    <button data-cmd="mute">${icon(conv.muted ? 'bell' : 'bellOff', 'i-sm')} ${conv.muted ? 'Bunyikan notifikasi' : 'Bisukan notifikasi'}</button>
    <button data-cmd="pin">${icon('pin', 'i-sm')} ${conv.pinned ? 'Lepas sematan' : 'Sematkan chat'}</button>
    <button data-cmd="archive">${icon('archive', 'i-sm')} ${conv.archived ? 'Keluarkan dari arsip' : 'Arsipkan chat'}</button>
    ${conv.type === 'group' ? html`<hr><button class="danger" data-cmd="leave">${icon('logout', 'i-sm')} Keluar dari grup</button>` : ''}`,
  (cmd) => convCommand(conv, cmd));
}
async function convCommand(conv, cmd) {
  if (cmd === 'info') return openInfo(conv);
  if (cmd === 'search') return openChatSearch();
  if (cmd === 'mute') {
    if (conv.muted) return setPrefs(conv, { mute_minutes: 0 });
    return showMenu(innerWidth / 2 - 100, innerHeight / 2 - 80, html`
      <button data-cmd="480">8 jam</button><button data-cmd="10080">1 minggu</button><button data-cmd="5256000">Selalu</button>`,
    (m) => setPrefs(conv, { mute_minutes: Number(m) }));
  }
  if (cmd === 'pin') return setPrefs(conv, { pinned: !conv.pinned });
  if (cmd === 'archive') {
    await setPrefs(conv, { archived: !conv.archived });
    if (!conv.archived) return;
    if (S.activeId === conv.id) closeChat();
    return toast('Chat diarsipkan.', { action: 'Urungkan', onAction: () => setPrefs(conv, { archived: false }) });
  }
  if (cmd === 'leave') {
    if (!(await confirmDialog('Keluar dari grup?', `Anda tidak akan menerima pesan dari "${conv.title}" lagi.`, 'Keluar', true))) return;
    try { await api('POST', `/conversations/${conv.id}/leave`); S.convs.delete(conv.id); closeAllLayers(); closeChat(); toast('Anda keluar dari grup.'); }
    catch (e) { toast(e.message, { error: true }); }
  }
}
async function setPrefs(conv, prefs) {
  try { const r = await api('PATCH', `/conversations/${conv.id}/preferences`, prefs); S.convs.set(conv.id, r.conversation); renderList(); if (S.activeId === conv.id) renderHead(); }
  catch (e) { toast(e.message, { error: true }); }
}

/* ---------- Cari di dalam chat ---------- */
function openChatSearch() {
  const bar = $('#chat-search-bar'); if (!bar) return;
  bar.innerHTML = val(html`<div class="chat-search">${icon('search', 'i-sm')}<input id="msg-search" placeholder="Cari di percakapan ini" autocomplete="off"><span class="count" id="msg-search-count"></span><button class="icon-btn" data-action="search-prev" title="Sebelumnya">${icon('down', 'i-sm')}</button><button class="icon-btn" data-action="close-search" title="Tutup">${icon('x', 'i-sm')}</button></div>`);
  const input = $('#msg-search'); input.focus();
  input.addEventListener('input', debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) { $('#msg-search-count').textContent = ''; S.search = null; return; }
    try {
      const r = await api('GET', `/conversations/${S.activeId}/messages?q=${encodeURIComponent(q)}&limit=100`);
      S.search = { q, results: r.data.reverse(), index: 0 };
      $('#msg-search-count').textContent = r.data.length ? `1 dari ${r.data.length}` : 'Tidak ada';
      if (r.data.length) jumpTo(S.search.results[0].id);
    } catch {}
  }, 350));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') stepSearch(); if (e.key === 'Escape') closeSearch(); });
}
function stepSearch() {
  const s = S.search; if (!s || !s.results.length) return;
  s.index = (s.index + 1) % s.results.length;
  $('#msg-search-count').textContent = `${s.index + 1} dari ${s.results.length}`;
  jumpTo(s.results[s.index].id);
}
function closeSearch() { S.search = null; const b = $('#chat-search-bar'); if (b) b.innerHTML = ''; }

async function jumpTo(id) {
  const st = msgState(S.activeId);
  let guard = 0;
  while (!st.items.some((m) => m.id === id) && st.hasMore && guard++ < 20) {
    const first = st.items.find((m) => m.id); if (!first) break;
    await loadMessages(S.activeId, first.id);
  }
  const el = $(`.msg[data-mid="${id}"]`);
  if (!el) return toast('Pesan tidak ditemukan.');
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

/* =========================================================
   Panel: chat baru, grup baru, info, pengaturan
   ========================================================= */
function userRow(u, extra = '') {
  return html`${avatar(u.name, u.avatar_url, u.id)}<span class="li-body"><div class="li-title">${u.name}</div><div class="li-sub">${u.about || fmtPhone(u.phone)}</div></span>${extra}`;
}
function contactSearch(container, onPick, opts = {}) {
  const input = $('.contact-q', container), results = $('.contact-results', container);
  const known = () => {
    const map = new Map();
    S.convs.forEach((c) => c.members?.forEach((m) => { if (m.user && m.user.id !== myId()) map.set(m.user.id, m.user); }));
    return [...map.values()];
  };
  const draw = (list, note) => {
    results.innerHTML = val(list.length
      ? list.map((u) => html`<button class="list-item" data-uid="${u.id}">${userRow(u, opts.selected ? html`<span class="check ${opts.selected.has(u.id) ? 'on' : ''}">${icon('check', 'i-xs')}</span>` : '')}</button>`)
      : html`<p class="hint" style="padding:8px">${note}</p>`);
  };
  let cache = new Map(known().map((u) => [u.id, u]));
  const run = debounce(async () => {
    const q = input.value.trim();
    const local = known().filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()) || String(u.phone).includes(q.replace(/\D/g, '') || '§'));
    if (q.length < 2) return draw(local, 'Belum ada kontak. Ketik nomor HP lengkap untuk mencari.');
    try {
      const r = await api('GET', '/users/search?q=' + encodeURIComponent(q));
      const merged = new Map(local.map((u) => [u.id, u])); r.data.forEach((u) => merged.set(u.id, u));
      merged.forEach((u) => cache.set(u.id, u));
      draw([...merged.values()], /^[\d\s+()-]+$/.test(q) ? 'Nomor ini belum terdaftar di Almara Chat. Pastikan nomor lengkap, contoh 0812 3456 7890.' : 'Tidak ditemukan. Coba cari dengan nomor HP lengkap.');
    } catch (e) { draw(local, e.message); }
  }, 300);
  input.addEventListener('input', run); run();
  results.addEventListener('click', (e) => { const b = e.target.closest('[data-uid]'); if (b) { onPick(cache.get(Number(b.dataset.uid))); if (opts.selected) run(); } });
}

function openNewChat() {
  const ov = drawer('Chat baru', html`
    <button class="list-item" data-new="group"><span class="avatar" style="--av:var(--gold-bright);color:#24182F">${icon('users')}</span><span class="li-body"><div class="li-title">Grup baru</div><div class="li-sub">Chat bersama beberapa orang</div></span></button>
    <button class="list-item" data-new="link"><span class="avatar" style="--av:var(--brand)">${icon('qr')}</span><span class="li-body"><div class="li-title">Tautkan perangkat</div><div class="li-sub">Masuk di laptop atau tablet lain</div></span></button>
    <div class="search" style="margin:12px 0">${icon('search', 'i-sm')}<input class="contact-q" type="search" placeholder="Cari nama atau nomor HP" autocomplete="off"></div>
    <p class="section-title">Kontak</p>
    <div class="contact-results"></div>`);
  ov.querySelector('[data-new="group"]').onclick = () => { ov.close(); openNewGroup(); };
  ov.querySelector('[data-new="link"]').onclick = () => { ov.close(); openApproveLink(); };
  contactSearch(ov, async (u) => {
    try {
      const r = await api('POST', '/conversations', { type: 'direct', user_id: u.id });
      S.convs.set(r.conversation.id, r.conversation);
      ov.close(); openConversation(r.conversation.id);
    } catch (e) { toast(e.message, { error: true }); }
  });
}

function openNewGroup() {
  const selected = new Map();
  const ov = drawer('Grup baru — pilih anggota', html`
    <div class="selected-row" id="sel"></div>
    <div class="search" style="margin:0 0 12px">${icon('search', 'i-sm')}<input class="contact-q" type="search" placeholder="Cari nama atau nomor HP" autocomplete="off"></div>
    <div class="contact-results"></div>`,
  html`<button class="btn" id="grp-next" disabled>Lanjut</button>`);
  const sel = { has: (id) => selected.has(id) };
  const drawSel = () => {
    $('#sel', ov).innerHTML = val([...selected.values()].map((u) => html`<span class="pill">${u.name}<button data-rm="${u.id}" aria-label="Hapus">${icon('x', 'i-xs')}</button></span>`));
    $('#grp-next', ov).disabled = !selected.size;
  };
  $('#sel', ov).addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { selected.delete(Number(b.dataset.rm)); drawSel(); $('.contact-q', ov).dispatchEvent(new Event('input')); } });
  contactSearch(ov, (u) => { selected.has(u.id) ? selected.delete(u.id) : selected.set(u.id, u); drawSel(); }, { selected: sel });
  $('#grp-next', ov).onclick = () => {
    ov.close();
    const ov2 = drawer('Grup baru', html`
      <label class="field"><span>Nama grup</span><input class="input" id="g-name" maxlength="80" placeholder="Contoh: Tim Operasional"></label>
      <label class="field"><span>Deskripsi (opsional)</span><textarea class="textarea" id="g-desc" maxlength="300" placeholder="Tujuan grup ini"></textarea></label>
      <p class="section-title">${selected.size} anggota</p>
      ${[...selected.values()].map((u) => html`<div class="list-item">${userRow(u)}</div>`)}`,
    html`<button class="btn btn-ghost" data-close="1">Batal</button><button class="btn" id="g-create">Buat grup</button>`);
    $('#g-create', ov2).onclick = async () => {
      const name = $('#g-name', ov2).value.trim();
      if (!name) return $('#g-name', ov2).focus();
      try {
        const r = await api('POST', '/conversations', { type: 'group', name, description: $('#g-desc', ov2).value.trim() || null, member_ids: [...selected.keys()] });
        S.convs.set(r.conversation.id, r.conversation);
        ov2.close(); openConversation(r.conversation.id);
      } catch (e) { toast(e.message, { error: true }); }
    };
  };
}

function openInfo(conv) {
  conv = S.convs.get(conv.id) || conv;
  const isAdmin = ['owner', 'admin'].includes(conv.role);
  if (conv.type === 'direct') {
    const p = conv.peer || {};
    const ov = drawer('Info kontak', html`
      <div class="profile-hero">${avatar(conv.title, conv.avatar_url, p.id, 'lg')}<h4>${conv.title}</h4><p>${fmtPhone(p.phone)}</p>${p.about ? html`<p style="margin-top:6px;color:var(--text)">${p.about}</p>` : ''}</div>
      <div class="section">
        <button class="list-item" data-cmd="search">${icon('search')}<span class="li-body">Cari pesan</span></button>
        <button class="list-item" data-cmd="mute">${icon(conv.muted ? 'bell' : 'bellOff')}<span class="li-body">${conv.muted ? 'Bunyikan notifikasi' : 'Bisukan notifikasi'}</span></button>
        <button class="list-item" data-cmd="pin">${icon('pin')}<span class="li-body">${conv.pinned ? 'Lepas sematan' : 'Sematkan chat'}</span></button>
        <button class="list-item" data-cmd="archive">${icon('archive')}<span class="li-body">${conv.archived ? 'Keluarkan dari arsip' : 'Arsipkan chat'}</span></button>
      </div>`);
    ov.addEventListener('click', (e) => { const b = e.target.closest('[data-cmd]'); if (b) { ov.close(); convCommand(conv, b.dataset.cmd); } });
    return;
  }
  const ov = drawer('Info grup', html`
    <div class="profile-hero">
      ${isAdmin ? html`<label style="cursor:pointer;position:relative">${avatar(conv.title, conv.avatar_url, 'g' + conv.id, 'lg')}<span class="cam" style="position:absolute;right:0;bottom:0;width:32px;height:32px;border-radius:50%;background:var(--gold-bright);color:#24182F;display:grid;place-items:center">${icon('camera', 'i-sm')}</span><input type="file" accept="image/*" id="g-avatar" hidden></label>` : avatar(conv.title, conv.avatar_url, 'g' + conv.id, 'lg')}
      <h4>${conv.title}</h4><p>Grup · ${conv.members.length} anggota</p>
    </div>
    ${isAdmin ? html`
    <div class="section">
      <label class="field"><span>Nama grup</span><input class="input" id="gi-name" maxlength="80" value="${conv.title}"></label>
      <label class="field"><span>Deskripsi</span><textarea class="textarea" id="gi-desc" maxlength="300">${conv.description || ''}</textarea></label>
      <div class="switch-row"><span class="li-body"><b>Hanya admin yang dapat mengirim pesan</b><div class="hint" style="margin:0">Cocok untuk grup pengumuman.</div></span><label class="switch"><input type="checkbox" id="gi-policy" ${conv.send_policy === 'admins' ? 'checked' : ''}><span></span></label></div>
      <button class="btn" id="gi-save">Simpan perubahan</button>
    </div>` : conv.description ? html`<div class="section"><p class="section-title">Deskripsi</p><p style="margin:0;white-space:pre-wrap">${conv.description}</p></div>` : ''}
    <div class="section">
      <div class="row-between"><p class="section-title" style="margin:0">${conv.members.length} anggota</p>${isAdmin ? html`<button class="btn-link" id="gi-add">${icon('plus', 'i-sm')} Tambah anggota</button>` : ''}</div>
      ${conv.members.map((m) => m.user ? html`<button class="list-item" data-member="${m.user.id}">${userRow(m.user, m.role !== 'member' ? html`<span class="tag">${m.role === 'owner' ? 'Pemilik' : 'Admin'}</span>` : '')}</button>` : '')}
    </div>
    <div class="section">
      <button class="list-item" data-cmd="mute">${icon(conv.muted ? 'bell' : 'bellOff')}<span class="li-body">${conv.muted ? 'Bunyikan notifikasi' : 'Bisukan notifikasi'}</span></button>
      <button class="list-item danger" data-cmd="leave">${icon('logout')}<span class="li-body">Keluar dari grup</span></button>
    </div>`);
  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmd]'); if (b) { ov.close(); return convCommand(conv, b.dataset.cmd); }
    const mb = e.target.closest('[data-member]');
    if (mb) {
      const uid = Number(mb.dataset.member);
      const member = conv.members.find((m) => m.user?.id === uid);
      if (uid === myId()) return;
      const r = mb.getBoundingClientRect();
      showMenu(r.left + 40, r.bottom - 6, html`
        <button data-cmd="chat">${icon('chat', 'i-sm')} Kirim pesan</button>
        ${isAdmin && member.role !== 'owner' ? html`<button data-cmd="role">${icon('shield', 'i-sm')} ${member.role === 'admin' ? 'Cabut status admin' : 'Jadikan admin'}</button><button class="danger" data-cmd="remove">${icon('trash', 'i-sm')} Keluarkan dari grup</button>` : ''}`,
      async (cmd) => {
        try {
          if (cmd === 'chat') { const r2 = await api('POST', '/conversations', { type: 'direct', user_id: uid }); S.convs.set(r2.conversation.id, r2.conversation); ov.close(); return openConversation(r2.conversation.id); }
          if (cmd === 'role') S.convs.set(conv.id, (await api('PATCH', `/conversations/${conv.id}/members/${uid}`, { role: member.role === 'admin' ? 'member' : 'admin' })).conversation);
          if (cmd === 'remove') {
            if (!(await confirmDialog('Keluarkan anggota?', `${member.user.name} akan dikeluarkan dari grup.`, 'Keluarkan', true))) return;
            S.convs.set(conv.id, (await api('DELETE', `/conversations/${conv.id}/members/${uid}`)).conversation);
          }
          ov.close(); openInfo(S.convs.get(conv.id)); renderHead();
        } catch (err) { toast(err.message, { error: true }); }
      });
    }
  });
  if (isAdmin) {
    $('#gi-save', ov).onclick = async () => {
      try {
        const r = await api('PATCH', `/conversations/${conv.id}`, { name: $('#gi-name', ov).value.trim(), description: $('#gi-desc', ov).value.trim() || null, send_policy: $('#gi-policy', ov).checked ? 'admins' : 'all' });
        S.convs.set(conv.id, r.conversation); renderList(); renderPane(); toast('Perubahan disimpan.'); ov.close();
      } catch (e) { toast(e.message, { error: true }); }
    };
    $('#g-avatar', ov).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const fd = new FormData(); fd.append('avatar', f);
      try { const r = await api('POST', `/conversations/${conv.id}/avatar`, fd); S.convs.set(conv.id, r.conversation); ov.close(); openInfo(r.conversation); renderList(); renderHead(); }
      catch (err) { toast(err.message, { error: true }); }
    };
    $('#gi-add', ov).onclick = () => {
      ov.close();
      const picked = new Map();
      const existing = new Set(conv.members.map((m) => m.user?.id));
      const ov2 = drawer('Tambah anggota', html`<div class="search" style="margin:0 0 12px">${icon('search', 'i-sm')}<input class="contact-q" type="search" placeholder="Cari nama atau nomor HP"></div><div class="contact-results"></div>`,
        html`<button class="btn" id="add-ok">Tambahkan</button>`);
      contactSearch(ov2, (u) => { if (existing.has(u.id)) return toast(`${u.name} sudah menjadi anggota.`); picked.has(u.id) ? picked.delete(u.id) : picked.set(u.id, u); }, { selected: { has: (id) => picked.has(id) || existing.has(id) } });
      $('#add-ok', ov2).onclick = async () => {
        if (!picked.size) return;
        try { const r = await api('POST', `/conversations/${conv.id}/members`, { user_ids: [...picked.keys()] }); S.convs.set(conv.id, r.conversation); ov2.close(); openInfo(r.conversation); renderHead(); }
        catch (e) { toast(e.message, { error: true }); }
      };
    };
  }
}

/* ---------- Pengaturan ---------- */
async function saveMe(patch) {
  try { S.me = (await api('PATCH', '/me', patch)).user; store.set('me', S.me); return true; }
  catch (e) { toast(e.message, { error: true }); return false; }
}

function openSettings(section) {
  const s = S.me.settings || {};
  const notifState = !('Notification' in window) ? 'unsupported' : Notification.permission;
  const ov = drawer('Pengaturan', html`
    <div class="profile-hero">
      <label style="cursor:pointer;position:relative">${avatar(S.me.name, S.me.avatar_url, S.me.id, 'lg')}<span style="position:absolute;right:0;bottom:0;width:32px;height:32px;border-radius:50%;background:var(--gold-bright);color:#24182F;display:grid;place-items:center">${icon('camera', 'i-sm')}</span><input type="file" accept="image/*" id="me-avatar" hidden></label>
      <h4>${S.me.name}</h4><p>${fmtPhone(S.me.phone)}</p>
    </div>
    <div class="section" id="sec-profile">
      <p class="section-title">Profil</p>
      <label class="field"><span>Nama</span><input class="input" id="me-name" maxlength="80" value="${S.me.name || ''}"></label>
      <label class="field"><span>Info</span><input class="input" id="me-about" maxlength="140" value="${S.me.about || ''}" placeholder="Contoh: Tersedia"></label>
      <button class="btn btn-ghost" id="me-save">Simpan profil</button>
    </div>
    <div class="section" id="sec-notif">
      <p class="section-title">Notifikasi</p>
      <div class="mode-cards">
        ${[['normal', 'Normal', 'Suara dan notifikasi dengan isi pesan.'], ['sound', 'Hanya suara', 'Bunyi tanpa jendela notifikasi.'], ['private', 'Privat', 'Notifikasi tanpa nama pengirim dan isi pesan.'], ['silent', 'Senyap', 'Tidak ada suara atau notifikasi. Pesan tetap tersimpan.']]
          .map(([k, t, d]) => html`<label class="mode-card"><input type="radio" name="nmode" value="${k}" ${s.notify_mode === k ? 'checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`)}
      </div>
      <div class="switch-row"><span class="li-body"><b>Tampilkan isi pesan</b><div class="hint" style="margin:0">Pratinjau pesan di notifikasi.</div></span><label class="switch"><input type="checkbox" id="set-preview" ${s.notify_preview !== false ? 'checked' : ''}><span></span></label></div>
      ${notifState === 'default' ? html`<button class="btn btn-ghost" data-action="enable-notif">${icon('bell', 'i-sm')} Izinkan notifikasi browser</button>` : ''}
      ${notifState === 'denied' ? html`<p class="hint">Notifikasi diblokir oleh browser. Izinkan dari pengaturan situs browser Anda.</p>` : ''}
      ${notifState === 'unsupported' ? html`<p class="hint">Browser ini tidak mendukung notifikasi${window.isSecureContext ? '' : ' (memerlukan HTTPS)'}.</p>` : ''}
      <p class="hint">Browser dapat membatasi suara dan notifikasi saat aplikasi ditutup.</p>
    </div>
    <div class="section">
      <p class="section-title">Privasi & chat</p>
      <div class="switch-row"><span class="li-body"><b>Tanda dibaca</b><div class="hint" style="margin:0">Jika dimatikan, orang lain tidak melihat kapan Anda membaca pesan.</div></span><label class="switch"><input type="checkbox" id="set-receipts" ${s.read_receipts !== false ? 'checked' : ''}><span></span></label></div>
      <div class="switch-row"><span class="li-body"><b>Enter untuk mengirim</b><div class="hint" style="margin:0">Shift + Enter untuk baris baru.</div></span><label class="switch"><input type="checkbox" id="set-enter" ${s.enter_to_send !== false ? 'checked' : ''}><span></span></label></div>
    </div>
    <div class="section">
      <p class="section-title">Tampilan</p>
      <div class="seg" style="--n:3" id="theme-seg">${[['system', 'Otomatis'], ['light', 'Terang'], ['dark', 'Gelap']].map(([k, l]) => html`<button data-theme-opt="${k}" class="${(s.theme || 'system') === k ? 'on' : ''}">${l}</button>`)}</div>
    </div>
    <div class="section" id="sec-devices">
      <div class="row-between"><p class="section-title" style="margin:0">Perangkat tertaut</p><button class="btn-link" id="link-new">${icon('qr', 'i-sm')} Tautkan perangkat</button></div>
      <div id="device-list"><div class="spinner"></div></div>
    </div>
    <div class="section">
      ${!isStandalone() ? html`<button class="list-item" data-action="install">${icon('install')}<span class="li-body"><div class="li-title">Pasang aplikasi</div><div class="li-sub">Akses dari layar utama / desktop</div></span></button>` : ''}
      <button class="list-item danger" id="logout">${icon('logout')}<span class="li-body">Keluar dari perangkat ini</span></button>
    </div>
    <div class="about-card"><b>${CFG.name}</b> v${CFG.version}<br>Chat pribadi & bisnis — PWA. Dibuat oleh ${SIGNATURE}.</div>`);

  $('#me-save', ov).onclick = async () => { if (await saveMe({ name: $('#me-name', ov).value.trim(), about: $('#me-about', ov).value.trim() || null })) { toast('Profil disimpan.'); renderShell(); loadConversations(); } };
  $('#me-avatar', ov).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('avatar', f);
    try { S.me = (await api('POST', '/me/avatar', fd)).user; ov.close(); openSettings(); $('#rail-me').innerHTML = val(avatar(S.me.name, S.me.avatar_url, S.me.id, 'sm')); }
    catch (err) { toast(err.message, { error: true }); }
  };
  ov.querySelectorAll('input[name="nmode"]').forEach((r) => r.onchange = () => saveMe({ settings: { notify_mode: r.value } }));
  $('#set-preview', ov).onchange = (e) => saveMe({ settings: { notify_preview: e.target.checked } });
  $('#set-receipts', ov).onchange = (e) => saveMe({ settings: { read_receipts: e.target.checked } });
  $('#set-enter', ov).onchange = (e) => saveMe({ settings: { enter_to_send: e.target.checked } });
  $('#theme-seg', ov).onclick = async (e) => {
    const b = e.target.closest('[data-theme-opt]'); if (!b) return;
    $$('#theme-seg button', ov).forEach((x) => x.classList.toggle('on', x === b));
    applyTheme(b.dataset.themeOpt); saveMe({ settings: { theme: b.dataset.themeOpt } });
  };
  $('#link-new', ov).onclick = () => { ov.close(); openApproveLink(); };
  $('#logout', ov).onclick = async () => {
    if (!(await confirmDialog('Keluar?', 'Perangkat ini akan diputus dari akun Anda. Pesan tetap tersimpan di akun.', 'Keluar', true))) return;
    try { await api('POST', '/auth/logout'); } catch {}
    ov.close(); onSignedOut();
  };
  loadDevices(ov);
  if (section) setTimeout(() => $('#sec-' + section, ov)?.scrollIntoView({ behavior: 'smooth' }), 80);
}

async function loadDevices(ov) {
  const el = $('#device-list', ov); if (!el) return;
  try {
    const r = await api('GET', '/devices');
    el.innerHTML = val(r.data.map((d) => html`
      <div class="list-item">
        <span class="avatar sm" style="--av:${d.is_current ? 'var(--gold-bright)' : 'var(--brand)'};color:${d.is_current ? '#24182F' : '#fff'}">${icon(/Android|iOS/.test(d.platform) ? 'phone' : 'devices', 'i-sm')}</span>
        <span class="li-body"><div class="li-title">${d.name}</div><div class="li-sub">${d.is_current ? 'Perangkat ini' : 'Aktif ' + fmtListTime(d.last_active_at)} · ${d.linked_via === 'qr' ? 'via QR' : 'via OTP'}</div></span>
        <button class="icon-btn" data-dev-rename="${d.id}" data-name="${d.name}" title="Ganti nama">${icon('edit', 'i-sm')}</button>
        ${!d.is_current ? html`<button class="icon-btn" data-dev-revoke="${d.id}" data-name="${d.name}" title="Putuskan" style="color:var(--danger)">${icon('logout', 'i-sm')}</button>` : ''}
      </div>`));
    el.onclick = async (e) => {
      const rv = e.target.closest('[data-dev-revoke]'), rn = e.target.closest('[data-dev-rename]');
      if (rv) {
        if (!(await confirmDialog('Putuskan perangkat?', `"${rv.dataset.name}" akan langsung keluar dari akun Anda.`, 'Putuskan', true))) return;
        try { await api('DELETE', '/devices/' + rv.dataset.devRevoke); toast('Perangkat diputus.'); loadDevices(ov); } catch (err) { toast(err.message, { error: true }); }
      }
      if (rn) {
        const name = prompt('Nama perangkat', rn.dataset.name);
        if (name && name.trim()) { try { await api('PATCH', '/devices/' + rn.dataset.devRename, { name: name.trim() }); loadDevices(ov); } catch (err) { toast(err.message, { error: true }); } }
      }
    };
  } catch (e) { el.innerHTML = val(html`<p class="hint">${e.message}</p>`); }
}

/* ---------- Setujui penautan perangkat (dari perangkat yang sudah login) ---------- */
let scanStream = null, scanTimer = null;
function stopScanner() { if (scanTimer) cancelAnimationFrame(scanTimer); scanTimer = null; scanStream?.getTracks().forEach((t) => t.stop()); scanStream = null; }

function openApproveLink() {
  const canScan = 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia;
  const ov = drawer('Tautkan perangkat', html`
    <p style="margin-top:0">Di perangkat baru, buka <b>${location.host}</b> lalu pilih <b>Tautkan perangkat ini dengan QR</b>.</p>
    ${canScan ? html`<div class="scanner" id="scanner" hidden><video id="scan-video" playsinline muted></video></div><button class="btn btn-block" id="scan-start">${icon('camera', 'i-sm')} Pindai kode QR</button><p class="hint" style="text-align:center">atau ketik kode yang tampil di perangkat baru</p>` : html`<p class="hint">Masukkan kode yang tampil di bawah QR pada perangkat baru.</p>`}
    <form id="code-form" novalidate>
      <label class="field"><span>Kode penautan</span><input class="input" id="link-code" placeholder="ABCD-1234" autocomplete="off" style="text-transform:uppercase;letter-spacing:.12em;font-weight:700"></label>
      <p class="error-text" id="link-err"></p>
      <button class="btn btn-ghost btn-block" type="submit">Lanjutkan</button>
    </form>
    <div id="link-confirm"></div>`);
  const preview = async (code) => {
    $('#link-err', ov).textContent = '';
    try {
      const r = await api('POST', '/devices/link/preview', { code });
      stopScanner(); $('#scanner', ov)?.setAttribute('hidden', '');
      const l = r.link;
      $('#link-confirm', ov).innerHTML = val(html`
        <div class="confirm-card"><span class="hint" style="margin:0">Tautkan perangkat ini ke akun Anda?</span><b>${l.device_name}</b><span class="hint" style="margin:0">${l.browser} · ${l.platform} · IP ${l.ip_address || '-'}</span></div>
        <p class="hint">Hanya setujui perangkat milik Anda sendiri. Perangkat tertaut dapat membaca dan mengirim pesan atas nama Anda.</p>
        <button class="btn btn-gold btn-block" id="link-approve">${icon('shield', 'i-sm')} Setujui & tautkan</button>`);
      $('#link-approve', ov).onclick = async () => {
        try { const a = await api('POST', '/devices/link/approve', { code }); toast(a.message); ov.close(); openSettings('devices'); }
        catch (e) { $('#link-err', ov).textContent = e.message; }
      };
    } catch (e) { $('#link-err', ov).textContent = e.message; }
  };
  $('#code-form', ov).onsubmit = (e) => { e.preventDefault(); const c = $('#link-code', ov).value.trim(); if (c) preview(c); };
  if (canScan) {
    $('#scan-start', ov).onclick = async () => {
      try {
        scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const v = $('#scan-video', ov); v.srcObject = scanStream; await v.play();
        $('#scanner', ov).hidden = false; $('#scan-start', ov).hidden = true;
        const det = new BarcodeDetector({ formats: ['qr_code'] });
        const loop = async () => {
          if (!scanStream) return;
          try { const codes = await det.detect(v); const hit = codes.find((c) => c.rawValue.startsWith('chatme-link:')); if (hit) { stopScanner(); return preview(hit.rawValue); } } catch {}
          scanTimer = requestAnimationFrame(loop);
        };
        loop();
      } catch { toast('Kamera tidak dapat dibuka. Ketik kodenya secara manual.', { error: true }); }
    };
  }
}

/* =========================================================
   STATUS 24 JAM
   ========================================================= */
const STATUS_COLORS = ['#4A2D6E', '#2F7D6D', '#A23E5C', '#3E6AA8', '#9A5B2E', '#7C6A1E', '#1F1A2E', '#C2622F'];
const STATUS_FONTS = ['sans', 'serif', 'mono', 'script'];
const STATUS_FONT_LABEL = { sans: 'Modern', serif: 'Klasik', mono: 'Mesin tik', script: 'Tulisan tangan' };
const STATUS_DURATION = 5500;

function setView(v) {
  S.view = v === 'status' ? 'status' : 'chats';
  applyView();
  if (S.view === 'status') { if (isMobile() && S.activeId) closeChat(); loadStatuses(); }
  renderList();
}
function applyView() {
  const side = $('.sidebar'); if (!side) return;
  side.dataset.view = S.view;
  $$('.side-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
  $('#rail-status')?.classList.toggle('active', S.view === 'status');
  if (S.view === 'status') $$('.rail [data-action="filter"]').forEach((b) => b.classList.remove('active'));
}

async function loadStatuses() {
  try {
    S.statusFeed = await api('GET', '/statuses');
    updateStatusDot();
    if (S.view === 'status') renderStatusList();
  } catch (e) { if (S.view === 'status' && !S.statusFeed) $('#conv-list').innerHTML = val(html`<div class="empty">${icon('alert')}<b>Status tidak dapat dimuat</b>${e.message}</div>`); }
}
const reloadStatuses = debounce(loadStatuses, 400);

function updateStatusDot() {
  const has = !!S.statusFeed?.contacts?.some((g) => !g.all_viewed && !g.muted);
  ['#rail-status-dot', '#tab-status-dot'].forEach((id) => { const d = $(id); if (d) d.hidden = !has; });
}

/** Cincin tersegmen: satu segmen per status, emas = belum dilihat. */
function statusRing(items, size = 52) {
  const n = Math.max(1, items.length), r = size / 2 - 2, c = 2 * Math.PI * r;
  const gap = n > 1 ? Math.min(6, c / n / 4) : 0, seg = c / n - gap;
  return raw(`<svg class="st-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${items.map((s, i) =>
    `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="2.6" stroke-linecap="round" stroke="${s.viewed ? 'var(--faint)' : 'var(--gold-bright)'}" stroke-dasharray="${seg} ${c - seg}" stroke-dashoffset="${-(i * (seg + gap)) + c / 4}"/>`).join('')}</svg>`);
}

function renderStatusList() {
  const el = $('#conv-list'); if (!el) return;
  const feed = S.statusFeed;
  if (!feed) { el.innerHTML = val(html`<div class="spinner"></div>`); return; }
  const mine = feed.mine || [];
  const groups = feed.contacts || [];
  const fresh = groups.filter((g) => !g.all_viewed && !g.muted);
  const seen = groups.filter((g) => g.all_viewed && !g.muted);
  const muted = groups.filter((g) => g.muted);
  const row = (g) => html`
    <button class="conv st-row" data-action="status-open" data-uid="${g.user.id}">
      <span class="st-avatar">${statusRing(g.statuses)}${avatar(g.user.name, g.user.avatar_url, g.user.id)}</span>
      <span class="conv-body"><span class="conv-top"><span class="conv-title">${g.user.name}</span></span>
      <span class="conv-bottom"><span class="conv-preview">${fmtListTime(g.last_at)}${g.statuses.length > 1 ? ` · ${g.statuses.length} status` : ''}</span></span></span>
    </button>`;
  const privacyLabel = { contacts: 'Kontak saya', except: 'Kontak saya, kecuali…', only: 'Hanya dibagikan dengan…' }[feed.privacy?.mode || 'contacts'];
  el.innerHTML = val(html`
    <div class="st-mine">
      <button class="conv st-row" data-action="${mine.length ? 'status-open' : 'status-media'}" data-uid="me">
        <span class="st-avatar">${mine.length ? statusRing(mine.map(() => ({ viewed: true }))) : ''}${avatar(S.me.name, S.me.avatar_url, S.me.id)}${!mine.length ? html`<span class="st-plus">${icon('plus', 'i-xs')}</span>` : ''}</span>
        <span class="conv-body"><span class="conv-top"><span class="conv-title">Status saya</span></span>
        <span class="conv-bottom"><span class="conv-preview">${mine.length ? `${mine.length} status · ${fmtListTime(mine[mine.length - 1].created_at)} · ${mine.reduce((n, s) => n + (s.view_count || 0), 0)} dilihat` : 'Bagikan foto, video, atau teks selama 24 jam'}</span></span></span>
      </button>
      <div class="st-quick">
        <button class="chip" data-action="status-text">${icon('type', 'i-xs')} Teks</button>
        <button class="chip" data-action="status-media">${icon('camera', 'i-xs')} Foto / video</button>
        <button class="chip" data-action="status-privacy">${icon('lock', 'i-xs')} ${privacyLabel}</button>
      </div>
    </div>
    ${fresh.length ? html`<p class="st-section">Terbaru</p>${fresh.map(row)}` : ''}
    ${seen.length ? html`<p class="st-section">Sudah dilihat</p>${seen.map(row)}` : ''}
    ${muted.length ? html`<details class="st-muted"><summary class="st-section">Dibisukan (${muted.length})</summary>${muted.map(row)}</details>` : ''}
    ${!groups.length ? html`<div class="empty">${icon('status')}<b>Belum ada status dari kontak</b>Status dari orang yang pernah Anda kirimi pesan akan muncul di sini selama 24 jam.</div>` : ''}`);
}

/* ---------- Pembuat status teks ---------- */
function stLayer(cls) {
  const el = document.createElement('div');
  el.className = 'overlay st-layer ' + cls;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  document.body.append(el);
  if (isMobile()) history.pushState({ layer: 1 }, '', location.href);
  return el;
}

function openStatusTextComposer() {
  let ci = 0, fi = 0;
  const ov = stLayer('st-compose');
  ov.innerHTML = val(html`
    <div class="st-bar">
      <button class="icon-btn" data-st="close" aria-label="Tutup">${icon('x')}</button>
      <span style="flex:1"></span>
      <button class="icon-btn" data-st="font" title="Ganti gaya huruf">${icon('type')}</button>
      <button class="icon-btn" data-st="color" title="Ganti warna latar">${icon('palette')}</button>
    </div>
    <div class="st-canvas"><textarea id="st-text" maxlength="700" rows="3" placeholder="Ketik status"></textarea></div>
    <div class="st-foot">
      <span class="st-font-name" id="st-font-name"></span>
      <button class="send-btn ready" data-st="send" aria-label="Kirim status">${icon('send')}</button>
    </div>`);
  const ta = $('#st-text', ov);
  const paint = () => {
    ov.style.setProperty('--st-bg', STATUS_COLORS[ci]);
    ov.dataset.font = STATUS_FONTS[fi];
    $('#st-font-name', ov).textContent = STATUS_FONT_LABEL[STATUS_FONTS[fi]];
    const len = ta.value.length; ta.style.fontSize = (len > 200 ? 20 : len > 90 ? 26 : 34) + 'px';
    ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, innerHeight * 0.6) + 'px';
  };
  ta.addEventListener('input', paint); paint(); setTimeout(() => ta.focus(), 50);
  ov.close = () => { ov.remove(); };
  ov.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-st]'); if (!b) return;
    if (b.dataset.st === 'close') ov.close();
    if (b.dataset.st === 'color') { ci = (ci + 1) % STATUS_COLORS.length; paint(); }
    if (b.dataset.st === 'font') { fi = (fi + 1) % STATUS_FONTS.length; paint(); }
    if (b.dataset.st === 'send') {
      const body = ta.value.trim(); if (!body) return ta.focus();
      b.disabled = true;
      try {
        const r = await api('POST', '/statuses', { type: 'text', body, color: STATUS_COLORS[ci], font: STATUS_FONTS[fi] });
        ov.close(); afterStatusPosted(r);
      } catch (err) { toast(err.message, { error: true }); b.disabled = false; }
    }
  });
}

/* ---------- Pembuat status foto / video ---------- */
function openStatusMediaComposer(file) {
  const isVideo = file.type.startsWith('video/');
  if (!isVideo && !file.type.startsWith('image/')) return toast('Status hanya mendukung foto atau video.', { error: true });
  if (file.size > (CFG.maxUploadMb || 20) * 1048576) return toast(`Ukuran file maksimal ${CFG.maxUploadMb} MB.`, { error: true });
  const url = URL.createObjectURL(file);
  const ov = stLayer('st-compose st-media');
  ov.innerHTML = val(html`
    <div class="st-bar"><button class="icon-btn" data-st="close" aria-label="Tutup">${icon('x')}</button></div>
    <div class="st-canvas">${isVideo ? html`<video src="${url}" controls playsinline autoplay muted></video>` : html`<img src="${url}" alt="">`}</div>
    <div class="st-foot st-caption">
      <input id="st-cap" maxlength="700" placeholder="Tambahkan keterangan…" autocomplete="off">
      <button class="send-btn ready" data-st="send" aria-label="Kirim status">${icon('send')}</button>
    </div>`);
  ov.close = () => { URL.revokeObjectURL(url); ov.remove(); };
  if (isVideo) {
    const v = $('video', ov);
    v.onloadedmetadata = () => { if (v.duration > 90) toast('Video lebih dari 90 detik. Sebaiknya potong agar ringan dikirim.'); };
  }
  $('#st-cap', ov).addEventListener('keydown', (e) => { if (e.key === 'Enter') $('[data-st="send"]', ov).click(); });
  ov.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-st]'); if (!b) return;
    if (b.dataset.st === 'close') ov.close();
    if (b.dataset.st === 'send') {
      b.disabled = true; b.innerHTML = val(html`<span class="spinner" style="width:18px;height:18px;margin:0;border-width:2px"></span>`);
      const fd = new FormData();
      fd.append('type', isVideo ? 'video' : 'image');
      fd.append('file', file, file.name || (isVideo ? 'status.mp4' : 'status.jpg'));
      const cap = $('#st-cap', ov).value.trim(); if (cap) fd.append('body', cap);
      try { const r = await api('POST', '/statuses', fd); ov.close(); afterStatusPosted(r); }
      catch (err) { toast(err.message, { error: true }); b.disabled = false; b.innerHTML = val(icon('send')); }
    }
  });
}

function afterStatusPosted(r) {
  toast(r.recipients ? `Status dibagikan ke ${r.recipients} kontak.` : 'Status terpasang. Belum ada kontak yang bisa melihatnya — kirim pesan ke seseorang dulu.', { duration: 5000 });
  if (S.view !== 'status') setView('status'); else loadStatuses();
}

/* ---------- Penampil status ---------- */
let viewer = null;

function statusGroupsForViewer() {
  const f = S.statusFeed || {};
  const groups = [];
  if (f.mine?.length) groups.push({ key: 'me', user: { id: S.me.id, name: 'Status saya', avatar_url: S.me.avatar_url }, statuses: f.mine, mine: true });
  const contacts = f.contacts || [];
  [...contacts.filter((g) => !g.all_viewed && !g.muted), ...contacts.filter((g) => g.all_viewed && !g.muted), ...contacts.filter((g) => g.muted)]
    .forEach((g) => groups.push({ key: g.user.id, user: g.user, statuses: g.statuses, mine: false, muted: g.muted }));
  return groups;
}

function openStatusViewer(key, statusId = null) {
  const groups = statusGroupsForViewer();
  let gi = groups.findIndex((g) => g.key === key);
  if (gi < 0) return toast('Status tidak tersedia lagi.');
  const g = groups[gi];
  let si = statusId ? Math.max(0, g.statuses.findIndex((s) => s.id === statusId)) : g.mine ? 0 : Math.max(0, g.statuses.findIndex((s) => !s.viewed));
  closeStatusViewer();
  const ov = stLayer('st-viewer');
  viewer = { ov, groups, gi, si, timer: null, start: 0, elapsed: 0, paused: false, dur: STATUS_DURATION, video: null };
  ov.close = closeStatusViewer;
  ov.addEventListener('click', onViewerClick);
  ov.addEventListener('pointerdown', onViewerPointerDown);
  ov.addEventListener('pointerup', onViewerPointerUp);
  ov.addEventListener('pointercancel', onViewerPointerUp);
  drawStatus();
}

function closeStatusViewer() {
  if (!viewer) return;
  cancelAnimationFrame(viewer.timer);
  viewer.video?.pause();
  viewer.ov.remove();
  viewer = null;
  if (S.view === 'status') renderStatusList();
  updateStatusDot();
}

function drawStatus() {
  const v = viewer; if (!v) return;
  const g = v.groups[v.gi], s = g.statuses[v.si];
  cancelAnimationFrame(v.timer);
  v.video = null; v.elapsed = 0; v.paused = false; v.dur = STATUS_DURATION;
  const content = s.type === 'text'
    ? html`<div class="st-text-card" style="--st-bg:${s.meta?.color || STATUS_COLORS[0]}" data-font="${s.meta?.font || 'sans'}"><p>${richText(s.body)}</p></div>`
    : s.type === 'video'
      ? html`<video src="${s.media_url}" playsinline autoplay ${g.mine ? '' : ''}></video>`
      : html`<img src="${s.media_url}" alt="">`;
  v.ov.innerHTML = val(html`
    <div class="st-progress">${g.statuses.map((x, i) => html`<span><i style="width:${i < v.si ? 100 : 0}%"></i></span>`)}</div>
    <div class="st-head">
      <button class="icon-btn" data-sv="close" aria-label="Tutup">${icon('back')}</button>
      ${avatar(g.mine ? S.me.name : g.user.name, g.user.avatar_url, g.user.id, 'sm')}
      <span class="st-who"><b>${g.user.name}</b><small>${fmtListTime(s.created_at)}${fmtListTime(s.created_at).includes('.') ? '' : ' ' + fmtTime(s.created_at)}</small></span>
      <button class="icon-btn" data-sv="pause" aria-label="Jeda">${icon('pause', 'i-sm')}</button>
      <button class="icon-btn" data-sv="menu" aria-label="Menu">${icon('more')}</button>
    </div>
    <div class="st-stage">${content}${s.type !== 'text' && s.body ? html`<p class="st-caption-text">${richText(s.body)}</p>` : ''}</div>
    <button class="st-nav prev" data-sv="prev" aria-label="Sebelumnya"></button>
    <button class="st-nav next" data-sv="next" aria-label="Berikutnya"></button>
    <div class="st-bottom">
      ${g.mine
        ? html`<button class="st-views" data-sv="viewers">${icon('eye', 'i-sm')} <span id="st-view-count">${s.view_count || 0}</span> dilihat</button>`
        : html`<form class="st-reply" data-sv-form="1"><input id="st-reply-input" placeholder="Balas status…" maxlength="4000" autocomplete="off"><button class="send-btn ready" type="submit" aria-label="Kirim balasan">${icon('send')}</button></form>`}
    </div>`);
  const input = $('#st-reply-input', v.ov);
  if (input) {
    input.addEventListener('focus', () => pauseStatus(true));
    input.addEventListener('blur', () => { if (!input.value) pauseStatus(false); });
    $('.st-reply', v.ov).onsubmit = (e) => { e.preventDefault(); sendStatusReply(s, g, input); };
  }
  if (s.type === 'video') {
    const vid = $('video', v.ov); v.video = vid;
    vid.onloadedmetadata = () => { v.dur = Math.max(1000, (vid.duration || 5) * 1000); };
    vid.onended = () => nextStatus();
    vid.onerror = () => nextStatus();
  } else if (s.type === 'image') {
    const img = $('img', v.ov); v.paused = true;
    const go = () => { v.paused = false; v.start = performance.now(); };
    img.complete ? go() : (img.onload = go, img.onerror = () => { toast('Status tidak dapat dimuat.'); nextStatus(); });
  }
  if (!g.mine && !s.viewed) {
    s.viewed = true;
    api('POST', `/statuses/${s.id}/view`).catch(() => {});
    const feedG = S.statusFeed?.contacts?.find((x) => x.user.id === g.user.id);
    if (feedG) feedG.all_viewed = feedG.statuses.every((x) => x.viewed);
  }
  v.start = performance.now();
  tickStatus();
}

function tickStatus() {
  const v = viewer; if (!v) return;
  const bar = $$('.st-progress i', v.ov)[v.si];
  const step = () => {
    if (!viewer || viewer !== v) return;
    if (!v.paused) {
      const p = v.video ? (v.video.currentTime * 1000) / v.dur : (v.elapsed + performance.now() - v.start) / v.dur;
      if (bar) bar.style.width = Math.min(100, p * 100) + '%';
      if (p >= 1 && !v.video) return nextStatus();
    }
    v.timer = requestAnimationFrame(step);
  };
  v.timer = requestAnimationFrame(step);
}

function pauseStatus(on) {
  const v = viewer; if (!v || v.paused === on) return;
  if (on) { v.elapsed += performance.now() - v.start; v.video?.pause(); }
  else { v.start = performance.now(); v.video?.play().catch(() => {}); }
  v.paused = on;
  const b = $('[data-sv="pause"]', v.ov); if (b) b.innerHTML = val(icon(on ? 'play' : 'pause', 'i-sm'));
}

function nextStatus() {
  const v = viewer; if (!v) return;
  const g = v.groups[v.gi];
  if (v.si < g.statuses.length - 1) { v.si++; return drawStatus(); }
  if (v.gi < v.groups.length - 1 && !v.groups[v.gi + 1].mine) {
    v.gi++; const ng = v.groups[v.gi];
    v.si = Math.max(0, ng.statuses.findIndex((s) => !s.viewed)); return drawStatus();
  }
  closeStatusViewer();
}
function prevStatus() {
  const v = viewer; if (!v) return;
  if (v.si > 0) { v.si--; return drawStatus(); }
  if (v.gi > 0 && !v.groups[v.gi - 1].mine) { v.gi--; v.si = v.groups[v.gi].statuses.length - 1; return drawStatus(); }
  drawStatus();
}

let holdTimer = null, held = false;
function onViewerPointerDown(e) {
  if (e.target.closest('.st-head, .st-bottom')) return;
  held = false;
  holdTimer = setTimeout(() => { held = true; pauseStatus(true); }, 220);
}
function onViewerPointerUp() {
  clearTimeout(holdTimer);
  if (held) { setTimeout(() => { pauseStatus(false); held = false; }, 0); }
}

async function onViewerClick(e) {
  const v = viewer; if (!v) return;
  const b = e.target.closest('[data-sv]');
  if (!b) return;
  if (held && (b.dataset.sv === 'prev' || b.dataset.sv === 'next')) return;
  const g = v.groups[v.gi], s = g.statuses[v.si];
  switch (b.dataset.sv) {
    case 'close': return closeStatusViewer();
    case 'next': return nextStatus();
    case 'prev': return prevStatus();
    case 'pause': return pauseStatus(!v.paused);
    case 'viewers': return showStatusViewers(s);
    case 'menu': {
      pauseStatus(true);
      const r = b.getBoundingClientRect();
      showMenu(r.right - 230, r.bottom + 4, g.mine
        ? html`<button data-cmd="delete" class="danger">${icon('trash', 'i-sm')} Hapus status ini</button>`
        : html`<button data-cmd="mute">${icon(g.muted ? 'bell' : 'bellOff', 'i-sm')} ${g.muted ? 'Bunyikan' : 'Bisukan'} status ${g.user.name}</button><button data-cmd="chat">${icon('chat', 'i-sm')} Kirim pesan</button>`,
      async (cmd) => {
        try {
          if (cmd === 'delete') {
            if (!(await confirmDialog('Hapus status?', 'Status ini akan dihapus untuk semua yang dapat melihatnya.', 'Hapus', true))) return pauseStatus(false);
            await api('DELETE', `/statuses/${s.id}`);
            g.statuses.splice(v.si, 1);
            S.statusFeed.mine = g.statuses;
            toast('Status dihapus.');
            if (!g.statuses.length) return closeStatusViewer();
            v.si = Math.min(v.si, g.statuses.length - 1); return drawStatus();
          }
          if (cmd === 'mute') {
            S.me = (await api('POST', `/status-mutes/${g.user.id}`, { muted: !g.muted })).user;
            toast(g.muted ? 'Status dibunyikan.' : `Status ${g.user.name} dibisukan.`);
            closeStatusViewer(); return loadStatuses();
          }
          if (cmd === 'chat') {
            const r2 = await api('POST', '/conversations', { type: 'direct', user_id: g.user.id });
            S.convs.set(r2.conversation.id, r2.conversation);
            closeStatusViewer(); setView('chats'); return openConversation(r2.conversation.id);
          }
        } catch (err) { toast(err.message, { error: true }); pauseStatus(false); }
      });
      setTimeout(() => {
        const m = $('.menu'); if (!m) return;
        const obs = new MutationObserver(() => { if (!document.body.contains(m)) { obs.disconnect(); if (viewer && !$('.overlay.center')) pauseStatus(false); } });
        obs.observe(document.body, { childList: true });
      }, 0);
    }
  }
}

async function sendStatusReply(s, g, input) {
  const body = input.value.trim(); if (!body) return;
  input.disabled = true;
  try {
    const r = await api('POST', `/statuses/${s.id}/reply`, { body, client_uuid: uuid() });
    input.value = ''; input.blur();
    if (!S.convs.has(r.conversation_id)) await loadConversations();
    upsertMessage(r.message, { silent: true });
    toast(`Balasan terkirim ke ${g.user.name}.`, { action: 'Buka chat', onAction: () => { closeStatusViewer(); setView('chats'); openConversation(r.conversation_id); } });
    pauseStatus(false);
  } catch (err) { toast(err.message, { error: true }); }
  finally { input.disabled = false; }
}

async function showStatusViewers(s) {
  pauseStatus(true);
  const ov = layer('modal', 'Dilihat oleh', html`<div id="st-viewers"><div class="spinner"></div></div>`, '', { onClose: () => pauseStatus(false) });
  try {
    const r = await api('GET', `/statuses/${s.id}/viewers`);
    $('#st-viewers', ov).innerHTML = val(r.data.length
      ? r.data.map((x) => html`<div class="list-item">${avatar(x.user?.name, x.user?.avatar_url, x.user?.id)}<span class="li-body"><div class="li-title">${x.user?.name}</div><div class="li-sub">${fmtListTime(x.viewed_at)} ${fmtTime(x.viewed_at)}</div></span></div>`)
      : html`<p class="hint" style="text-align:center">Belum ada yang melihat status ini.</p>`);
  } catch (e) { $('#st-viewers', ov).innerHTML = val(html`<p class="hint">${e.message}</p>`); }
}
function updateViewerCount(statusId, count) {
  const v = viewer; if (!v) return;
  const s = v.groups[v.gi].statuses[v.si];
  if (s.id === statusId) { s.view_count = count; const el = $('#st-view-count'); if (el) el.textContent = count; }
}

/* ---------- Kutipan status di chat ---------- */
function statusQuote(r) {
  const mine = r.owner_id === myId();
  return html`<div class="quote st-quote" data-action="status-reply-open" data-sid="${r.status_id}" data-owner="${r.owner_id}">
    <span><b>${mine ? 'Status Anda' : 'Status · ' + r.owner_name}</b><span>${r.preview}</span></span>
    ${r.thumb ? html`<img src="${r.thumb}" alt="" onerror="this.remove()">` : r.type === 'text' ? html`<i class="st-swatch" style="background:${r.color || STATUS_COLORS[0]}"></i>` : ''}
  </div>`;
}
async function openStatusFromReply(statusId, ownerId) {
  if (!S.statusFeed) await loadStatuses();
  const key = ownerId === myId() ? 'me' : ownerId;
  const g = statusGroupsForViewer().find((x) => x.key === key);
  if (!g || !g.statuses.some((s) => s.id === statusId)) return toast('Status ini sudah tidak tersedia (lebih dari 24 jam atau dihapus).');
  openStatusViewer(key, statusId);
}

/* ---------- Privasi status ---------- */
function openStatusPrivacy() {
  const s = S.me.settings || {};
  let mode = s.status_privacy || 'contacts';
  const picked = new Set((s.status_list || []).map(Number));
  const contacts = new Map();
  S.convs.forEach((c) => { if (c.type === 'direct' && c.peer) contacts.set(c.peer.id, c.peer); });
  const ov = drawer('Privasi status', html`
    <p class="hint" style="margin-top:0">Siapa yang dapat melihat status yang Anda pasang berikutnya? Status yang sudah terpasang tidak berubah.</p>
    <div class="mode-cards">
      ${[['contacts', 'Kontak saya', 'Semua orang yang pernah Anda kirimi pesan.'], ['except', 'Kontak saya, kecuali…', 'Sembunyikan dari orang tertentu.'], ['only', 'Hanya bagikan dengan…', 'Hanya orang yang Anda pilih.']]
        .map(([k, t, d]) => html`<label class="mode-card"><input type="radio" name="stmode" value="${k}" ${mode === k ? 'checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`)}
    </div>
    <div id="st-pick" style="margin-top:16px"></div>`,
  html`<button class="btn btn-ghost" data-close="1">Batal</button><button class="btn" id="st-priv-save">Simpan</button>`);
  const drawPick = () => {
    const box = $('#st-pick', ov);
    if (mode === 'contacts') { box.innerHTML = ''; return; }
    box.innerHTML = val(html`
      <p class="section-title">${mode === 'except' ? 'Sembunyikan status dari' : 'Bagikan status hanya dengan'} (${picked.size})</p>
      ${contacts.size ? [...contacts.values()].map((u) => html`<button class="list-item" data-pick="${u.id}">${userRow(u, html`<span class="check ${picked.has(u.id) ? 'on' : ''}">${icon('check', 'i-xs')}</span>`)}</button>`)
        : html`<p class="hint">Belum ada kontak. Kirim pesan ke seseorang terlebih dahulu.</p>`}`);
  };
  ov.querySelectorAll('input[name="stmode"]').forEach((r) => r.onchange = () => { mode = r.value; drawPick(); });
  $('#st-pick', ov).addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    const id = Number(b.dataset.pick); picked.has(id) ? picked.delete(id) : picked.add(id); drawPick();
  });
  $('#st-priv-save', ov).onclick = async () => {
    if (mode === 'only' && !picked.size) return toast('Pilih minimal satu kontak.', { error: true });
    if (await saveMe({ settings: { status_privacy: mode, status_list: [...picked] } })) {
      toast('Privasi status disimpan.'); ov.close(); loadStatuses();
    }
  };
  drawPick();
}

/* =========================================================
   REAL-TIME (Laravel Reverb via protokol Pusher)
   ========================================================= */
let pusher = null, pollTimer = null, convRefreshTimer = null, syncing = false;
const convChannels = new Map();

function connectRealtime() {
  stopRealtime();
  const r = CFG.realtime;
  if (!r || !r.key || !window.Pusher) { startPolling(); return; }
  const tls = r.scheme === 'https';
  pusher = new window.Pusher(r.key, {
    cluster: 'mt1', wsHost: r.host, wsPort: r.port, wssPort: r.port, forceTLS: tls,
    enabledTransports: ['ws', 'wss'], disableStats: true, activityTimeout: 30000,
    channelAuthorization: {
      customHandler: async ({ socketId, channelName }, cb) => {
        try { cb(null, await api('POST', '/api/broadcasting/auth', { socket_id: socketId, channel_name: channelName }, { raw: true })); }
        catch (e) { cb(e, null); }
      },
    },
  });
  let fallbackTimer = setTimeout(() => { if (S.rt !== 'connected') startPolling(); }, 6000);
  pusher.connection.bind('state_change', ({ current }) => {
    if (current === 'connected') {
      clearTimeout(fallbackTimer);
      const was = S.rt; S.rt = 'connected'; stopPolling(); renderBanners();
      if (was !== 'connected') syncNow();
    } else if (['unavailable', 'failed', 'disconnected'].includes(current)) {
      if (navigator.onLine) startPolling(); else { S.rt = 'offline'; renderBanners(); }
    }
  });
  const ch = pusher.subscribe('private-user.' + myId());
  ch.bind('chat', onChatEvent);
  const pres = pusher.subscribe('presence-online');
  pres.bind('pusher:subscription_succeeded', (members) => { S.online = new Set(Object.keys(members.members).map(Number)); refreshPresence(); });
  pres.bind('pusher:member_added', (m) => { S.online.add(Number(m.id)); refreshPresence(); });
  pres.bind('pusher:member_removed', (m) => { S.online.delete(Number(m.id)); refreshPresence(); });
  sortedConvs().slice(0, 40).forEach((c) => subscribeConversation(c.id));
}
function refreshPresence() { renderList(); renderHead(); }
function stopRealtime() {
  stopPolling();
  convChannels.clear();
  try { pusher?.disconnect(); } catch {}
  pusher = null;
}
function subscribeConversation(id) {
  if (!pusher || convChannels.has(id)) return;
  const ch = pusher.subscribe('private-conversation.' + id);
  ch.bind('client-typing', (d) => {
    if (d.user_id === myId()) return;
    if (!S.typing.has(id)) S.typing.set(id, new Map());
    S.typing.get(id).set(d.user_id, { name: d.name, until: Date.now() + 4500 });
    renderList(); if (S.activeId === id) renderHead();
    setTimeout(() => { renderList(); if (S.activeId === id) renderHead(); }, 4600);
  });
  convChannels.set(id, ch);
}
let lastTyping = 0;
function sendTyping() {
  if (!pusher || Date.now() - lastTyping < 2500) return;
  const ch = convChannels.get(S.activeId);
  if (ch?.subscribed) { lastTyping = Date.now(); try { ch.trigger('client-typing', { user_id: myId(), name: S.me.name }); } catch {} }
}

function startPolling() {
  if (pollTimer) return;
  if (S.rt !== 'offline') S.rt = 'polling';
  renderBanners();
  pollTimer = setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 4000);
  convRefreshTimer = setInterval(() => { if (document.visibilityState === 'visible') loadConversations(); }, 20000);
}
function stopPolling() { clearInterval(pollTimer); clearInterval(convRefreshTimer); pollTimer = convRefreshTimer = null; }

async function syncNow() {
  if (syncing || !S.me) return; syncing = true;
  try {
    let more = true, guard = 0;
    while (more && guard++ < 10) {
      const r = await api('GET', '/sync?after=' + S.cursor);
      for (const m of r.messages) {
        if (!S.convs.has(m.conversation_id)) { await loadConversations(); }
        upsertMessage(m, { silent: r.messages.length > 20 });
      }
      S.cursor = Math.max(S.cursor, r.cursor);
      more = r.has_more;
    }
    if (S.rt === 'offline' && navigator.onLine) { S.rt = pusher?.connection.state === 'connected' ? 'connected' : 'polling'; renderBanners(); }
  } catch (e) { if (e.network) { S.rt = 'offline'; renderBanners(); } }
  finally { syncing = false; }
}

function onChatEvent({ type, payload }) {
  switch (type) {
    case 'message.new': upsertMessage(payload.message); break;
    case 'message.updated': {
      const m = payload.message; const st = S.msgs.get(m.conversation_id);
      if (st && st.items.some((x) => x.id === m.id)) upsertMessage(m, { silent: true });
      const c = S.convs.get(m.conversation_id); if (c?.last_message?.id === m.id) { c.last_message = m; renderList(); }
      break;
    }
    case 'conversation.updated': {
      const c = payload.conversation; const isNew = !S.convs.has(c.id);
      S.convs.set(c.id, c); subscribeConversation(c.id); persistConvs(); renderList();
      if (S.activeId === c.id) renderHead();
      if (isNew && c.type === 'group') toast(`Anda ditambahkan ke grup "${c.title}".`);
      break;
    }
    case 'conversation.removed':
      S.convs.delete(payload.conversation_id); S.msgs.delete(payload.conversation_id);
      if (S.activeId === payload.conversation_id) closeChat(); else renderList();
      break;
    case 'receipt': {
      const c = S.convs.get(payload.conversation_id); if (!c) break;
      if (payload.user_id === myId()) {
        c.last_read_message_id = payload.own_last_read_message_id ?? c.last_read_message_id;
        if ((c.last_message?.id || 0) <= c.last_read_message_id) c.unread_count = 0;
      } else {
        const m = c.members.find((x) => x.user?.id === payload.user_id);
        if (m) { m.last_read_message_id = payload.last_read_message_id; m.last_delivered_message_id = payload.last_delivered_message_id; }
      }
      renderList();
      if (S.activeId === c.id) renderMessages();
      break;
    }
    case 'device.revoked':
      if (S.device && payload.device_id === S.device.id) onSignedOut('Perangkat ini telah diputus dari akun Anda.');
      break;
    case 'status.new':
    case 'status.deleted':
      reloadStatuses();
      break;
    case 'status.viewed': {
      const mine = S.statusFeed?.mine?.find((x) => x.id === payload.status_id);
      if (mine) { mine.view_count = payload.view_count; if (S.view === 'status') renderStatusList(); updateViewerCount(payload.status_id, payload.view_count); }
      break;
    }
    case 'device.linked': {
      const dl = $('#device-list'); if (dl) loadDevices(dl.closest('.overlay'));
      if (S.device && payload.device?.id === S.device.id) break;
      toast(`Perangkat baru ditautkan: ${payload.device?.name}. Jika bukan Anda, putuskan di Pengaturan.`, { duration: 8000, action: 'Lihat', onAction: () => openSettings('devices') });
      break;
    }
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.me) { markRead(); if (S.rt !== 'connected') syncNow(); }
});

/* =========================================================
   Aksi global (delegasi klik)
   ========================================================= */
const actions = {
  'auth-link': () => renderAuthLink(),
  open: (el) => { if (Number(el.dataset.id) === S.activeId && !isMobile()) return; openConversation(Number(el.dataset.id)); },
  filter: (el) => { S.filter = el.dataset.filter; if (S.view !== 'chats') setView('chats'); else renderList(); if (isMobile() && S.activeId) closeChat(); },
  view: (el) => setView(el.dataset.view),
  'status-text': () => openStatusTextComposer(),
  'status-media': () => $('#status-file')?.click(),
  'status-privacy': () => openStatusPrivacy(),
  'status-open': (el) => openStatusViewer(el.dataset.uid === 'me' ? 'me' : Number(el.dataset.uid)),
  'status-reply-open': (el) => openStatusFromReply(Number(el.dataset.sid), Number(el.dataset.owner)),
  'new-chat': () => openNewChat(),
  'new-group': () => openNewGroup(),
  settings: () => openSettings(),
  'settings-devices': () => openSettings('devices'),
  install: () => installApp(),
  'dismiss-install': () => { store.set('install-dismissed', true); renderBanners(); },
  'dismiss-notif': () => { store.set('notif-dismissed', true); renderBanners(); },
  'enable-notif': async () => {
    if (!('Notification' in window)) return toast('Browser ini tidak mendukung notifikasi.', { error: true });
    const p = await Notification.requestPermission();
    toast(p === 'granted' ? 'Notifikasi aktif.' : 'Notifikasi tidak diizinkan.');
    renderBanners();
  },
  'close-chat': () => { if (history.state?.chat) history.back(); else closeChat(); },
  info: () => openInfo(activeConv()),
  'conv-menu': (el) => { const r = el.getBoundingClientRect(); openConvMenu(r.right - 220, r.bottom + 4); },
  'chat-search': () => openChatSearch(),
  'close-search': () => closeSearch(),
  'search-prev': () => stepSearch(),
  'load-older': () => { const f = msgState(S.activeId).items.find((m) => m.id); if (f) loadMessages(S.activeId, f.id); },
  'scroll-bottom': () => { scrollToBottom(); markRead(); },
  send: () => submitComposer(),
  attach: () => $('#file-input')?.click(),
  'remove-file': (el) => { S.files.splice(Number(el.dataset.i), 1); renderComposerExtra(); },
  'cancel-extra': () => { const wasEdit = !!S.editing; S.reply = null; S.editing = null; if (wasEdit) { const t = $('#composer-input'); t.value = ''; t.style.height = 'auto'; } renderComposerExtra(); },
  emoji: (el) => {
    if ($('.emoji-pop')) return closeMenu();
    const pop = document.createElement('div');
    pop.className = 'emoji-pop';
    pop.innerHTML = val(html`<div class="emoji-grid">${EMOJI.map((e) => html`<button type="button">${e}</button>`)}</div>`);
    $('#composer-wrap').style.position = 'relative';
    $('#composer-wrap').append(pop);
    pop.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const ta = $('#composer-input'); const pos = ta.selectionStart ?? ta.value.length;
      ta.value = ta.value.slice(0, pos) + b.textContent + ta.value.slice(ta.selectionEnd ?? pos);
      ta.selectionStart = ta.selectionEnd = pos + b.textContent.length;
      ta.dispatchEvent(new Event('input')); ta.focus();
    };
  },
  'rec-cancel': () => { if (rec) { rec.cancel = true; rec.mr.stop(); } },
  'rec-send': () => { if (rec) rec.mr.stop(); },
  'voice-play': (el) => playVoice(el.closest('.voice')),
  'voice-seek': (el, e) => {
    const box = el.closest('.voice');
    if (currentAudio?.box !== box) return playVoice(box);
    const r = el.getBoundingClientRect(); const p = (e.clientX - r.left) / r.width;
    if (isFinite(currentAudio.duration)) currentAudio.currentTime = p * currentAudio.duration;
  },
  lightbox: (el, e) => {
    const m = messageFromEl(el); if (!m) return;
    const items = (m.attachments || []).filter((a) => /^(image|video)\//.test(a.mime));
    openLightbox(items, Number(e.target.dataset.idx || 0));
  },
  'quick-reply': (el) => { const m = messageFromEl(el); if (m) { S.reply = m; S.editing = null; renderComposerExtra(); $('#composer-input')?.focus(); } },
  'msg-menu': (el, e) => {
    if (el.dataset.ctx && !isMobile()) return; // klik biasa pada gelembung tidak membuka menu di desktop
    if (e.target.closest('a, .quote, .media, .voice, .reaction')) return;
    const m = messageFromEl(el); const r = el.getBoundingClientRect();
    openMessageMenu(m, Math.min(r.left, innerWidth - 240), r.bottom + 4);
  },
  react: (el) => { const m = messageFromEl(el); if (m) react(m, el.dataset.emoji); },
  jump: (el) => jumpTo(Number(el.dataset.target)),
  retry: (el) => { const m = findMsg(S.activeId, el.dataset.cuid); if (m) { m._failed = false; renderMessages(); deliver(S.activeId, m); } },
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu') && !e.target.closest('.emoji-pop') && !e.target.closest('[data-action="emoji"]')) closeMenu();
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) { fn(el, e); }
});
document.addEventListener('contextmenu', (e) => {
  const b = e.target.closest('.msg .bubble');
  if (!b || e.target.closest('a')) return;
  e.preventDefault();
  openMessageMenu(messageFromEl(b), e.clientX, e.clientY);
});
// Tekan lama (sentuh) membuka menu pesan
let pressTimer = null;
document.addEventListener('touchstart', (e) => {
  const b = e.target.closest('.msg .bubble'); if (!b) return;
  pressTimer = setTimeout(() => { const t = e.touches[0]; navigator.vibrate?.(15); openMessageMenu(messageFromEl(b), t.clientX - 100, t.clientY + 10); }, 480);
}, { passive: true });
['touchend', 'touchmove', 'touchcancel'].forEach((ev) => document.addEventListener(ev, () => clearTimeout(pressTimer), { passive: true }));

document.addEventListener('keydown', (e) => {
  if (viewer && !e.target.closest('input, textarea') && !$('.overlay.center, .menu')) {
    if (e.key === 'ArrowRight') return nextStatus();
    if (e.key === 'ArrowLeft') return prevStatus();
    if (e.key === ' ') { e.preventDefault(); return pauseStatus(!viewer.paused); }
  }
  if (e.key === 'Escape') {
    if ($('.menu, .emoji-pop')) return closeMenu();
    const top = [...$$('.overlay, .lightbox')].pop();
    if (top) return top.close ? top.close() : top.remove();
    if (S.activeId && isMobile()) actions['close-chat']();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S.me) { e.preventDefault(); $('#conv-search')?.focus(); }
});
window.addEventListener('popstate', () => {
  const top = [...$$('.overlay, .lightbox')].pop();
  if (top) { top.close ? top.close() : top.remove(); return; }
  if (S.activeId && isMobile()) closeChat();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme(store.get('theme', 'system')));
setInterval(() => { if (S.me && S.activeId) renderHead(); }, 60000);

console.info('%cAlmara Chat%c ' + SIGNATURE, 'font-weight:800;color:#D9A441', 'color:#888');
boot();
