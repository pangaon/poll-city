"use client";
/**
 * PwaRegister — mounts once in the root layout.
 * Handles: service worker registration, install prompts (Android + iOS),
 * push notification subscription, visit tracking, SW update detection.
 */
import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ── Service worker registration ────────────────────────────────────────
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Check for updates periodically
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New SW available — notify user (silent refresh for now)
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
        })
        .catch(() => {
          // SW registration failed — app works without it
        });
    }

    // ── Visit counter (for iOS prompt timing) ─────────────────────────────
    const visits = parseInt(localStorage.getItem("pc-visits") || "0") + 1;
    localStorage.setItem("pc-visits", String(visits));

    // ── iOS "Add to Home Screen" prompt after 3rd visit ───────────────────
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const iOSDismissed = localStorage.getItem("pc-ios-prompt-dismissed");

    if (isIOS && !isStandalone && visits >= 3 && !iOSDismissed) {
      setShowIosBanner(true);
    }

    // ── Android "Add to Home Screen" native prompt ─────────────────────────
    const androidDismissed = localStorage.getItem("pc-android-prompt-dismissed");

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!androidDismissed) setShowAndroidBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // ── Push notification subscription ────────────────────────────────────
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (vapidKey && "serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          const existing = await reg.pushManager.getSubscription();
          if (!existing) {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
            });
            await fetch("/api/notifications/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subscription: sub }),
            });
          }
        } catch {
          // Push not supported or user denied — not critical
        }
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("pc-android-prompt-dismissed", "1");
    }
    setDeferredPrompt(null);
    setShowAndroidBanner(false);
  }

  function dismissAndroid() {
    localStorage.setItem("pc-android-prompt-dismissed", "1");
    setShowAndroidBanner(false);
  }

  function dismissIos() {
    localStorage.setItem("pc-ios-prompt-dismissed", "1");
    setShowIosBanner(false);
  }

  return (
    <>
      {/* Android install banner */}
      {showAndroidBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-[200] bg-blue-700 text-white px-4 py-3 flex items-center gap-3 shadow-2xl">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Install Poll City</p>
            <p className="text-blue-200 text-xs">Add to home screen for offline canvassing</p>
          </div>
          <button
            onClick={handleAndroidInstall}
            className="bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
          >
            Install
          </button>
          <button onClick={dismissAndroid} className="text-blue-300 hover:text-white p-1" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* iOS install instructions */}
      {showIosBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-[200] bg-blue-700 text-white rounded-t-2xl px-5 py-5 shadow-2xl">
          <button
            onClick={dismissIos}
            className="absolute top-3 right-3 text-blue-300 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="font-bold">Install Poll City</p>
              <p className="text-blue-200 text-xs">Offline canvassing on your iPhone</p>
            </div>
          </div>
          <p className="text-sm text-blue-100 leading-relaxed">
            Tap{" "}
            <span className="inline-flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded font-medium">
              <Share className="w-3.5 h-3.5" /> Share
            </span>{" "}
            then <strong>&quot;Add to Home Screen&quot;</strong> to install Poll City and use it offline.
          </p>
        </div>
      )}
    </>
  );
}

// ── VAPID key helper ──────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}
