/**
 * Offline sync service for the Poll City Canvasser app.
 *
 * All mutations (interactions, contact updates) are written to a local queue
 * first, then synced to the server when connectivity is available.
 *
 * Uses AsyncStorage for the queue and NetInfo for connectivity detection.
 *
 * Architecture:
 *   1. `enqueue()` — add a mutation to the local queue
 *   2. `processQueue()` — attempt to send all pending mutations in FIFO order
 *   3. Automatic trigger on online/offline transition
 *   4. Exponential backoff on server errors (max 5 retries)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { apiFetch } from "./api";
import type { PendingMutation, SyncStatus } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUEUE_KEY = "@poll_city_sync_queue";
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1_000;

// ---------------------------------------------------------------------------
// Queue persistence
// ---------------------------------------------------------------------------

async function loadQueue(): Promise<PendingMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingMutation[];
  } catch {
    return [];
  }
}

async function saveQueue(queue: PendingMutation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let processing = false;
let unsubscribeNetInfo: (() => void) | null = null;
let listeners: Array<(queue: PendingMutation[]) => void> = [];

/**
 * Add a mutation to the offline queue and attempt immediate sync.
 */
export async function enqueue(
  endpoint: string,
  method: PendingMutation["method"],
  payload: unknown,
): Promise<PendingMutation> {
  const mutation: PendingMutation = {
    id: generateId(),
    endpoint,
    method,
    payload: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: "pending",
  };

  const queue = await loadQueue();
  queue.push(mutation);
  await saveQueue(queue);
  notifyListeners(queue);

  // Fire-and-forget sync attempt
  processQueue().catch(() => {});

  return mutation;
}

/**
 * Process all pending mutations in FIFO order.
 * Stops on the first failure to preserve ordering guarantees.
 */
export async function processQueue(): Promise<void> {
  if (processing) return;

  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  processing = true;

  try {
    const queue = await loadQueue();
    let modified = false;

    for (const mutation of queue) {
      if (mutation.status === "synced") continue;
      if (mutation.status === "failed" && mutation.retryCount >= MAX_RETRIES) continue;

      mutation.status = "syncing";
      modified = true;
      await saveQueue(queue);
      notifyListeners(queue);

      try {
        await apiFetch(mutation.endpoint, {
          method: mutation.method,
          body: JSON.parse(mutation.payload),
        });
        mutation.status = "synced";
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;

        if (status && status >= 400 && status < 500) {
          // Client error — do not retry, mark failed
          mutation.status = "failed";
          mutation.retryCount = MAX_RETRIES;
          mutation.errorMessage =
            err instanceof Error ? err.message : "Client error";
        } else {
          // Server / network error — retry with backoff
          mutation.retryCount += 1;
          mutation.status =
            mutation.retryCount >= MAX_RETRIES ? "failed" : "pending";
          mutation.errorMessage =
            err instanceof Error ? err.message : "Unknown error";

          // Stop processing on transient errors to preserve order
          await saveQueue(queue);
          notifyListeners(queue);
          break;
        }
      }

      await saveQueue(queue);
      notifyListeners(queue);
    }

    // Prune synced mutations older than 24 hours
    if (modified) {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const pruned = queue.filter(
        (m) =>
          m.status !== "synced" ||
          new Date(m.createdAt).getTime() > cutoff,
      );
      if (pruned.length !== queue.length) {
        await saveQueue(pruned);
        notifyListeners(pruned);
      }
    }
  } finally {
    processing = false;
  }
}

/**
 * Get the current queue state.
 */
export async function getQueue(): Promise<PendingMutation[]> {
  return loadQueue();
}

/**
 * Get a summary of the queue for UI display.
 */
export async function getQueueStats(): Promise<{
  pending: number;
  syncing: number;
  failed: number;
  total: number;
}> {
  const queue = await loadQueue();
  const active = queue.filter((m) => m.status !== "synced");
  return {
    pending: active.filter((m) => m.status === "pending").length,
    syncing: active.filter((m) => m.status === "syncing").length,
    failed: active.filter((m) => m.status === "failed").length,
    total: active.length,
  };
}

/**
 * Clear all synced mutations from the queue.
 */
export async function clearSynced(): Promise<void> {
  const queue = await loadQueue();
  const remaining = queue.filter((m) => m.status !== "synced");
  await saveQueue(remaining);
  notifyListeners(remaining);
}

/**
 * Retry all failed mutations (reset their retry count).
 */
export async function retryFailed(): Promise<void> {
  const queue = await loadQueue();
  for (const m of queue) {
    if (m.status === "failed") {
      m.status = "pending";
      m.retryCount = 0;
      m.errorMessage = undefined;
    }
  }
  await saveQueue(queue);
  notifyListeners(queue);
  processQueue().catch(() => {});
}

/**
 * Subscribe to queue changes. Returns an unsubscribe function.
 */
export function onQueueChange(
  listener: (queue: PendingMutation[]) => void,
): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/**
 * Start listening for connectivity changes and auto-sync.
 * Call once at app startup.
 */
export function startSyncService(): void {
  if (unsubscribeNetInfo) return;

  unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
    if (state.isConnected) {
      processQueue().catch(() => {});
    }
  });

  // Initial sync attempt
  processQueue().catch(() => {});
}

/**
 * Stop the sync service. Call on logout or app teardown.
 */
export function stopSyncService(): void {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function notifyListeners(queue: PendingMutation[]): void {
  for (const listener of listeners) {
    try {
      listener(queue);
    } catch {
      // Swallow listener errors
    }
  }
}

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Calculate exponential backoff delay for a mutation.
 */
export function getBackoffDelay(retryCount: number): number {
  return Math.min(
    BASE_BACKOFF_MS * Math.pow(2, retryCount),
    30_000, // Cap at 30 seconds
  );
}
