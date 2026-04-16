"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, Users, Check, Loader2, History,
  AlertTriangle, Clock, X, FileText,
} from "lucide-react";

interface Props {
  campaignId: string;
  tags: Array<{ id: string; name: string; color: string | null }>;
  wards: string[];
}

interface AudienceResult {
  count: number;
  totalInSegment: number;
  skipped: number;
  sample: Array<{ id: string; firstName: string | null; lastName: string | null; phone: string | null }>;
}

interface SendResult {
  sent?: number;
  failed?: number;
  audienceSize?: number;
  twilioConfigured?: boolean;
  error?: string;
}

interface HistoryItem {
  id: string;
  title: string;
  body: string;
  status: string;
  sentAt: string | null;
  totalSubscribers: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
}

const SUPPORT_LEVELS = [
  { value: "strong_support", label: "Strong Support" },
  { value: "leaning_support", label: "Leaning Support" },
  { value: "undecided", label: "Undecided" },
  { value: "leaning_opposition", label: "Leaning Against" },
  { value: "strong_opposition", label: "Strong Against" },
  { value: "unknown", label: "Unknown" },
];

const TEMPLATES = [
  {
    slug: "gotv",
    name: "GOTV Reminder",
    body: "Hi {{firstName}}, tomorrow is election day. Polls are open 10-8. Find your polling station at elections.on.ca. Let's finish this together!",
  },
  {
    slug: "canvassing",
    name: "Canvassing Invite",
    body: "Hi {{firstName}}, quick reminder: knock doors with us this Sat 10am in {{ward}}. Reply YES to join.",
  },
  {
    slug: "thanks",
    name: "Thank You",
    body: "{{firstName}}, thank you for your support. It means the world. -- {{candidateName}}",
  },
  {
    slug: "event",
    name: "Event Invite",
    body: "Hi {{firstName}}, coffee meetup Thursday 7pm. Hope you'll come. Reply for details.",
  },
];

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] ${className ?? "h-16 w-full"}`}
    />
  );
}

/** Check if current local time is within CRTC-allowed window (9am-9pm). */
function isCrtcAllowed(): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 21;
}

export default function SmsClient({ campaignId, tags, wards }: Props) {
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [body, setBody] = useState("");
  const [supportLevels, setSupportLevels] = useState<string[]>([]);
  const [wardFilter, setWardFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [excludeDnc, setExcludeDnc] = useState(true);
  const [audience, setAudience] = useState<AudienceResult | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const crtcOk = isCrtcAllowed();
  const charCount = body.length;
  const caslSuffixLen = 40; // " Reply STOP to opt out. [Campaign Name]"
  const segments = useMemo(
    () => Math.max(1, Math.ceil((charCount + caslSuffixLen) / 160)),
    [charCount]
  );

  // Live audience count
  useEffect(() => {
    const timer = setTimeout(async () => {
      setAudienceLoading(true);
      try {
        const res = await fetch("/api/communications/audience", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            campaignId,
            channel: "sms",
            supportLevels: supportLevels.length ? supportLevels : undefined,
            wards: wardFilter.length ? wardFilter : undefined,
            tagIds: tagFilter.length ? tagFilter : undefined,
            excludeDnc,
          }),
        });
        if (res.ok) setAudience(await res.json());
      } catch {
        /* ignore */
      } finally {
        setAudienceLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [campaignId, supportLevels, wardFilter, tagFilter, excludeDnc]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/notifications?campaignId=${campaignId}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.data ?? data ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setHistoryLoading(false);
    }
  }, [campaignId]);

  function toggle(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function send(testOnly: boolean) {
    if (!body) {
      setResult({ error: "Message body required" });
      return;
    }
    if (!crtcOk && !testOnly) {
      setResult({
        error:
          "CRTC rules prohibit SMS sends before 9 AM or after 9 PM local time. Schedule for an allowed window.",
      });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/communications/sms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          body,
          supportLevels: supportLevels.length ? supportLevels : undefined,
          wards: wardFilter.length ? wardFilter : undefined,
          tagIds: tagFilter.length ? tagFilter : undefined,
          excludeDnc,
          testOnly,
        }),
      });
      const data = await res.json();
      setResult(res.ok ? data : { error: data.error ?? "Send failed" });
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 pb-[env(safe-area-inset-bottom)]">
      <motion.header
        className="mb-5"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-[#0A2342] flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-[#1D9E75]" /> SMS Campaign
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          CRTC-compliant text messaging. &quot;Reply STOP&quot; + campaign name appended
          automatically.
        </p>
      </motion.header>

      {/* tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6">
        {(["compose", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "history") loadHistory();
            }}
            className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-colors min-h-[44px] flex items-center justify-center gap-1.5 ${
              tab === t
                ? "bg-white text-[#0A2342] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "compose" ? (
              <>
                <Send className="w-4 h-4" /> Compose
              </>
            ) : (
              <>
                <History className="w-4 h-4" /> Sent History
              </>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "compose" ? (
          <motion.div
            key="compose"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={spring}
          >
            {/* CRTC warning */}
            {!crtcOk && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 mb-4"
              >
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div className="text-sm text-red-800">
                  <strong>CRTC Restriction:</strong> SMS messages cannot be sent before
                  9:00 AM or after 9:00 PM local time. You can schedule for a valid window.
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {/* Templates */}
                <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
                  <h2 className="font-bold text-[#0A2342] text-sm uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#1D9E75]" /> Templates
                  </h2>
                  <div className="flex gap-2 overflow-x-auto scrollbar-thin -mx-4 px-4 md:mx-0 md:px-0 pb-2">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.slug}
                        onClick={() => setBody(t.body)}
                        className="shrink-0 min-h-[44px] px-4 rounded-full text-xs font-semibold bg-slate-100 hover:bg-[#1D9E75]/10 border border-slate-200 hover:border-[#1D9E75]/40 text-slate-700 transition-colors"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Message */}
                <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      Message <span className="text-red-500">*</span>
                    </span>
                    <textarea
                      rows={6}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Hi {{firstName}}, ..."
                      className="mt-1.5 w-full px-3 py-3 border-2 border-slate-300 rounded-lg focus:border-[#1D9E75] focus:outline-none transition-colors"
                      maxLength={1000}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-wrap gap-1">
                        {["firstName", "ward", "candidateName"].map((v) => (
                          <button
                            key={v}
                            onClick={() => setBody((prev) => prev + `{{${v}}}`)}
                            className="px-2 py-1 text-xs rounded border border-[#1D9E75]/30 text-[#1D9E75] bg-[#1D9E75]/5 hover:bg-[#1D9E75]/10 transition-colors"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <p
                        className={`text-xs font-semibold tabular-nums ${
                          segments > 2
                            ? "text-red-700"
                            : segments > 1
                              ? "text-amber-700"
                              : "text-[#1D9E75]"
                        }`}
                      >
                        {charCount}/160 &middot; {segments} segment
                        {segments === 1 ? "" : "s"}
                      </p>
                    </div>
                  </label>
                </section>

                {/* CRTC compliance notice */}
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-800">
                    <strong>CRTC Compliance:</strong> No sends before 9:00 AM or after
                    9:00 PM local time. &quot;Reply STOP&quot; and campaign name appended
                    automatically.
                  </div>
                </div>

                {/* Schedule */}
                <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#1D9E75]" /> Schedule Send
                      (optional)
                    </span>
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="mt-1.5 w-full max-w-xs min-h-[44px] px-3 border-2 border-slate-300 rounded-lg focus:border-[#1D9E75] focus:outline-none transition-colors"
                    />
                    {scheduleDate && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Will send at{" "}
                        {new Date(scheduleDate).toLocaleString()}
                      </p>
                    )}
                  </label>
                </section>

                {/* Result */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`rounded-xl p-4 text-sm ${
                        result.error
                          ? "bg-red-50 border border-red-200 text-red-900"
                          : "bg-[#1D9E75]/10 border border-[#1D9E75]/30 text-[#0A2342]"
                      }`}
                    >
                      {result.error ? (
                        <span className="flex items-center gap-2">
                          <X className="w-4 h-4" /> {result.error}
                        </span>
                      ) : (
                        <div>
                          <p className="font-bold flex items-center gap-2">
                            <Check className="w-4 h-4 text-[#1D9E75]" />
                            {result.sent?.toLocaleString()} sent &middot;{" "}
                            {result.failed?.toLocaleString()} failed
                          </p>
                          {!result.twilioConfigured && (
                            <p className="text-xs mt-1">
                              Twilio not configured -- logged to console only.
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right: audience */}
              <aside>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 lg:sticky lg:top-4">
                  <h2 className="font-bold text-[#0A2342] text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#1D9E75]" /> Audience
                  </h2>

                  <div className="rounded-lg bg-[#1D9E75]/5 border border-[#1D9E75]/20 p-3 mb-4">
                    <p className="text-xs font-semibold text-[#0A2342]">
                      {audienceLoading ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" /> Counting...
                        </span>
                      ) : (
                        `${audience?.count.toLocaleString() ?? 0} recipients`
                      )}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      With phone &middot; excluding Do Not Contact
                    </p>
                  </div>

                  {/* Skip warning — shown when some contacts in the segment have no phone */}
                  {!audienceLoading && audience && audience.skipped > 0 && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4 flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4.25v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 1.5 0zM8 12a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>
                      <p className="text-[11px] text-amber-800 leading-snug">
                        <span className="font-semibold">{audience.skipped.toLocaleString()} contact{audience.skipped !== 1 ? "s" : ""}</span> in this segment {audience.skipped !== 1 ? "have" : "has"} no phone number and will be skipped.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1.5">
                        Support level
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {SUPPORT_LEVELS.map((s) => (
                          <button
                            key={s.value}
                            onClick={() =>
                              toggle(supportLevels, s.value, setSupportLevels)
                            }
                            className={`min-h-[36px] px-2.5 text-[11px] font-semibold rounded-full border transition-colors ${
                              supportLevels.includes(s.value)
                                ? "bg-[#0A2342] text-white border-[#0A2342]"
                                : "bg-white text-slate-600 border-slate-200 hover:border-[#1D9E75]"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {wards.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 mb-1.5">
                          Ward
                        </p>
                        <div className="max-h-28 overflow-y-auto scrollbar-thin space-y-1">
                          {wards.map((w) => (
                            <label
                              key={w}
                              className="flex items-center gap-2 text-xs cursor-pointer min-h-[32px]"
                            >
                              <input
                                type="checkbox"
                                checked={wardFilter.includes(w)}
                                onChange={() => toggle(wardFilter, w, setWardFilter)}
                                className="w-4 h-4 rounded border-gray-300 text-[#1D9E75] focus:ring-[#1D9E75]"
                              />
                              <span className="truncate">{w}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {tags.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 mb-1.5">
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => toggle(tagFilter, t.id, setTagFilter)}
                              className={`min-h-[32px] px-2 text-[10px] font-semibold rounded-full border transition-colors ${
                                tagFilter.includes(t.id)
                                  ? "text-white"
                                  : "text-slate-600 bg-white"
                              }`}
                              style={{
                                background: tagFilter.includes(t.id)
                                  ? t.color ?? "#0A2342"
                                  : undefined,
                                borderColor: t.color ?? "#e2e8f0",
                              }}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={excludeDnc}
                        onChange={(e) => setExcludeDnc(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#1D9E75] focus:ring-[#1D9E75]"
                      />
                      <span className="text-xs text-slate-700">
                        Exclude Do Not Contact
                      </span>
                    </label>
                  </div>

                  <div className="border-t border-slate-200 mt-4 pt-4 space-y-2">
                    <button
                      onClick={() => send(true)}
                      disabled={sending || !body}
                      className="w-full min-h-[44px] rounded-lg border-2 border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Test send
                    </button>
                    <button
                      onClick={() => send(false)}
                      disabled={sending || !body || !audience?.count || !crtcOk}
                      className="w-full min-h-[48px] rounded-lg bg-[#0A2342] text-white font-bold hover:bg-[#0A2342]/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {scheduleDate ? "Schedule" : "Send to"}{" "}
                      {audience?.count.toLocaleString() ?? 0}
                    </button>
                    {!crtcOk && (
                      <p className="text-[10px] text-red-600 text-center font-semibold">
                        Outside CRTC allowed hours (9 AM - 9 PM)
                      </p>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={spring}
          >
            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <ShimmerBlock key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-20">
                <History className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-lg font-bold text-slate-700">No SMS sent yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Compose your first SMS blast to see history here.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {history.map((h) => (
                  <motion.li
                    key={h.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#1D9E75]/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-[#1D9E75]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0A2342] truncate">
                        {h.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {h.deliveredCount.toLocaleString()} delivered &middot;{" "}
                        {h.failedCount.toLocaleString()} failed &middot;{" "}
                        {h.totalSubscribers.toLocaleString()} audience
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {h.sentAt
                          ? new Date(h.sentAt).toLocaleString()
                          : new Date(h.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1D9E75]/10 text-[#1D9E75]">
                      {h.status}
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
