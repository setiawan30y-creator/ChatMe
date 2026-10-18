/*!
 * Almara Chat — Service Worker (PWA)
 * Shell di-cache agar aplikasi terbuka cepat & tetap tampil saat offline.
 * Data API tidak pernah di-cache (privasi & konsistensi).
 * @2026-Alifiandra
 */
const VERSION = 'chatme-v1.0.0';
const SHELL = ['/', '/offline', '/css/chatme.css', '/js/chatme.js', '/vendor/pusher.min.js', '/icons/icon-192.png', '/icons/icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Jangan pernah cache API, broadcasting, atau lampiran privat.
  if (url.origin === location.origin && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/broadcasting'))) return;

  // Navigasi: network-first, fallback ke shell / halaman offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put('/', copy));
        return res;
      }).catch(async () => (await caches.match('/')) || caches.match('/offline'))
    );
    return;
  }

  // Aset statis milik sendiri: stale-while-revalidate.
  if (url.origin === location.origin && /\.(css|js|png|svg|ico|webmanifest)$|manifest\.webmanifest$/.test(url.pathname)) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(req, { ignoreSearch: true });
        const network = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Font Google: cache-first.
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(VERSION + '-fonts').then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if (new URL(client.url).origin === location.origin) {
        await client.focus();
        if (data.conversation_id) client.postMessage({ open: data.conversation_id });
        return;
      }
    }
    await self.clients.openWindow(data.url || '/');
  })());
});

// Disiapkan untuk Web Push (fase berikutnya).
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(self.registration.showNotification(d.title || 'Almara Chat', {
    body: d.body || 'Anda menerima pesan baru',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: d.tag || 'chatme',
    data: d.data || {},
  }));
});
