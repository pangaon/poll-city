"use client";
/**
 * OfflineIndicator — shows online/offline status + sync queue progress.
 * Mounts in the canvasser walk list. Listens to SW messages and network events.
 */
import { useEffect, useState, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle } from "lucide-react";
import { getSyncQueueCount } from "@/lib/db/indexeddb";

interface Props {
  /** Called when background sync completes so the walk list can refresh */
  onSyncComplete?: () => void;
}

type SyncState = "idle" | "syncing" | "done" | "error";

export default function OfflineIndicator({ onSyncComplete }: Props) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncedCount, setSyncedCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getSyncQueueCount();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine);
    refreshPendingCount();

    // Network events
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger manual sync via SW when we come back online
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "MANUAL_SYNC" });
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Service Worker messages
    const handleSwMessage = (event: MessageEvent) => {
      const { type, count, synced, remaining } = event.data || {};

      if (type === "SYNC_COUNT") {
        setPendingCount(count ?? 0);
      }
      if (type === "SYNC_QUEUED") {
        setPendingCount((c) => c + 1);
      }
      if (type === "SYNC_START") {
        setSyncState("syncing");
        setSyncedCount(0);
      }
      if (type === "SYNC_PROGRESS") {
        setSyncedCount(synced ?? 0);
      }
      if (type === "SYNC_COMPLETE") {
        setSyncState(synced > 0 ? "done" : "idle");
        setPendingCount(remaining ?? 0);
        if (synced > 0) {
          setSyncedCount(synced);
          onSyncComplete?.();
          setTimeout(() => setSyncState("idle"), 3000);
        }
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
      // Ask SW for current count on mount
      navigator.serviceWorker.controller?.postMessage({ type: "GET_SYNC_COUNT" });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      }
    };
  }, [refreshPendingCount, onSyncComplete]);

  // If online and no pending items and idle — show nothing (green dot still)
  const showBanner = !isOnline || pendingCount > 0 || syncState !== "idle";

  return (
    <div
      className={`transition-all duration-300 overflow-hidden ${showBanner ? "max-h-14" : "max-h-0"}`}
    >
      <div
        className={`px-4 py-2.5 flex items-center gap-3 text-sm font-medium ${
          !isOnline
            ? "bg-red-600 text-white"
            : syncState === "syncing"
            ? "bg-amber-500 text-white"
            : syncState === "done"
            ? "bg-emerald-600 text-white"
            : "bg-amber-500 text-white"
        }`}
      >
        {/* Status icon */}
        {!isOnline ? (
          <WifiOff className="w-4 h-4 flex-shrink-0" />
        ) : syncState === "syncing" ? (
          <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
        ) : syncState === "done" ? (
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
        ) : (
          <RefreshCw className="w-4 h-4 flex-shrink-0" />
        )}

        {/* Status text */}
        <span className="flex-1 min-w-0 truncate">
          {!isOnline
            ? pendingCount > 0
              ? `Offline — ${pendingCount} capture${pendingCount !== 1 ? "s" : ""} queued`
              : "Offline — changes will sync when connected"
            : syncState === "syncing"
            ? `Syncing… ${syncedCount} uploaded`
            : syncState === "done"
            ? `Synced ${syncedCount} capture${syncedCount !== 1 ? "s" : ""} ✓`
            : `${pendingCount} pending sync${pendingCount !== 1 ? "s" : ""}`}
        </span>

        {/* Sync progress bar (syncing state) */}
        {syncState === "syncing" && (
          <div className="h-1 w-20 bg-white/30 rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: "60%" }}
            />
          </div>
        )}

        {/* Manual sync button (online + pending) */}
        {isOnline && pendingCount > 0 && syncState === "idle" && (
          <button
            onClick={() => {
              if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: "MANUAL_SYNC" });
                setSyncState("syncing");
              }
            }}
            className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg flex-shrink-0 transition-colors"
          >
            Sync now
          </button>
        )}
      </div>
    </div>
  );
}

// ── Standalone online/offline dot for headers ─────────────────────────────────

export function OnlineDot() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <span
      title={isOnline ? "Online" : "Offline"}
      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOnline ? "bg-emerald-400" : "bg-red-400"}`}
    />
  );
}
