"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

const GREEN = "#1D9E75";

interface Props {
  officialId: string;
  firstName: string;
}

export default function OfficialNewsletter({ officialId, firstName }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/officials/${officialId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg((data as { error?: string }).error ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className="rounded-2xl px-6 py-5 flex flex-col items-center gap-3"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: `${GREEN}30` }}
        >
          <CheckCircle className="w-6 h-6" style={{ color: GREEN }} />
        </div>
        <div className="text-center">
          <p className="text-white font-black text-sm">You&apos;re subscribed!</p>
          <p className="text-blue-200/70 text-xs mt-1">
            You&apos;ll receive updates from {firstName} directly to your inbox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 bg-white/10 border border-white/20 text-white placeholder-blue-200/50"
          style={{ backdropFilter: "blur(8px)" }}
        />
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 bg-white/10 border border-white/20 text-white placeholder-blue-200/50"
          style={{ backdropFilter: "blur(8px)" }}
        />
      </div>

      {errorMsg && (
        <p className="text-red-300 text-xs text-center">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || !email.trim()}
        className="w-full py-3 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
        style={{ background: GREEN, boxShadow: `0 4px 20px ${GREEN}50` }}
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Subscribing…
          </>
        ) : (
          "Subscribe to updates"
        )}
      </button>
      <p className="text-xs text-blue-200/50 text-center">
        No spam. Unsubscribe any time. Managed under CASL.
      </p>
    </form>
  );
}
