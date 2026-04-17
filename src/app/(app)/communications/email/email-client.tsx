"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Send, Users, Check, Loader2, Eye, History,
  FileText, AlertTriangle, Clock, X,
} from "lucide-react";
import { WriteAssistTextarea } from "@/components/ui";

interface Props {
  campaignId: string;
  tags: Array<{ id: string; name: string; color: string | null }>;
  wards: string[];
}

interface AudienceResult {
  count: number;
  totalInSegment: number;
  skipped: number;
  sample: Array<{ id: string; firstName: string | null; lastName: string | null; email: string | null }>;
}

interface SendResult {
  sent?: number;
  failed?: number;
  audienceSize?: number;
  resendConfigured?: boolean;
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

const TEMPLATES: Array<{
  slug: string;
  name: string;
  subject: string;
  body: string;
}> = [
  {
    slug: "canvassing-invite",
    name: "Canvassing Invite",
    subject: "{{firstName}}, we need you this Saturday",
    body: `<p>Hi {{firstName}},</p><p>We're knocking doors across {{ward}} this Saturday morning and I'd love to have you on the team.</p><p>Two hours. Snacks provided. You'll meet great people and move this campaign forward.</p><p><a href="#">Sign up for a shift</a></p><p>Thank you,<br>{{candidateName}}</p>`,
  },
  {
    slug: "gotv-reminder",
    name: "GOTV Reminder",
    subject: "Tomorrow is election day. Here's your polling station.",
    body: `<p>Hi {{firstName}},</p><p>Tomorrow is election day. Polls are open 10am to 8pm.</p><p>Find your polling station at <a href="https://www.elections.on.ca">elections.on.ca</a>. Bring ID.</p><p>Let's finish this together.</p><p>-- {{candidateName}}</p>`,
  },
  {
    slug: "thank-you",
    name: "Thank You",
    subject: "Thank you, {{firstName}}",
    body: `<p>Hi {{firstName}},</p><p>I wanted to thank you personally for your support in this campaign. It meant everything.</p><p>Whatever comes next, I'm grateful you trusted me with your vote.</p><p>-- {{candidateName}}</p>`,
  },
  {
    slug: "event-invite",
    name: "Event Invitation",
    subject: "Coffee and conversation -- this Thursday",
    body: `<p>Hi {{firstName}},</p><p>I'm hosting a small community meetup this Thursday at 7pm. Coffee, questions, real conversation about {{ward}}.</p><p>Hope you'll join us.</p><p><a href="#">RSVP</a></p><p>-- {{candidateName}}</p>`,
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

export default function EmailClient({ campaignId, tags, wards }: Props) {
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [supportLevels, setSupportLevels] = useState<string[]>([]);
  const [wardFilter, setWardFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [excludeDnc, setExcludeDnc] = useState(true);
  const [audience, setAudience] = useState<AudienceResult | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sanitizedPreview, setSanitizedPreview] = useState<string>("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Sanitize email body before preview (client-side only — DOMPurify requires window)
  useEffect(() => {
    if (!showPreview) return;
    import("dompurify").then(({ default: DOMPurify }) => {
      setSanitizedPreview(DOMPurify.sanitize(body));
    });
  }, [body, showPreview]);

  // Live audience count (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      setAudienceLoading(true);
      try {
        const res = await fetch("/api/communications/audience", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            campaignId,
            channel: "email",
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

  function loadTemplate(slug: string) {
    const t = TEMPLATES.find((x) => x.slug === slug);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
  }

  async function send(testOnly: boolean) {
    if (!subject || !body) {
      setResult({ error: "Subject and body required" });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/communications/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          subject,
          bodyHtml: body,
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
          <Mail className="w-7 h-7 text-[#1D9E75]" /> Email Campaign
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          CASL-compliant bulk email. Unsubscribe link appended automatically.
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: composer */}
              <div className="lg:col-span-2 space-y-4">
                {/* Template library */}
                <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
                  <h2 className="font-bold text-[#0A2342] text-sm uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#1D9E75]" /> Templates
                  </h2>
                  <div className="flex gap-2 overflow-x-auto scrollbar-thin -mx-4 px-4 md:mx-0 md:px-0 pb-2">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.slug}
                        onClick={() => loadTemplate(t.slug)}
                        className="shrink-0 min-h-[44px] px-4 rounded-full text-xs font-semibold bg-slate-100 hover:bg-[#1D9E75]/10 border border-slate-200 hover:border-[#1D9E75]/40 text-slate-700 transition-colors"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Subject */}
                <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      Subject <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Can you help us this Saturday?"
                      className="mt-1.5 w-full min-h-[44px] px-3 border-2 border-slate-300 rounded-lg focus:border-[#1D9E75] focus:outline-none transition-colors"
                      maxLength={150}
                      spellCheck={true}
                    />
                    <span className="text-xs text-slate-400 mt-1 block text-right tabular-nums">
                      {subject.length}/150
                    </span>
                  </label>
                </section>

                {/* Body */}
                <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-slate-700">
                      Email body (HTML) <span className="text-red-500">*</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPreview((v) => !v)}
                      className="text-xs font-semibold text-[#1D9E75] flex items-center gap-1 min-h-[44px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {showPreview ? "Edit" : "Preview"}
                    </button>
                  </div>

                  {/* formatting toolbar */}
                  {!showPreview && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {[
                        { label: "B", tag: "<strong></strong>" },
                        { label: "I", tag: "<em></em>" },
                        { label: "Link", tag: '<a href="">text</a>' },
                        { label: "H2", tag: "<h2></h2>" },
                        { label: "P", tag: "<p></p>" },
                      ].map((b) => (
                        <button
                          key={b.label}
                          onClick={() => setBody((prev) => prev + b.tag)}
                          className="px-2.5 py-1 text-xs font-bold rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors min-h-[36px]"
                        >
                          {b.label}
                        </button>
                      ))}
                      <div className="ml-auto flex flex-wrap gap-1">
                        {["firstName", "lastName", "ward", "candidateName"].map((v) => (
                          <button
                            key={v}
                            onClick={() => setBody((prev) => prev + `{{${v}}}`)}
                            className="px-2 py-1 text-xs rounded border border-[#1D9E75]/30 text-[#1D9E75] bg-[#1D9E75]/5 hover:bg-[#1D9E75]/10 transition-colors"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {showPreview ? (
                    <div
                      className="border-2 border-slate-200 rounded-lg p-4 min-h-[300px] prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: sanitizedPreview || '<p class="text-slate-400">Nothing to preview</p>',
                      }}
                    />
                  ) : (
                    <WriteAssistTextarea
                      rows={14}
                      value={body}
                      onChange={setBody}
                      context="email-body"
                      campaignId={campaignId}
                      placeholder="<p>Hi {{firstName}},</p><p>...</p>"
                      className="border-2 border-slate-300 rounded-lg focus:border-[#1D9E75] focus:ring-0 font-mono text-sm min-h-[80px]"
                      maxLength={50_000}
                    />
                  )}
                  <p className="text-xs text-slate-400 mt-1 text-right tabular-nums">
                    {body.length.toLocaleString()} chars
                  </p>
                </section>

                {/* CASL compliance notice */}
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-800">
                    <strong>CASL Compliance:</strong> An unsubscribe link and campaign
                    identification footer are automatically appended to every email. This
                    cannot be removed.
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
                          {!result.resendConfigured && (
                            <p className="text-xs mt-1">
                              RESEND_API_KEY not set -- logged to console only.
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right: audience + send */}
              <aside className="space-y-4">
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
                      With email &middot; excluding Do Not Contact
                    </p>
                  </div>

                  {/* Skip warning — shown when some contacts in the segment have no email */}
                  {!audienceLoading && audience && audience.skipped > 0 && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4 flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4.25v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 1.5 0zM8 12a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>
                      <p className="text-[11px] text-amber-800 leading-snug">
                        <span className="font-semibold">{audience.skipped.toLocaleString()} contact{audience.skipped !== 1 ? "s" : ""}</span> in this segment {audience.skipped !== 1 ? "have" : "has"} no email address and will be skipped.
                      </p>
                    </div>
                  )}

                  {/* sample contacts */}
                  {audience && audience.sample && audience.sample.length > 0 && (
                    <div className="mb-4 space-y-1">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Sample
                      </p>
                      {audience.sample.map((s) => (
                        <p key={s.id} className="text-xs text-slate-600 truncate">
                          {s.firstName} {s.lastName} &mdash; {s.email}
                        </p>
                      ))}
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

                    {/* exclude DNC */}
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
                      disabled={sending || !subject || !body}
                      className="w-full min-h-[44px] rounded-lg border-2 border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Send test (1 recipient)
                    </button>
                    <button
                      onClick={() => send(false)}
                      disabled={sending || !subject || !body || !audience?.count}
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
                    <p className="text-[10px] text-slate-500 text-center">
                      CASL-compliant unsubscribe footer added automatically
                    </p>
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
                <p className="text-lg font-bold text-slate-700">No emails sent yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Compose your first email to see history here.
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
                      <Mail className="w-4 h-4 text-[#1D9E75]" />
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
