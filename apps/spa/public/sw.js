self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      await self.clients.claim();

      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await Promise.all(
        clients.map(async (client) => {
          try {
            await client.navigate(client.url);
          } catch {
            // Ignore navigate failures; unregister still proceeds.
          }
        })
      );

      await self.registration.unregister();
    })()
  );
});

self.addEventListener('fetch', () => {
  // Intentionally no-op. This worker exists only to clear old caches and unregister itself.
});
