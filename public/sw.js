const CACHE_NAME = 'nightmatch-v2';

// Core shell assets to pre-cache
const PRECACHE = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// Install — cache core shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activate — remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - JS/CSS/fonts: stale-while-revalidate
// - Images: cache-first
// - Firebase/API: network-only
// - HTML: network-first with offline fallback
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip Firebase and external API calls
  if (url.hostname.includes('firestore') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('randomuser.me')) {
    return; // let it go to network directly
  }

  // JS/CSS assets (hashed filenames) — stale-while-revalidate
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request).then(res => {
          cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || networkPromise;
      })
    );
    return;
  }

  // Images — cache-first
  if (request.destination === 'image') {
    e.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        return fetch(request).then(res => {
          cache.put(request, res.clone());
          return res;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // HTML — network-first, offline fallback to index.html
  e.respondWith(
    fetch(request)
      .catch(() => caches.match('/index.html'))
  );
});

// Push notifications
self.addEventListener('push', e => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'NightMatch 🌙', body: e.data.text() }; }
  e.waitUntil(
    self.registration.showNotification(data.title || 'NightMatch 🌙', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(all => {
      for (const client of all) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
