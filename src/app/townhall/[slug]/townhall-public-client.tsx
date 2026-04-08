"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, CheckCircle, MessageSquare, Bell, Users, Clock } from "lucide-react";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

interface TownhallEvent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  eventDate: string;
  location: string;
  townhallStatus: string | null;
  townhallRoomUrl: string | null;
  questionVoting: boolean;
  campaign: {
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
  };
}

interface TownhallQuestion {
  id: string;
  askedByName: string;
  text: string;
  upvotes: number;
  isAnswered: boolean;
  createdAt: string;
}

interface AskFormState {
  name: string;
  email: string;
  text: string;
}

interface NotifyFormState {
  email: string;
}

/* ---------- Countdown timer ---------- */
function useCountdown(targetDate: string) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, new Date(targetDate).getTime() - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const s = Math.floor(remaining / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return { days, hours, mins, secs, total: remaining };
}

/* ---------- Question card ---------- */
function QuestionCard({
  q,
  onUpvote,
  votingEnabled,
  hasVoted,
}: {
  q: TownhallQuestion;
  onUpvote: (id: string) => void;
  votingEnabled: boolean;
  hasVoted: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border p-4 ${
        q.isAnswered
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: NAVY }}>
            {q.askedByName}
          </p>
          <p className="mt-1 text-sm text-gray-700">{q.text}</p>
          {q.isAnswered && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              <CheckCircle className="h-3 w-3" />
              Answered
            </span>
          )}
        </div>
        {votingEnabled && !q.isAnswered && (
          <button
            type="button"
            onClick={() => onUpvote(q.id)}
            disabled={hasVoted}
            className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-colors ${
              hasVoted
                ? "bg-rose-50 text-rose-400"
                : "bg-gray-100 text-gray-500 hover:bg-rose-50 hover:text-rose-500"
            }`}
            style={{ minWidth: 48 }}
            aria-label="Upvote"
          >
            <Heart className={`h-4 w-4 ${hasVoted ? "fill-rose-400 text-rose-400" : ""}`} />
            <span className="text-xs font-bold">{q.upvotes}</span>
          </button>
        )}
        {(!votingEnabled || q.isAnswered) && (
          <span className="flex shrink-0 flex-col items-center gap-0.5 rounded-xl bg-gray-50 px-3 py-2 text-gray-400">
            <Heart className="h-4 w-4" />
            <span className="text-xs font-bold">{q.upvotes}</span>
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ================================================================ */
/*  Main component                                                   */
/* ================================================================ */
export default function TownhallPublicClient({ event }: { event: TownhallEvent }) {
  const [questions, setQuestions] = useState<TownhallQuestion[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [showAskModal, setShowAskModal] = useState(false);
  const [askForm, setAskForm] = useState<AskFormState>({ name: "", email: "", text: "" });
  const [askError, setAskError] = useState("");
  const [askSuccess, setAskSuccess] = useState(false);
  const [askLoading, setAskLoading] = useState(false);
  const [notifyForm, setNotifyForm] = useState<NotifyFormState>({ email: "" });
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdown = useCountdown(event.eventDate);

  /* Fetch questions */
  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${event.id}/townhall/questions`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { data: TownhallQuestion[] };
      setQuestions(json.data);
    } catch {
      // silently ignore
    }
  }, [event.id]);

  useEffect(() => {
    if (event.townhallStatus === "live") {
      void fetchQuestions();
      pollRef.current = setInterval(() => void fetchQuestions(), 15_000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [event.townhallStatus, fetchQuestions]);

  /* Submit question */
  const handleAsk = async () => {
    setAskError("");
    const name = askForm.name.trim();
    const text = askForm.text.trim();
    if (!name) { setAskError("Your name is required."); return; }
    if (!text) { setAskError("Please enter your question."); return; }
    if (text.length > 280) { setAskError("Question must be 280 characters or fewer."); return; }

    setAskLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}/townhall/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: askForm.email || undefined, text }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { setAskError(json.error ?? "Failed to submit question."); return; }
      setAskSuccess(true);
      setAskForm({ name: "", email: "", text: "" });
      void fetchQuestions();
    } catch {
      setAskError("Network error. Please try again.");
    } finally {
      setAskLoading(false);
    }
  };

  /* Upvote */
  const handleUpvote = async (qid: string) => {
    if (votedIds.has(qid)) return;
    setVotedIds((prev) => new Set(prev).add(qid));
    try {
      const res = await fetch(`/api/events/${event.id}/townhall/questions/${qid}/upvote`, {
        method: "POST",
      });
      if (!res.ok) {
        setVotedIds((prev) => { const n = new Set(prev); n.delete(qid); return n; });
        return;
      }
      const json = (await res.json()) as { upvotes: number };
      setQuestions((prev) =>
        prev.map((q) => (q.id === qid ? { ...q, upvotes: json.upvotes } : q)),
      );
    } catch {
      setVotedIds((prev) => { const n = new Set(prev); n.delete(qid); return n; });
    }
  };

  /* Notify RSVP */
  const handleNotify = async () => {
    const email = notifyForm.email.trim();
    if (!email) return;
    setNotifyLoading(true);
    try {
      await fetch(`/api/events/${event.id}/rsvps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: email.split("@")[0], email, status: "interested" }),
      });
      setNotifySuccess(true);
    } catch {
      // ignore
    } finally {
      setNotifyLoading(false);
    }
  };

  const accentColor = event.campaign.primaryColor ?? GREEN;
  const answeredQuestions = questions.filter((q) => q.isAnswered);
  const pendingQuestions = questions.filter((q) => !q.isAnswered);

  /* ───────── LIVE ───────── */
  if (event.townhallStatus === "live") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F5F7FA" }}>
        {/* Header */}
        <header
          className="sticky top-0 z-30 px-4 py-3 shadow-sm"
          style={{ backgroundColor: NAVY }}
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {event.campaign.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.campaign.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              )}
              <div>
                <p className="text-xs font-medium text-white/70">{event.campaign.name}</p>
                <p className="text-sm font-bold text-white">{event.name}</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              LIVE
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
          {/* Video embed */}
          {event.townhallRoomUrl && (
            <div className="overflow-hidden rounded-2xl shadow-lg aspect-video w-full">
              <iframe
                src={event.townhallRoomUrl}
                allow="camera; microphone; fullscreen; display-capture"
                className="h-full w-full border-0"
                title={`${event.name} live stream`}
              />
            </div>
          )}

          {/* Question queue */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" style={{ color: accentColor }} />
                <span className="font-semibold" style={{ color: NAVY }}>
                  Live Questions
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {pendingQuestions.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setShowAskModal(true); setAskSuccess(false); setAskError(""); }}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor, minHeight: 40 }}
              >
                Ask a Question
              </button>
            </div>

            <div className="space-y-3 p-4">
              {pendingQuestions.length === 0 && answeredQuestions.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">
                  No questions yet — be the first to ask!
                </p>
              )}
              <AnimatePresence mode="popLayout">
                {pendingQuestions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    q={q}
                    onUpvote={handleUpvote}
                    votingEnabled={event.questionVoting}
                    hasVoted={votedIds.has(q.id)}
                  />
                ))}
              </AnimatePresence>

              {answeredQuestions.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Answered
                  </p>
                  <AnimatePresence>
                    {answeredQuestions.map((q) => (
                      <QuestionCard
                        key={q.id}
                        q={q}
                        onUpvote={handleUpvote}
                        votingEnabled={false}
                        hasVoted={false}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Ask modal */}
        <AnimatePresence>
          {showAskModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
              onClick={(e) => { if (e.target === e.currentTarget) setShowAskModal(false); }}
            >
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
              >
                <h2 className="mb-4 text-lg font-bold" style={{ color: NAVY }}>
                  Ask a Question
                </h2>

                {askSuccess ? (
                  <div className="py-6 text-center">
                    <CheckCircle className="mx-auto mb-2 h-10 w-10 text-green-500" />
                    <p className="font-semibold text-gray-800">Question submitted!</p>
                    <button
                      type="button"
                      className="mt-4 text-sm font-medium underline"
                      style={{ color: accentColor }}
                      onClick={() => { setAskSuccess(false); setShowAskModal(false); }}
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        value={askForm.name}
                        onChange={(e) => setAskForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                        style={{ minHeight: 44 }}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Email (optional)
                      </label>
                      <input
                        type="email"
                        value={askForm.email}
                        onChange={(e) => setAskForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                        style={{ minHeight: 44 }}
                        placeholder="jane@example.com"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Your Question * ({280 - askForm.text.length} chars left)
                      </label>
                      <textarea
                        value={askForm.text}
                        onChange={(e) => setAskForm((p) => ({ ...p, text: e.target.value }))}
                        rows={3}
                        maxLength={280}
                        className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                        placeholder="What would you like to ask?"
                      />
                    </div>
                    {askError && (
                      <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{askError}</p>
                    )}
                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAskModal(false)}
                        className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700"
                        style={{ minHeight: 44 }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAsk()}
                        disabled={askLoading}
                        className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: accentColor, minHeight: 44 }}
                      >
                        {askLoading ? "Submitting…" : "Submit"}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ───────── ENDED ───────── */
  if (event.townhallStatus === "ended") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F5F7FA" }}>
        <header className="px-4 py-6" style={{ backgroundColor: NAVY }}>
          <div className="mx-auto max-w-2xl text-center">
            {event.campaign.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.campaign.logoUrl} alt="" className="mx-auto mb-3 h-12 w-12 rounded-full object-cover" />
            )}
            <p className="text-sm font-medium text-white/70">{event.campaign.name}</p>
            <h1 className="mt-1 text-2xl font-bold text-white">{event.name}</h1>
            <span className="mt-2 inline-block rounded-full bg-slate-500/50 px-3 py-1 text-xs font-semibold text-white/80">
              Townhall Ended
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-2xl space-y-4 px-4 py-8">
          <p className="text-center text-gray-500">This townhall has ended. Here are the top questions that were answered.</p>
          {answeredQuestions.length === 0 && questions.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">No questions were recorded.</p>
          ) : (
            [...answeredQuestions, ...pendingQuestions]
              .filter((q) => q.upvotes > 0 || q.isAnswered)
              .slice(0, 20)
              .map((q) => (
                <QuestionCard key={q.id} q={q} onUpvote={() => {}} votingEnabled={false} hasVoted={false} />
              ))
          )}
        </main>
      </div>
    );
  }

  /* ───────── SCHEDULED (default) ───────── */
  const eventDateObj = new Date(event.eventDate);
  const dateStr = eventDateObj.toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = eventDateObj.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F7FA" }}>
      <header className="px-4 pb-10 pt-12" style={{ backgroundColor: NAVY }}>
        <div className="mx-auto max-w-2xl text-center">
          {event.campaign.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.campaign.logoUrl} alt="" className="mx-auto mb-4 h-16 w-16 rounded-full object-cover ring-4 ring-white/20" />
          )}
          <p className="text-sm font-medium text-white/70">{event.campaign.name}</p>
          <h1 className="mt-2 text-3xl font-bold text-white">{event.name}</h1>
          <p className="mt-2 text-white/80">{dateStr}</p>
          <p className="text-sm text-white/60">{timeStr}</p>
          <span
            className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: accentColor }}
          >
            Virtual Townhall — Upcoming
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* Countdown */}
        {countdown.total > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
              <Clock className="h-4 w-4" />
              Starting in
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { value: countdown.days, label: "Days" },
                { value: countdown.hours, label: "Hours" },
                { value: countdown.mins, label: "Minutes" },
                { value: countdown.secs, label: "Seconds" },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-xl py-3" style={{ backgroundColor: NAVY }}>
                  <p className="text-2xl font-bold text-white">{String(value).padStart(2, "0")}</p>
                  <p className="text-xs text-white/60">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm leading-relaxed text-gray-700">{event.description}</p>
          </div>
        )}

        {/* Get notified */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: accentColor }} />
            <span className="font-semibold" style={{ color: NAVY }}>
              Get notified when we go live
            </span>
          </div>
          {notifySuccess ? (
            <p className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              <CheckCircle className="h-4 w-4" />
              You&apos;re on the list — we&apos;ll email you when the townhall starts!
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={notifyForm.email}
                onChange={(e) => setNotifyForm({ email: e.target.value })}
                placeholder="your@email.com"
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ minHeight: 44 }}
              />
              <button
                type="button"
                onClick={() => void handleNotify()}
                disabled={notifyLoading || !notifyForm.email}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: accentColor, minHeight: 44 }}
              >
                {notifyLoading ? "…" : "Notify Me"}
              </button>
            </div>
          )}
        </div>

        {/* RSVP */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: accentColor }} />
            <span className="font-semibold" style={{ color: NAVY }}>
              RSVP to this Townhall
            </span>
          </div>
          <p className="mt-1.5 text-sm text-gray-500">
            Enter your email above to RSVP and get a reminder when the townhall begins.
          </p>
        </div>
      </main>
    </div>
  );
}
