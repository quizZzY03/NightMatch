const CACHE_NAME = 'nightmatch-v5';

const PRECACHE = ['/', '/index.html', '/offline.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => {
        // Force all open tabs to reload so they pick up new JS bundles
        for (const client of clients) {
          client.navigate(client.url);
        }
      })
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip Firebase and external API calls — always network
  if (url.hostname.includes('firestore') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('randomuser.me')) {
    return;
  }

  // HTML — always network-first, never serve stale HTML
  if (request.destination === 'document' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match('/offline.html') ?? caches.match('/index.html'))
    );
    return;
  }

  // JS/CSS assets (hashed filenames) — network-first so new deploys are always fresh
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
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

  // Everything else — network with cache fallback
  e.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

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
