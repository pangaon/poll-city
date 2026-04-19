"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Phone, Mail, Calendar } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", role: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/marketing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, name: form.name, role: form.role }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Try again.");
        setStatus("error");
      } else {
        setStatus("done");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Poll City
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left: Copy */}
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">Talk to a Strategist</p>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-6">
              Running for mayor?
              <span className="block text-blue-600">Let&apos;s talk.</span>
            </h1>
            <p className="text-slate-600 leading-relaxed mb-8">
              The Command tier is designed for mayors, MPPs, and incumbents running serious campaigns.
              Before you commit, talk to George directly — 35 years in Canadian politics, no sales pitch.
            </p>

            <div className="space-y-5 mb-10">
              {[
                {
                  icon: Calendar,
                  title: "30-minute strategy call",
                  desc: "We review your riding, your timeline, and what you actually need to win.",
                  color: "text-blue-600 bg-blue-50",
                },
                {
                  icon: Phone,
                  title: "No pressure",
                  desc: "If Poll City isn't right for your campaign, George will tell you that too.",
                  color: "text-emerald-600 bg-emerald-50",
                },
                {
                  icon: Mail,
                  title: "Fast response",
                  desc: "You'll hear back within one business day.",
                  color: "text-amber-600 bg-amber-50",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-5">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Not ready for a call?</p>
              <p className="text-sm text-slate-600">
                Start a free trial instead —{" "}
                <Link href="/pricing" className="text-blue-600 font-semibold hover:underline">
                  see pricing
                </Link>
                , no credit card required.
              </p>
            </div>
          </div>

          {/* Right: Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            {status === "done" ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2">Got it — you&apos;re on the list.</h2>
                <p className="text-slate-500 text-sm mb-6">George will be in touch within one business day.</p>
                <Link href="/" className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors">
                  Back to Poll City
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Your name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Jane Smith"
                    required
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="jane@example.com"
                    required
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Your role</label>
                  <select
                    value={form.role}
                    onChange={set("role")}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select your role</option>
                    <option value="mayor">Running for Mayor</option>
                    <option value="mpp">Running for MPP / MLA / MNA</option>
                    <option value="mp">Running for MP</option>
                    <option value="councillor">City Councillor</option>
                    <option value="cm">Campaign Manager</option>
                    <option value="incumbent">Incumbent seeking re-election</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Anything else? (optional)</label>
                  <textarea
                    value={form.message}
                    onChange={set("message")}
                    placeholder="Tell us about your riding, your timeline, or what you're trying to accomplish."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {status === "error" && (
                  <p className="text-sm text-red-600">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full h-12 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {status === "loading" ? "Sending…" : "Request a Call"}
                </button>
                <p className="text-center text-xs text-slate-400">CASL-compliant. Unsubscribe any time.</p>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
