// Poll City Service Worker — offline canvassing + push notifications + background sync
// v2.0

const SHELL_CACHE = 'pc-shell-v3';
const CANVASS_CACHE = 'pc-canvass-v3';
const SYNC_TAG = 'pc-canvass-sync';
const DB_NAME = 'poll-city-db';
const DB_VERSION = 1;

// Pages to precache on install
const PRECACHE_URLS = [
  '/canvassing/walk',
  '/canvassing',
  '/capture',
];

// ── IndexedDB helpers (inline — no imports in SW) ─────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        const s = db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('walk-cache')) {
        db.createObjectStore('walk-cache', { keyPath: 'cacheKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbAdd(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).add(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbCount(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Broadcast to all clients ──────────────────────────────────────────────────

async function broadcastToClients(msg) {
  const allClients = await self.clients.matchAll({ includeUncontrolled: true });
  allClients.forEach(c => c.postMessage(msg));
}

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CANVASS_CACHE).then((cache) =>
      Promise.allSettled(PRECACHE_URLS.map(url =>
        cache.add(url).catch(() => { /* skip if not available */ })
      ))
    )
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL_CACHE && k !== CANVASS_CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Skip non-GET (mutations handled client-side → background sync)
  if (req.method !== 'GET') return;

  // Next.js static chunks — cache-first
  if (url.pathname.startsWith('/_next/static')) {
    event.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }

  // Canvassing pages — stale-while-revalidate
  if (
    url.pathname.startsWith('/canvassing') ||
    url.pathname === '/capture' ||
    url.pathname === '/canvass'
  ) {
    event.respondWith(staleWhileRevalidate(req, CANVASS_CACHE));
    return;
  }

  // Contacts API (GET) — network-first, offline fallback to cache
  if (url.pathname === '/api/contacts') {
    event.respondWith(networkFirstAPI(req));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networkFetch = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || await networkFetch || new Response('Offline', { status: 503 });
}

async function networkFirstAPI(req) {
  const cache = await caches.open(CANVASS_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) {
      // Clone and inject offline flag header
      const body = await cached.json();
      return new Response(JSON.stringify({ ...body, _offline: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Served-From': 'cache' },
      });
    }
    return new Response(JSON.stringify({ data: [], _offline: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Background Sync ───────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncQueuedRequests());
  }
});

async function syncQueuedRequests() {
  let db;
  try {
    db = await openDB();
  } catch {
    return;
  }

  const items = await idbGetAll(db, 'sync-queue');
  if (!items.length) return;

  let synced = 0;
  let failed = 0;

  await broadcastToClients({ type: 'SYNC_START', total: items.length });

  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
        credentials: 'include',
      });
      if (res.ok) {
        await idbDelete(db, 'sync-queue', item.id);
        synced++;
        await broadcastToClients({ type: 'SYNC_PROGRESS', synced, total: items.length });
      } else {
        failed++;
      }
    } catch {
      failed++; // still offline or server error — will retry on next sync
    }
  }

  const remaining = await idbCount(db, 'sync-queue');
  await broadcastToClients({ type: 'SYNC_COMPLETE', synced, failed, remaining });

  if (synced > 0) {
    // Invalidate the contacts cache so next load is fresh
    const cache = await caches.open(CANVASS_CACHE);
    const keys = await cache.keys();
    for (const key of keys) {
      if (new URL(key.url).pathname === '/api/contacts') {
        await cache.delete(key);
      }
    }
  }
}

// ── Message Handler (client → SW) ────────────────────────────────────────────

self.addEventListener('message', async (event) => {
  const { type, data } = event.data || {};

  if (type === 'GET_SYNC_COUNT') {
    try {
      const db = await openDB();
      const count = await idbCount(db, 'sync-queue');
      event.source?.postMessage({ type: 'SYNC_COUNT', count });
    } catch {
      event.source?.postMessage({ type: 'SYNC_COUNT', count: 0 });
    }
  }

  if (type === 'MANUAL_SYNC') {
    syncQueuedRequests();
  }

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'QUEUE_REQUEST') {
    try {
      const db = await openDB();
      const id = await idbAdd(db, 'sync-queue', {
        url: data.url,
        method: data.method,
        body: data.body,
        createdAt: Date.now(),
      });
      const count = await idbCount(db, 'sync-queue');

      // Try to register background sync
      try {
        await self.registration.sync.register(SYNC_TAG);
      } catch {
        // Background Sync API not supported (Safari/iOS) — client will retry on reconnect
      }

      event.source?.postMessage({ type: 'QUEUED', id, count });
      await broadcastToClients({ type: 'SYNC_COUNT', count });
    } catch (err) {
      event.source?.postMessage({ type: 'QUEUE_ERROR', error: String(err) });
    }
  }
});

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Poll City', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || 'poll-city',
    renotify: !!data.tag,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: '🗳️ View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Poll City', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const notifData = event.notification.data || {};
  const urlToOpen = notifData.url || (notifData.campaignId ? '/dashboard' : '/canvassing/walk');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});

self.addEventListener('notificationclose', () => {});
