const CACHE_NAME = 'reverie-v1';
const OFFLINE_URLS = [
  '/',
  '/css/styles.css',
  '/js/app.js',
  '/js/three-avatar.js',
  '/js/voice.js',
  '/js/exercises.js',
  '/js/achievements.js',
  '/js/notifications.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'You appear to be offline. Your data is safe.' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.notification.data?.action || 'dashboard';
  const urlMap = {
    checkin: '/#checkin',
    habits: '/#habits',
    reflect: '/#reflect',
    companion: '/#companion',
    dashboard: '/'
  };

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'navigate', view: action });
          return;
        }
      }
      return clients.openWindow(urlMap[action] || '/');
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Your sanctuary awaits.',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    vibrate: [100, 50, 100],
    data: { action: data.action || 'dashboard' },
    actions: data.actions || [],
    tag: data.tag || 'reverie-notification',
    renotify: true,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Reverie', options)
  );
});
