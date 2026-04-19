"use client";

import { useState } from "react";
import { BookOpen, CheckCircle2 } from "lucide-react";

export default function EmailCaptureSection() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/marketing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Try again.");
        setStatus("error");
      } else {
        setStatus("done");
      }
    } catch {
      setErrorMsg("Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return (
    <section className="py-20 bg-white border-t border-slate-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 mb-6">
          <BookOpen className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Free Resource</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
          Get the Campaign Launch Checklist
        </h2>
        <p className="mt-3 text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
          The 47-point checklist George built from 35 years of Canadian campaigns.
          What to do in week one, what kills campaigns in month two, and how to walk into election day ready.
        </p>

        {status === "done" ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <p className="font-bold text-slate-900">You&apos;re on the list.</p>
            <p className="text-sm text-slate-500">Check your inbox — the checklist is on its way.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-11 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Your role</option>
              <option value="candidate">I&apos;m a candidate</option>
              <option value="cm">Campaign manager</option>
              <option value="official">Elected official</option>
              <option value="other">Other</option>
            </select>
            <button
              type="submit"
              disabled={status === "loading"}
              className="h-11 px-6 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {status === "loading" ? "Sending…" : "Get It Free"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
        )}

        <p className="mt-4 text-xs text-slate-400">No spam. Unsubscribe any time. CASL-compliant.</p>
      </div>
    </section>
  );
}
