/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute, Route } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Workbox manifest type
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Clean old caches
cleanupOutdatedCaches();

// Precache static assets from build (Vite injects manifest here)
precacheAndRoute(self.__WB_MANIFEST || []);

// ============= CACHE STRATEGIES =============

// App Shell - Network First for navigation
const appShellHandler = new NetworkFirst({
  cacheName: 'app-shell',
  plugins: [
    new ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
    })
  ]
});

registerRoute(
  new NavigationRoute(appShellHandler, {
    denylist: [/\/api\//, /\/auth\//]
  })
);

// API calls - Network First with fallback
const apiHandler = new NetworkFirst({
  cacheName: 'api-cache',
  networkTimeoutSeconds: 10,
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200]
    }),
    new ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 5 * 60 // 5 minutes
    })
  ]
});

registerRoute(/\/api\/v1\//, apiHandler);

// Static assets - Cache First
registerRoute(
  /\.(?:js|css|woff2?|ttf|eot|ico|svg|png|jpg|jpeg|gif|webp|avif|wasm)$/,
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
      })
    ]
  })
);

// Google Fonts - Stale While Revalidate
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\//,
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets'
  })
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\//,
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
      })
    ]
  })
);

// Background sync for failed POST/PUT/DELETE requests
const bgSyncPlugin = new BackgroundSyncPlugin('api-queue', {
  maxRetentionTime: 24 * 60, // Retry for 24 hours
  onSync: async ({ queue }: { queue: { shiftRequest: () => Promise<{ request: Request } | undefined>; unshiftRequest: (entry: { request: Request }) => Promise<void> } }) => {
    let entry: { request: Request } | undefined;
    while ((entry = await queue.shiftRequest()) !== undefined) {
      try {
        await fetch(entry.request);
      } catch (error) {
        // Put back in queue if failed
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  }
});

// Register route for API mutations with background sync
registerRoute(
  ({ request }: { request: Request }) =>
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) &&
    /\/api\/v1\//.test(request.url),
  new NetworkFirst({
    cacheName: 'api-mutations',
    plugins: [bgSyncPlugin]
  }),
  'POST'
);

// ============= SERVICE WORKER LIFECYCLE =============

// Update prompt to user
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ============= OFFLINE FALLBACK =============

// Provide offline page for navigation failures
registerRoute(
  new Route(
    ({ request }: { request: Request }) => request.mode === 'navigate',
    async ({ request }: { request: Request }) => {
      try {
        // Try network first
        const networkResponse = await fetch(request);
        return networkResponse;
      } catch {
        // Return offline page from cache
        const cache = await caches.open('app-shell');
        const offlinePage = await cache.match('/offline.html');
        if (offlinePage) {
          return offlinePage;
        }
        // Fallback to basic response if offline page not cached
        return new Response(
          '<html><body><h1>Offline</h1><p>Voce esta offline. Verifique sua conexao.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
    }
  )
);

// ============= PUSH NOTIFICATIONS =============

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || 'Nova notificacao',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100] as number[],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || Math.random(),
      url: data.url || '/'
    },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false
  } as NotificationOptions;

  event.waitUntil(
    self.registration.showNotification(data.title || 'CVG HIS', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = (event.notification.data as { url?: string })?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

export {};
