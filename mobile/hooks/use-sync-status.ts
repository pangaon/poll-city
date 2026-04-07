/**
 * Hook that subscribes to the offline sync queue and exposes stats
 * to UI components (e.g., the sync badge on the walk list header).
 */

import { useCallback, useEffect, useState } from "react";
import {
  getQueueStats,
  onQueueChange,
  processQueue,
  retryFailed,
} from "../lib/sync";
import type { PendingMutation } from "../lib/types";

interface SyncStats {
  pending: number;
  syncing: number;
  failed: number;
  total: number;
}

export function useSyncStatus() {
  const [stats, setStats] = useState<SyncStats>({
    pending: 0,
    syncing: 0,
    failed: 0,
    total: 0,
  });

  useEffect(() => {
    // Initial load
    getQueueStats().then(setStats).catch(() => {});

    // Subscribe to changes
    const unsubscribe = onQueueChange((_queue: PendingMutation[]) => {
      getQueueStats().then(setStats).catch(() => {});
    });

    return unsubscribe;
  }, []);

  const forceSync = useCallback(() => {
    processQueue().catch(() => {});
  }, []);

  const retryAllFailed = useCallback(() => {
    retryFailed().catch(() => {});
  }, []);

  return { ...stats, forceSync, retryAllFailed };
}
