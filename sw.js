// Oxygen PWA – Service Worker
const CACHE = 'oxygen-v3';
const OFFLINE_URL = '/';

// ── INSTALL: pre-cache shell ─────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: network-first, fallback to cache ──────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match(OFFLINE_URL)))
  );
});

// ── PUSH: přijmi zprávu ze serveru a zobraz notifikaci ───────────────────────
self.addEventListener('push', e => {
  let data = { title: '🙏 Oxygen', body: 'Máš novou modlitební výzvu!', url: '/' };

  if (e.data) {
    try { data = { ...data, ...e.data.json() }; }
    catch { data.body = e.data.text(); }
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
      tag: data.tag || 'oxygen-push',
      renotify: true,
      requireInteraction: false
    })
  );
});

// ── NOTIFICATION CLICK: otevři nebo fokusnuj aplikaci ────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(all => {
      // Pokud je appka už otevřená, jen na ni přepni
      for (const client of all) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      // Jinak otevři nové okno
      return clients.openWindow(target);
    })
  );
});
