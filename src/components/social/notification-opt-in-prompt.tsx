"use client";
import { useState } from "react";
import { Bell, BellOff, X, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Props {
  campaignId: string;
  candidateName: string;
  onDismiss: () => void;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

async function getOrCreatePushSubscription(): Promise<{
  endpoint: string;
  keys: { p256dh: string; auth: string };
} | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const p256dh = btoa(
    String.fromCharCode(...Array.from(new Uint8Array(sub.getKey("p256dh")!)))
  );
  const auth = btoa(
    String.fromCharCode(...Array.from(new Uint8Array(sub.getKey("auth")!)))
  );

  return { endpoint: sub.endpoint, keys: { p256dh, auth } };
}

export default function NotificationOptInPrompt({
  campaignId,
  candidateName,
  onDismiss,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleOptIn() {
    if (!("Notification" in window)) {
      toast.error("Your browser doesn't support push notifications");
      onDismiss();
      return;
    }

    setLoading(true);
    try {
      const subscription = await getOrCreatePushSubscription();
      if (!subscription) {
        toast.info("Notification permission not granted. You can enable this later from your profile.");
        onDismiss();
        return;
      }

      const res = await fetch("/api/social/notification-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, subscription }),
      });

      if (res.ok) {
        toast.success(`You'll receive election reminders from ${candidateName}!`);
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Could not save notification preference");
      }
    } catch (err) {
      console.error("Notification opt-in error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      onDismiss();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-blue-600 px-5 pt-5 pb-4 text-white relative">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <Bell className="w-7 h-7 mb-2 opacity-90" />
          <h2 className="font-bold text-base leading-snug">
            Get election day reminders from {candidateName}?
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            We'll notify you where to vote and when polls close.
          </p>

          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              What you'll receive
            </p>
            <div className="space-y-1">
              <div className="flex items-start gap-1.5 text-xs text-gray-700">
                <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                Where to vote on election day
              </div>
              <div className="flex items-start gap-1.5 text-xs text-gray-700">
                <Bell className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                Poll closing time reminders
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            You can unsubscribe at any time from your{" "}
            <a href="/social/profile" className="text-blue-600 underline underline-offset-2">
              profile
            </a>
            .
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold active:scale-95 transition-all"
          >
            Maybe later
          </button>
          <button
            onClick={handleOptIn}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4" />
            {loading ? "Saving…" : "Yes, notify me"}
          </button>
        </div>
      </div>
    </div>
  );
}
