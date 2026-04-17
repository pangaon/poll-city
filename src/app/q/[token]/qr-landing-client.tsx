"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { QrLandingContext, QrIntent } from "@/lib/qr/types";

interface Props {
  context: QrLandingContext;
  token: string;
}

type Step = "landing" | "intent" | "capture" | "thanks" | "expired";

const INTENT_CONFIG: Record<QrIntent, { label: string; emoji: string; color: string }> = {
  support: { label: "I Support This", emoji: "✊", color: "bg-green-500" },
  keep_updated: { label: "Keep Me Updated", emoji: "📬", color: "bg-blue-500" },
  request_sign: { label: "I Want a Sign", emoji: "🪧", color: "bg-amber-500" },
  volunteer: { label: "I Want to Help", emoji: "🙋", color: "bg-purple-500" },
  more_info: { label: "Tell Me More", emoji: "💡", color: "bg-sky-500" },
  concern: { label: "I Have a Question", emoji: "💬", color: "bg-orange-500" },
  live_nearby: { label: "I Live Nearby", emoji: "🏠", color: "bg-teal-500" },
  help_at_location: { label: "Help at This Location", emoji: "📍", color: "bg-rose-500" },
  interested_in_issue: { label: "Interested in This Issue", emoji: "🔍", color: "bg-indigo-500" },
  just_browsing: { label: "Just Looking Around", emoji: "👀", color: "bg-slate-500" },
  attend_event: { label: "Attend This Event", emoji: "🎟️", color: "bg-pink-500" },
  donate: { label: "I'd Like to Donate", emoji: "💚", color: "bg-emerald-500" },
};

function getSessionToken(): string {
  const key = "pc_qr_session";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const newToken = crypto.randomUUID();
  localStorage.setItem(key, newToken);
  return newToken;
}

function buildPrimaryStyle(color: string) {
  return { backgroundColor: color, color: "#fff" };
}

export default function QrLandingClient({ context, token }: Props) {
  const { qrCode, campaign, platformBranding } = context;
  const config = qrCode.landingConfig;
  const primaryColor = campaign?.primaryColor ?? platformBranding.primaryColor;
  const logoUrl = campaign?.logoUrl ?? null;
  const candidateName = campaign?.candidateName ?? campaign?.name ?? platformBranding.name;
  const enabledIntents = config.enabledIntents ?? [
    "keep_updated",
    "support",
    "volunteer",
    "request_sign",
    "more_info",
    "just_browsing",
  ];
  const collectFields = config.collectFields ?? ["name", "email", "phone", "postal"];

  const [step, setStep] = useState<Step>(
    qrCode.status === "expired" ? "expired" : qrCode.status !== "active" ? "expired" : "landing",
  );
  const [scanId, setScanId] = useState<string | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<QrIntent | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    postal: "",
    address: "",
    note: "",
    wantSign: false,
    wantVolunteer: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Record scan on mount
  useEffect(() => {
    if (step === "expired") return;
    const sessionToken = getSessionToken();
    fetch(`/api/q/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.scanId) setScanId(data.scanId);
      })
      .catch(() => {}); // non-fatal — scan recording failure shouldn't break the page
  }, [token, step]);

  const handleIntentSelect = useCallback(
    async (intent: QrIntent) => {
      setSelectedIntent(intent);

      // Auto-set flags for relevant intents
      if (intent === "request_sign") {
        setForm((f) => ({ ...f, wantSign: true }));
      }
      if (intent === "volunteer") {
        setForm((f) => ({ ...f, wantVolunteer: true }));
      }

      // Record intent
      if (scanId) {
        fetch(`/api/q/${token}/intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scanId, intent }),
        }).catch(() => {});
      }

      // Just browsing → skip capture, go to thanks
      if (intent === "just_browsing") {
        setStep("thanks");
        return;
      }

      setStep("capture");
    },
    [scanId, token],
  );

  const handleCapture = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!scanId) return;

      setSubmitting(true);
      setError(null);

      const payload = {
        scanId,
        name: form.name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        postalCode: form.postal || undefined,
        address: form.address || undefined,
        note: form.note || undefined,
        signRequested: form.wantSign,
        volunteerInterest: form.wantVolunteer,
      };

      try {
        const res = await fetch(`/api/q/${token}/capture`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Something went wrong. Please try again.");
          return;
        }
        setStep("thanks");
      } catch {
        setError("Could not connect. Please check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [scanId, form, token],
  );

  const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

  if (step === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="text-center max-w-xs">
          <div className="text-4xl mb-4">🚧</div>
          <h1 className="text-xl font-bold text-white mb-2">This code has expired</h1>
          <p className="text-slate-400 text-sm">
            This QR code is no longer active. Contact the campaign for more information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start bg-slate-950 overflow-x-hidden"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Header bar */}
      <div
        className="w-full py-4 px-6 flex items-center gap-3 shadow-lg"
        style={{ background: primaryColor }}
      >
        {logoUrl && (
          <img
            src={logoUrl}
            alt={candidateName}
            className="h-9 w-9 rounded-full object-cover border-2 border-white/30"
          />
        )}
        <div>
          <div className="text-white font-bold text-sm leading-tight">{candidateName}</div>
          {campaign?.jurisdiction && (
            <div className="text-white/70 text-xs">{campaign.jurisdiction}</div>
          )}
        </div>
        <div className="ml-auto">
          <span className="text-[10px] text-white/50 uppercase tracking-wider">Poll City</span>
        </div>
      </div>

      <div className="w-full max-w-sm mx-auto px-4 pt-6 pb-20">
        <AnimatePresence mode="wait">

          {/* STEP: Landing */}
          {step === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={spring}
            >
              {qrCode.locationName && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-lg">📍</span>
                  <span className="text-slate-300 text-sm font-medium">{qrCode.locationName}</span>
                </div>
              )}

              <h1 className="text-3xl font-black text-white leading-tight mb-2">
                {config.headline ?? "Your Voice Matters"}
              </h1>
              {config.subheadline && (
                <p className="text-slate-400 text-base mb-6">{config.subheadline}</p>
              )}
              {config.introText && (
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">{config.introText}</p>
              )}

              {campaign?.tagline && (
                <div
                  className="rounded-xl px-4 py-3 mb-6 text-sm font-semibold text-white"
                  style={{ background: `${primaryColor}33`, borderLeft: `3px solid ${primaryColor}` }}
                >
                  {campaign.tagline}
                </div>
              )}

              <motion.button
                onClick={() => setStep("intent")}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-xl mb-3"
                style={buildPrimaryStyle(primaryColor)}
              >
                Get Involved →
              </motion.button>
              <button
                onClick={() => handleIntentSelect("just_browsing")}
                className="w-full py-3 rounded-2xl text-slate-400 text-sm font-medium hover:text-white transition-colors"
              >
                Just browsing
              </button>
            </motion.div>
          )}

          {/* STEP: Intent selection */}
          {step === "intent" && (
            <motion.div
              key="intent"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={spring}
            >
              <h2 className="text-2xl font-black text-white mb-1">
                {config.issuePrompt ?? "What brings you here?"}
              </h2>
              <p className="text-slate-400 text-sm mb-6">Choose the option that fits best.</p>

              <div className="grid grid-cols-2 gap-3">
                {enabledIntents.map((intent) => {
                  const cfg = INTENT_CONFIG[intent];
                  if (!cfg) return null;
                  return (
                    <motion.button
                      key={intent}
                      onClick={() => handleIntentSelect(intent)}
                      whileTap={{ scale: 0.96 }}
                      className={`${cfg.color} rounded-2xl p-4 text-left text-white shadow-lg hover:opacity-90 transition-opacity`}
                    >
                      <div className="text-2xl mb-2">{cfg.emoji}</div>
                      <div className="font-bold text-sm leading-tight">{cfg.label}</div>
                    </motion.button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep("landing")}
                className="w-full mt-4 py-3 text-slate-500 text-sm hover:text-white transition-colors"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {/* STEP: Identity capture */}
          {step === "capture" && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={spring}
            >
              {selectedIntent && (
                <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-xl bg-white/5">
                  <span className="text-lg">{INTENT_CONFIG[selectedIntent]?.emoji}</span>
                  <span className="text-white text-sm font-semibold">
                    {INTENT_CONFIG[selectedIntent]?.label}
                  </span>
                </div>
              )}

              <h2 className="text-2xl font-black text-white mb-1">Stay Connected</h2>
              <p className="text-slate-400 text-sm mb-5">
                Leave your info and we'll follow up.
                <span className="text-slate-500"> Optional fields marked with *</span>
              </p>

              <form onSubmit={handleCapture} className="space-y-3">
                {collectFields.includes("name") && (
                  <input
                    type="text"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-white/30 text-sm"
                    autoComplete="name"
                  />
                )}
                {collectFields.includes("phone") && (
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-white/30 text-sm"
                    autoComplete="tel"
                  />
                )}
                {collectFields.includes("email") && (
                  <input
                    type="email"
                    placeholder="Email address *"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-white/30 text-sm"
                    autoComplete="email"
                  />
                )}
                {collectFields.includes("postal") && (
                  <input
                    type="text"
                    placeholder="Postal code *"
                    value={form.postal}
                    onChange={(e) => setForm((f) => ({ ...f, postal: e.target.value }))}
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-white/30 text-sm"
                    autoComplete="postal-code"
                  />
                )}

                {/* Address — shown when sign or help_at_location intent */}
                {(form.wantSign || selectedIntent === "live_nearby" || selectedIntent === "help_at_location") &&
                  collectFields.includes("address") && (
                  <input
                    type="text"
                    placeholder="Your address (for sign placement) *"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-white/30 text-sm"
                    autoComplete="street-address"
                  />
                )}

                {/* Quick question / note */}
                {selectedIntent === "concern" && (
                  <textarea
                    placeholder="What's on your mind?"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    rows={3}
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-white/30 text-sm resize-none"
                  />
                )}

                {/* Toggle chips */}
                <div className="flex gap-3 flex-wrap">
                  {!form.wantSign && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, wantSign: !f.wantSign }))}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        form.wantSign
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/30"
                      }`}
                    >
                      🪧 {form.wantSign ? "Sign requested ✓" : "I want a lawn sign"}
                    </button>
                  )}
                  {!form.wantVolunteer && selectedIntent !== "volunteer" && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, wantVolunteer: !f.wantVolunteer }))}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        form.wantVolunteer
                          ? "bg-purple-500 border-purple-500 text-white"
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/30"
                      }`}
                    >
                      🙋 {form.wantVolunteer ? "Volunteering ✓" : "I want to volunteer"}
                    </button>
                  )}
                </div>

                {error && (
                  <p className="text-red-400 text-sm px-1">{error}</p>
                )}

                <motion.button
                  type="submit"
                  disabled={submitting || (!form.name && !form.email && !form.phone)}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={buildPrimaryStyle(primaryColor)}
                >
                  {submitting ? "Sending…" : "Submit →"}
                </motion.button>

                <button
                  type="button"
                  onClick={() => setStep("intent")}
                  className="w-full py-3 text-slate-500 text-sm hover:text-white transition-colors"
                >
                  ← Change my choice
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP: Thank you */}
          {step === "thanks" && (
            <motion.div
              key="thanks"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring}
              className="text-center pt-10"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...spring, delay: 0.1 }}
                className="text-7xl mb-6"
              >
                ✅
              </motion.div>
              <h2 className="text-3xl font-black text-white mb-3">
                {config.thankYouText ?? "Thank you!"}
              </h2>
              <p className="text-slate-400 text-base mb-8 leading-relaxed">
                {selectedIntent === "request_sign"
                  ? "Your sign request has been logged. The campaign team will be in touch."
                  : selectedIntent === "volunteer"
                  ? "Great! Someone from the team will reach out to get you plugged in."
                  : selectedIntent === "just_browsing"
                  ? "Happy exploring. Come back anytime."
                  : "We've got your message and we'll follow up soon."}
              </p>

              {campaign?.websiteUrl && (
                <a
                  href={campaign.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-lg"
                  style={buildPrimaryStyle(primaryColor)}
                >
                  Learn more at {campaign.websiteUrl.replace(/^https?:\/\//, "")}
                </a>
              )}

              <p className="text-slate-600 text-xs mt-8">
                Powered by{" "}
                <span className="text-slate-500 font-semibold">Poll City</span>
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
