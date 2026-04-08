"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Copy,
  EyeOff,
  Link,
  Loader2,
  MessageSquare,
  Radio,
  SquareCheck,
  StopCircle,
} from "lucide-react";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

interface TownhallQuestion {
  id: string;
  askedByName: string;
  askedByEmail: string | null;
  text: string;
  upvotes: number;
  isAnswered: boolean;
  isHidden: boolean;
  createdAt: string;
}

interface TownhallModeratorProps {
  eventId: string;
  eventSlug: string;
  currentStatus: string | null;
  currentRoomUrl: string | null;
}

export default function TownhallModerator({
  eventId,
  eventSlug,
  currentStatus,
  currentRoomUrl,
}: TownhallModeratorProps) {
  const [status, setStatus] = useState(currentStatus ?? "scheduled");
  const [roomUrl, setRoomUrl] = useState(currentRoomUrl ?? "");
  const [questions, setQuestions] = useState<TownhallQuestion[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"live" | "ended" | null>(null);

  const publicLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/townhall/${eventSlug}`
      : `/townhall/${eventSlug}`;

  /* Fetch questions */
  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/townhall/questions`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data: TownhallQuestion[] };
      // Moderators see hidden questions too — but the API filters them.
      // For the moderator view we want all, including hidden, so include isHidden.
      setQuestions(json.data);
    } catch {
      // silently ignore
    }
  }, [eventId]);

  useEffect(() => {
    void fetchQuestions();
    const id = setInterval(() => void fetchQuestions(), 10_000);
    return () => clearInterval(id);
  }, [fetchQuestions]);

  /* Update status */
  const updateStatus = async (newStatus: "scheduled" | "live" | "ended") => {
    setStatusError("");
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/townhall/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, townhallRoomUrl: roomUrl || undefined }),
      });
      const json = (await res.json()) as { error?: string; data?: { townhallStatus: string } };
      if (!res.ok) { setStatusError(json.error ?? "Failed to update status."); return; }
      setStatus(json.data?.townhallStatus ?? newStatus);
    } catch {
      setStatusError("Network error.");
    } finally {
      setStatusLoading(false);
      setConfirmAction(null);
    }
  };

  /* Moderate question */
  const moderateQuestion = async (
    qid: string,
    patch: { isAnswered?: boolean; isHidden?: boolean },
  ) => {
    try {
      const res = await fetch(`/api/events/${eventId}/townhall/questions/${qid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return;
      void fetchQuestions();
    } catch {
      // silently ignore
    }
  };

  const hideQuestion = async (qid: string) => {
    try {
      await fetch(`/api/events/${eventId}/townhall/questions/${qid}`, { method: "DELETE" });
      void fetchQuestions();
    } catch {
      // silently ignore
    }
  };

  /* Copy public link */
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const pendingQuestions = questions.filter((q) => !q.isAnswered && !q.isHidden);
  const answeredQuestions = questions.filter((q) => q.isAnswered && !q.isHidden);
  const hiddenQuestions = questions.filter((q) => q.isHidden);

  return (
    <div className="space-y-5">
      {/* Status Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
          Townhall Control
        </h3>

        {/* Status badges */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          <span
            className={`rounded-full px-3 py-0.5 text-xs font-bold ${
              status === "live"
                ? "bg-green-100 text-green-700"
                : status === "ended"
                ? "bg-slate-100 text-slate-600"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {status === "live" ? "LIVE" : status === "ended" ? "Ended" : "Scheduled"}
          </span>
        </div>

        {/* Room URL */}
        {status !== "ended" && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              Room URL (Jitsi / Daily.co)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={roomUrl}
                onChange={(e) => setRoomUrl(e.target.value)}
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ minHeight: 44 }}
                placeholder="https://meet.jit.si/my-townhall-room"
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {status === "scheduled" && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => setConfirmAction("live")}
              disabled={statusLoading}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: GREEN, minHeight: 44 }}
            >
              <Radio className="h-4 w-4" />
              Go Live
            </motion.button>
          )}
          {status === "live" && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => setConfirmAction("ended")}
              disabled={statusLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              style={{ minHeight: 44 }}
            >
              <StopCircle className="h-4 w-4" />
              End Townhall
            </motion.button>
          )}
          {status === "ended" && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => void updateStatus("scheduled")}
              disabled={statusLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 disabled:opacity-60"
              style={{ minHeight: 44 }}
            >
              Reset to Scheduled
            </motion.button>
          )}
          {statusLoading && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
        </div>

        {statusError && (
          <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{statusError}</p>
        )}

        {/* Public link */}
        <div className="mt-4 flex items-center gap-2">
          <Link className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="flex-1 truncate text-xs text-gray-500">{publicLink}</span>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            {copied ? <CheckCircle className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            >
              <h3 className="text-lg font-bold" style={{ color: NAVY }}>
                {confirmAction === "live" ? "Go Live?" : "End Townhall?"}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {confirmAction === "live"
                  ? "This will make the townhall public and start the live feed."
                  : "This will end the townhall. Attendees will see a recap screen."}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void updateStatus(confirmAction)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white"
                  style={{
                    backgroundColor: confirmAction === "live" ? GREEN : "#ef4444",
                  }}
                >
                  {confirmAction === "live" ? "Go Live" : "End Now"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Question Queue */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <MessageSquare className="h-4 w-4" style={{ color: GREEN }} />
          <span className="font-semibold" style={{ color: NAVY }}>
            Question Queue
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
            {pendingQuestions.length}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {pendingQuestions.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">No pending questions.</p>
          )}
          <AnimatePresence>
            {pendingQuestions.map((q) => (
              <motion.div
                key={q.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-500">
                      {q.askedByName}
                      {q.askedByEmail && (
                        <span className="ml-1 text-gray-400">({q.askedByEmail})</span>
                      )}
                      <span className="ml-2 text-gray-300">•</span>
                      <span className="ml-2 text-gray-400">{q.upvotes} votes</span>
                    </p>
                    <p className="mt-1 text-sm text-gray-800">{q.text}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => void moderateQuestion(q.id, { isAnswered: true })}
                      title="Mark answered"
                      className="rounded-lg bg-green-50 p-2 text-green-600 hover:bg-green-100"
                      style={{ minHeight: 36, minWidth: 36 }}
                    >
                      <SquareCheck className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void hideQuestion(q.id)}
                      title="Hide question"
                      className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100"
                      style={{ minHeight: 36, minWidth: 36 }}
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Answered */}
      {answeredQuestions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="font-semibold" style={{ color: NAVY }}>
              Answered ({answeredQuestions.length})
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {answeredQuestions.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{q.askedByName}</p>
                  <p className="mt-0.5 text-sm text-gray-600 line-through">{q.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void moderateQuestion(q.id, { isAnswered: false })}
                  className="shrink-0 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                >
                  Unmark
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden */}
      {hiddenQuestions.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-500">
            Hidden Questions ({hiddenQuestions.length})
          </summary>
          <div className="divide-y divide-slate-100">
            {hiddenQuestions.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 px-4 py-3 opacity-60">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{q.askedByName}</p>
                  <p className="mt-0.5 text-sm text-gray-600">{q.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void moderateQuestion(q.id, { isHidden: false })}
                  className="shrink-0 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
