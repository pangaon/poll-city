/**
 * IndexedDB helpers for Poll City offline canvassing support.
 * Used by client components (not the service worker, which has its own inline copy).
 */

const DB_NAME = 'poll-city-db';
const DB_VERSION = 1;

export interface SyncQueueItem {
  id?: number;
  url: string;
  method: string;
  body: unknown;
  createdAt: number;
  label?: string; // human-readable description for UI
}

export interface WalkCacheEntry {
  cacheKey: string;
  data: unknown;
  savedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        const s = db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('walk-cache')) {
        db.createObjectStore('walk-cache', { keyPath: 'cacheKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

// ── Sync Queue ────────────────────────────────────────────────────────────────

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt'>): Promise<number> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync-queue', 'readwrite');
    const req = tx.objectStore('sync-queue').add({ ...item, createdAt: Date.now() });
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync-queue', 'readonly');
    const req = tx.objectStore('sync-queue').getAll();
    req.onsuccess = () => resolve(req.result as SyncQueueItem[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSyncQueueItem(id: number): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync-queue', 'readwrite');
    const req = tx.objectStore('sync-queue').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync-queue', 'readonly');
    const req = tx.objectStore('sync-queue').count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync-queue', 'readwrite');
    const req = tx.objectStore('sync-queue').clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Walk List Cache ───────────────────────────────────────────────────────────

export async function cacheWalkList(campaignId: string, data: unknown): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('walk-cache', 'readwrite');
    const req = tx.objectStore('walk-cache').put({ cacheKey: `walk-${campaignId}`, data, savedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedWalkList(campaignId: string): Promise<WalkCacheEntry | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('walk-cache', 'readonly');
    const req = tx.objectStore('walk-cache').get(`walk-${campaignId}`);
    req.onsuccess = () => resolve((req.result as WalkCacheEntry) ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ── Queue via Service Worker message (preferred path) ─────────────────────────

/**
 * Sends a request to the SW to queue it for background sync.
 * Falls back to direct IDB add if SW messaging fails.
 */
export async function queueViaServiceWorker(item: Omit<SyncQueueItem, 'id' | 'createdAt'>): Promise<void> {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'QUEUE_REQUEST',
      data: item,
    });
  } else {
    // Fallback: add directly to IDB; SW will pick it up when registered
    await addToSyncQueue(item);
    // Try to register background sync directly
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register('pc-canvass-sync');
      } catch {
        // Not supported
      }
    }
  }
}
