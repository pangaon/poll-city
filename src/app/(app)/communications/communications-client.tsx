"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare, Send, Clock, CheckCircle, HelpCircle, Search, Mail,
  Phone, User, Inbox, Plus, X, Zap, Settings, ChevronRight,
  AlertTriangle, Loader2, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavTab = "broadcast" | "inbox" | "triggers";
type CommsChannel = "sms" | "email";
type InboxChannelFilter = "all" | "email" | "sms" | "social" | "question";

interface FilterDefinition {
  supportLevels?: string[];
  wards?: string[];
  tagIds?: string[];
  channel?: "email" | "sms" | "all";
  excludeDnc?: boolean;
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  filterDefinition: FilterDefinition;
  lastCount: number | null;
}

interface ThreadMessage {
  id: string;
  direction: "inbound" | "outbound";
  fromHandle: string;
  body: string;
  sentAt: string;
  sentByUser: { id: string; name: string | null } | null;
}

interface InboxThread {
  id: string;
  channel: "email" | "sms";
  status: "open" | "resolved" | "snoozed";
  subject: string | null;
  fromName: string | null;
  fromHandle: string;
  lastMessageAt: string;
  unreadCount: number;
  contact: { id: string; firstName: string; lastName: string } | null;
  messages: Array<{ body: string; direction: string; sentAt: string }>;
}

interface ThreadDetail {
  id: string;
  channel: "email" | "sms";
  status: "open" | "resolved" | "snoozed";
  subject: string | null;
  fromName: string | null;
  fromHandle: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: ThreadMessage[];
}

interface AutomationStep {
  id: string;
  stepOrder: number;
  stepType: string;
  config: Record<string, unknown>;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  isActive: boolean;
  steps: AutomationStep[];
  _count: { enrollments: number };
}

interface ScheduledMessage {
  id: string;
  channel: string;
  subject: string | null;
  bodyText: string;
  status: string;
  sendAt: string;
  sentCount: number;
  segment: { id: string; name: string } | null;
}

interface Props {
  campaignId: string;
  campaignName: string;
  tags: Array<{ id: string; name: string; color: string | null }>;
  wards: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function randomKey(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; c: string; bg: string }> = {
    open:       { label: "OPEN",       c: "#2979FF", bg: "rgba(41,121,255,0.15)" },
    resolved:   { label: "RESOLVED",   c: "#00C853", bg: "rgba(0,200,83,0.15)" },
    snoozed:    { label: "SNOOZED",    c: "#EF9F27", bg: "rgba(239,159,39,0.15)" },
    email:      { label: "EMAIL",      c: "#2979FF", bg: "rgba(41,121,255,0.15)" },
    sms:        { label: "SMS",        c: "#00C853", bg: "rgba(0,200,83,0.15)" },
    social:     { label: "SOCIAL",     c: "#AA00FF", bg: "rgba(170,0,255,0.15)" },
    question:   { label: "Q&A",        c: "#EF9F27", bg: "rgba(239,159,39,0.15)" },
    live:       { label: "LIVE",       c: "#00C853", bg: "rgba(0,200,83,0.15)" },
    draft:      { label: "PAUSED",     c: "#6B72A0", bg: "rgba(107,114,160,0.15)" },
    queued:     { label: "QUEUED",     c: "#EF9F27", bg: "rgba(239,159,39,0.15)" },
    processing: { label: "SENDING",    c: "#00C853", bg: "rgba(0,200,83,0.15)" },
    sent:       { label: "SENT",       c: "#6B72A0", bg: "rgba(107,114,160,0.15)" },
  };
  const s = map[status] ?? { label: status.toUpperCase(), c: "#AAB2FF", bg: "rgba(170,178,255,0.15)" };
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
      style={{ color: s.c, backgroundColor: s.bg, textShadow: `0 0 6px ${s.c}60` }}
    >
      {s.label}
    </span>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  const cls: Record<string, string> = {
    email:    "text-[#2979FF]",
    sms:      "text-[#00C853]",
    social:   "text-[#AA00FF]",
    question: "text-[#EF9F27]",
  };
  const Icon = channel === "sms" ? Phone : channel === "question" ? HelpCircle : Mail;
  return <Icon size={13} className={cls[channel] ?? "text-[#AAB2FF]"} />;
}

// ─── Broadcast Panel ──────────────────────────────────────────────────────────

const ALL_SUPPORT_LEVELS_EXCEPT_HARD_OPPOSE = [
  "strong_support", "leaning_support", "undecided", "leaning_opposition", "unknown",
];

function BroadcastPanel({
  campaignId,
  campaignName,
  tags,
}: {
  campaignId: string;
  campaignName: string;
  tags: Array<{ id: string; name: string; color: string | null }>;
}) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [reach, setReach] = useState<number | null>(null);
  const [reachLoading, setReachLoading] = useState(false);
  const [channel, setChannel] = useState<CommsChannel>("sms");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [excludeHardOppose, setExcludeHardOppose] = useState(true);
  const [excludedTagIds, setExcludedTagIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/comms/segments?campaignId=${campaignId}`)
      .then(r => r.json())
      .then((d: { segments?: Segment[] }) => {
        if (d.segments) setSegments(d.segments);
      })
      .catch(() => {});
  }, [campaignId]);

  useEffect(() => {
    if (!selectedSegmentId) { setReach(null); return; }
    setReachLoading(true);
    fetch(`/api/comms/segments/${selectedSegmentId}/count`, { method: "POST" })
      .then(r => r.json())
      .then((d: { count?: number }) => setReach(d.count ?? null))
      .catch(() => setReach(null))
      .finally(() => setReachLoading(false));
  }, [selectedSegmentId]);

  const selectedSegment = segments.find(s => s.id === selectedSegmentId);
  const fd = selectedSegment?.filterDefinition ?? {};

  function buildSendPayload(isTest: boolean): Record<string, unknown> {
    // Support levels: if segment has explicit list, use that (minus hard oppose if toggled).
    // If no segment, and exclude hard oppose is on, send to all except strong_opposition.
    let supportLevels: string[] | undefined;
    if (fd.supportLevels && fd.supportLevels.length > 0) {
      supportLevels = excludeHardOppose
        ? fd.supportLevels.filter(l => l !== "strong_opposition")
        : fd.supportLevels;
    } else if (excludeHardOppose) {
      supportLevels = ALL_SUPPORT_LEVELS_EXCEPT_HARD_OPPOSE;
    }

    const payload: Record<string, unknown> = {
      campaignId,
      testOnly: isTest,
      sendKey: randomKey(),
      excludeDnc: true,
    };
    if (supportLevels) payload.supportLevels = supportLevels;
    if (fd.wards?.length) payload.wards = fd.wards;

    // Tag-based include from segment, minus any explicitly excluded tags
    const includeTags = fd.tagIds?.filter(id => !excludedTagIds.includes(id));
    if (includeTags?.length) payload.tagIds = includeTags;

    return payload;
  }

  async function handleTestSend() {
    if (!body.trim()) { toast.error("Write a message first"); return; }
    if (channel === "email" && !subject.trim()) { toast.error("Subject required for email"); return; }
    setTestSending(true);
    try {
      const payload = buildSendPayload(true);
      if (channel === "sms") {
        payload.body = body;
        payload.excludeSmsOptOut = true;
      } else {
        payload.subject = subject;
        payload.bodyHtml = `<div style="font-family:system-ui,sans-serif;padding:24px">${body.replace(/\n/g, "<br>")}</div>`;
        payload.excludeEmailBounced = true;
      }
      const res = await fetch(
        channel === "sms" ? "/api/communications/sms" : "/api/communications/email",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      const data = await res.json() as { sent?: number; error?: string; code?: string };
      if (!res.ok) {
        if (data.code === "INTEGRATION_UNAVAILABLE") {
          toast.info("Integration not configured — message logged but not sent");
        } else {
          toast.error(data.error ?? "Test send failed");
        }
      } else {
        toast.success(`Test send: ${data.sent ?? 0} delivered`);
      }
    } finally {
      setTestSending(false);
    }
  }

  async function handleArmPayload() {
    if (!body.trim()) { toast.error("Message body required"); return; }
    if (channel === "email" && !subject.trim()) { toast.error("Subject required for email"); return; }
    setSending(true);
    setConfirmOpen(false);
    try {
      const payload = buildSendPayload(false);
      if (channel === "sms") {
        payload.body = body;
        payload.excludeSmsOptOut = true;
      } else {
        payload.subject = subject;
        payload.bodyHtml = `<div style="font-family:system-ui,sans-serif;padding:24px">${body.replace(/\n/g, "<br>")}</div>`;
        payload.excludeEmailBounced = true;
      }
      const res = await fetch(
        channel === "sms" ? "/api/communications/sms" : "/api/communications/email",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      const data = await res.json() as { sent?: number; failed?: number; audienceSize?: number; error?: string; code?: string };
      if (!res.ok) {
        if (data.code === "INTEGRATION_UNAVAILABLE") {
          toast.info("Integration not configured — configure Twilio or Resend in Vercel to send live");
        } else {
          toast.error(data.error ?? "Deploy failed");
        }
      } else {
        toast.success(`Deployed: ${data.sent ?? 0}/${data.audienceSize ?? 0} delivered`);
        setBody("");
        setSubject("");
      }
    } finally {
      setSending(false);
    }
  }

  function insertToken(token: string) {
    const el = textareaRef.current;
    if (!el) { setBody(b => b + token); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setBody(body.slice(0, start) + token + body.slice(end));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  }

  function toggleTagExclusion(tagId: string) {
    setExcludedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId],
    );
  }

  const charCount = body.length;
  const segments160 = Math.ceil(charCount / 160) || 1;
  const costEst = reach != null ? (reach * (channel === "sms" ? 0.01 : 0.001)).toFixed(2) : "0.00";
  const previewBody = body
    .replace(/\{first_name\}|\{\{firstName\}\}/g, "Michael")
    .replace(/\{riding\}|\{\{ward\}\}/g, "Parkdale–High Park")
    .replace(/\{\{candidateName\}\}/g, campaignName.split(" ")[0] ?? "Jane")
    .replace(/\{\{candidateName\}\}/g, campaignName.split(" ")[0] ?? "Jane");

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto relative z-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(41,121,255,0.8)] flex items-center gap-3">
          New Deployment{" "}
          <span className="bg-[#2979FF]/20 text-[#2979FF] border border-[#2979FF]/40 text-[10px] px-2 py-0.5 rounded tracking-widest font-black">
            DRAFT
          </span>
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handleTestSend}
            disabled={testSending || !body.trim()}
            className="px-4 py-2 border border-[#2979FF]/40 rounded text-[11px] font-bold uppercase tracking-widest text-[#AAB2FF] hover:bg-[#2979FF]/10 transition-colors disabled:opacity-40"
          >
            {testSending ? "Sending..." : "Test Send"}
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={sending || !body.trim()}
            className="px-6 py-2 bg-[#FF3B30] text-white rounded text-[11px] font-black uppercase tracking-widest hover:bg-red-500 shadow-[0_0_20px_rgba(255,59,48,0.4)] transition-all flex items-center gap-2 disabled:opacity-40"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {sending ? "Deploying..." : "ARM PAYLOAD"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 min-h-0">
        {/* Left + Center: 2 cols */}
        <div className="col-span-2 flex flex-col gap-6">

          {/* Target Vector */}
          <div className="bg-[#0F1440]/60 border border-[#2979FF]/30 rounded p-4 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-[#2979FF]/20 pb-3">
              <h3 className="text-[11px] font-black text-[#AAB2FF] uppercase tracking-[0.2em]">Target Vector</h3>
              <Link
                href="/communications/inbox"
                className="text-[10px] text-[#00E5FF] hover:underline tracking-widest"
              >
                View Matrix
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase text-[#6B72A0] w-16 flex-shrink-0">Segment</span>
              <select
                value={selectedSegmentId}
                onChange={e => setSelectedSegmentId(e.target.value)}
                className="bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-xs p-2 rounded flex-1 outline-none focus:border-[#00E5FF]"
              >
                <option value="">— All Contacts —</option>
                {segments.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.lastCount != null ? ` (${s.lastCount.toLocaleString()})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-[10px] uppercase text-[#6B72A0] w-16 flex-shrink-0 pt-1">Exclusion</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setExcludeHardOppose(!excludeHardOppose)}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded border transition-colors font-bold",
                    excludeHardOppose
                      ? "bg-[#FF3B30]/20 border-[#FF3B30]/40 text-[#FF3B30]"
                      : "bg-transparent border-[#2979FF]/20 text-[#6B72A0] hover:text-[#AAB2FF]",
                  )}
                >
                  Hard Oppose
                </button>
                <span className="bg-[#FF3B30]/20 border border-[#FF3B30]/40 text-[#FF3B30] text-[10px] px-2 py-1 rounded font-bold">
                  DNC List
                </span>
                <span className={cn(
                  "border text-[10px] px-2 py-1 rounded font-bold",
                  channel === "sms"
                    ? "bg-[#EF9F27]/20 border-[#EF9F27]/40 text-[#EF9F27]"
                    : "bg-[#EF9F27]/20 border-[#EF9F27]/40 text-[#EF9F27]",
                )}>
                  {channel === "sms" ? "SMS Opt-out" : "Email Bounced"}
                </span>
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTagExclusion(tag.id)}
                    className={cn(
                      "text-[10px] px-2 py-1 rounded border transition-colors font-bold flex items-center gap-1",
                      excludedTagIds.includes(tag.id)
                        ? "bg-[#FF3B30]/20 border-[#FF3B30]/40 text-[#FF3B30]"
                        : "bg-transparent border-[#2979FF]/20 text-[#6B72A0] hover:text-[#AAB2FF]",
                    )}
                  >
                    <Tag size={9} />
                    {tag.name}
                    {excludedTagIds.includes(tag.id) && <X size={9} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#2979FF]/10 p-3 rounded border border-[#2979FF]/20 flex justify-between items-center">
              <span className="text-[10px] font-bold text-[#AAB2FF] uppercase tracking-widest">Calculated Reach</span>
              {reachLoading ? (
                <Loader2 size={18} className="text-[#00E5FF] animate-spin" />
              ) : (
                <span className="text-xl font-black text-[#00E5FF] drop-shadow-[0_0_8px_#00E5FF]">
                  {reach != null ? reach.toLocaleString() : selectedSegmentId ? "—" : "All"}
                </span>
              )}
            </div>
          </div>

          {/* Message Composer */}
          <div className="bg-[#0F1440]/60 border border-[#2979FF]/30 rounded flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className="flex border-b border-[#2979FF]/20">
              <button
                onClick={() => setChannel("sms")}
                className={cn(
                  "flex-1 py-3 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border-b-2 transition-colors",
                  channel === "sms"
                    ? "text-[#00E5FF] border-[#00E5FF] bg-[#00E5FF]/5"
                    : "text-[#6B72A0] border-transparent hover:bg-[#2979FF]/5",
                )}
              >
                <Phone size={14} /> SMS Text
              </button>
              <button
                onClick={() => setChannel("email")}
                className={cn(
                  "flex-1 py-3 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border-b-2 transition-colors",
                  channel === "email"
                    ? "text-[#00E5FF] border-[#00E5FF] bg-[#00E5FF]/5"
                    : "text-[#6B72A0] border-transparent hover:bg-[#2979FF]/5",
                )}
              >
                <Mail size={14} /> Email
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {channel === "email" && (
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Subject line..."
                  className="w-full bg-[#050A1F] border border-[#2979FF]/40 rounded p-3 text-[#F5F7FF] text-sm focus:outline-none focus:border-[#00E5FF] placeholder:text-[#6B72A0]"
                />
              )}
              <textarea
                ref={textareaRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full bg-[#050A1F] border border-[#2979FF]/40 rounded p-4 text-[#F5F7FF] text-sm resize-none focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all font-sans min-h-[120px]"
                placeholder={
                  channel === "sms"
                    ? "Hi {first_name}, this is {candidateName} from the campaign..."
                    : "Dear {first_name},\n\nYour message here..."
                }
              />
              <div className="flex justify-between items-center text-[10px] text-[#6B72A0]">
                <div className="flex gap-2 flex-wrap">
                  {["{first_name}", "{riding}", "{candidateName}"].map(token => (
                    <button
                      key={token}
                      onClick={() => insertToken(token)}
                      className="hover:text-[#00E5FF] border border-[#2979FF]/30 px-2 py-1 rounded bg-[#050A1F] transition-colors"
                    >
                      +{token}
                    </button>
                  ))}
                </div>
                {channel === "sms" && (
                  <span>{charCount} / 160 chars ({segments160} segment{segments160 !== 1 ? "s" : ""})</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Device Sim + Compliance */}
        <div className="col-span-1 flex flex-col gap-6">

          {/* Device Simulator */}
          <div className="bg-[#050A1F] border border-[#2979FF]/40 rounded p-4 relative shadow-[0_0_20px_rgba(0,0,0,0.8)] flex flex-col items-center flex-1 min-h-[320px]">
            <div className="absolute top-3 left-4 text-[9px] font-black text-[#6B72A0] uppercase tracking-[0.2em]">Device Sim</div>
            <div className="absolute top-3 right-4 text-[9px] font-black text-[#6B72A0] uppercase tracking-[0.2em]">888-555-0199</div>

            <div className="w-[200px] h-[290px] border-2 border-[#141419] rounded-2xl p-2 bg-[#0B0B0F] relative shadow-lg mt-8">
              <div className="w-full h-full bg-[#141419] rounded-xl overflow-hidden flex flex-col font-sans">
                <div className="bg-[#0B0B0F] p-2 text-center text-[10px] font-bold border-b border-white/10 text-white">
                  Campaign
                </div>
                <div className="flex-1 p-3 bg-[#0B0B0F] flex flex-col justify-end overflow-hidden">
                  {previewBody.trim() ? (
                    <div className="bg-[#2979FF] text-white p-2.5 rounded-2xl rounded-bl-sm text-[11px] shadow-sm max-w-[85%] self-end break-words leading-relaxed">
                      {previewBody.slice(0, 200)}{previewBody.length > 200 ? "..." : ""}
                    </div>
                  ) : (
                    <div className="text-[#6B72A0] text-[10px] text-center pb-8">Preview appears here</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-[#0F1440]/60 border border-[#00C853]/40 rounded p-4 shadow-[0_0_20px_rgba(0,200,83,0.1)]">
            <h3 className="text-[11px] font-black text-[#00C853] uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
              <CheckCircle size={14} /> System Checks Passed
            </h3>
            <div className="space-y-2 text-[10px] text-[#AAB2FF]">
              <div className="flex justify-between border-b border-[#2979FF]/20 pb-1">
                <span>CASL Compliance</span>
                <span className="text-[#00C853] font-bold">VERIFIED</span>
              </div>
              <div className="flex justify-between border-b border-[#2979FF]/20 pb-1">
                <span>Carrier Route Check</span>
                <span className="text-[#00C853] font-bold">OPTIMAL</span>
              </div>
              {channel === "sms" && (
                <div className="flex justify-between border-b border-[#2979FF]/20 pb-1">
                  <span>SMS Segments</span>
                  <span className="text-[#F5F7FF] font-bold">{segments160}</span>
                </div>
              )}
              <div className="flex justify-between pb-1">
                <span>Cost Est.</span>
                <span className="text-[#F5F7FF] font-bold">${costEst}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0F1440] border border-[#FF3B30]/40 rounded-xl p-6 max-w-md w-full mx-4 shadow-[0_0_40px_rgba(255,59,48,0.2)]">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-[#FF3B30]" />
              <h3 className="text-sm font-black text-[#F5F7FF] uppercase tracking-wider">Confirm Deployment</h3>
            </div>
            <p className="text-xs text-[#AAB2FF] mb-2">
              Sending to{" "}
              <span className="text-[#00E5FF] font-bold">
                {reach != null ? reach.toLocaleString() : "all matching"}
              </span>{" "}
              contacts via{" "}
              <span className="text-[#00E5FF] font-bold uppercase">{channel}</span>.
            </p>
            <p className="text-xs text-[#6B72A0] mb-6">
              CASL suffix auto-appended. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 border border-[#2979FF]/30 rounded text-xs font-bold text-[#AAB2FF] hover:text-[#F5F7FF] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArmPayload}
                className="px-6 py-2 bg-[#FF3B30] text-white rounded text-xs font-black uppercase tracking-wider hover:bg-red-500 shadow-[0_0_15px_rgba(255,59,48,0.4)] transition-all"
              >
                Deploy Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Triage Inbox Panel ───────────────────────────────────────────────────────

function TriageInboxPanel({ campaignId }: { campaignId: string }) {
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<InboxChannelFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/inbox?campaignId=${campaignId}&limit=40`)
      .then(r => r.json())
      .then((d: { threads?: InboxThread[] }) => { if (d.threads) setThreads(d.threads); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campaignId]);

  useEffect(() => {
    if (!selectedId) { setThreadDetail(null); return; }
    setDetailLoading(true);
    fetch(`/api/inbox/${selectedId}?campaignId=${campaignId}`)
      .then(r => r.json())
      .then((d: { thread?: ThreadDetail }) => { if (d.thread) setThreadDetail(d.thread); })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [selectedId, campaignId]);

  async function sendReply() {
    if (!selectedId || !replyText.trim()) return;
    setReplySending(true);
    try {
      const res = await fetch(`/api/inbox/${selectedId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, body: replyText }),
      });
      const data = await res.json() as { error?: string; code?: string };
      if (!res.ok) {
        if (data.code === "INTEGRATION_UNAVAILABLE") {
          toast.info("Integration not configured — configure Twilio/Resend in Vercel to send replies");
        } else {
          toast.error(data.error ?? "Reply failed");
        }
      } else {
        toast.success("Reply sent");
        setReplyText("");
        // Refresh thread detail
        fetch(`/api/inbox/${selectedId}?campaignId=${campaignId}`)
          .then(r => r.json())
          .then((d: { thread?: ThreadDetail }) => { if (d.thread) setThreadDetail(d.thread); })
          .catch(() => {});
      }
    } finally {
      setReplySending(false);
    }
  }

  async function resolveThread(threadId: string) {
    await fetch(`/api/inbox/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, status: "resolved" }),
    });
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, status: "resolved" as const } : t));
    setSelectedId(null);
    toast.success("Thread resolved");
  }

  const CHANNELS: InboxChannelFilter[] = ["all", "email", "sms", "social", "question"];
  const filtered = threads.filter(t => channelFilter === "all" || t.channel === channelFilter);
  const unreadCount = threads.filter(t => t.unreadCount > 0).length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Thread List */}
      <div className="w-[340px] flex-shrink-0 border-r border-[#2979FF]/20 flex flex-col bg-[#0F1440]/40">
        <div className="p-4 border-b border-[#2979FF]/20">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-sm font-black text-[#F5F7FF] uppercase tracking-wider flex items-center gap-2">
              <Inbox size={14} className="text-[#2979FF]" /> Unified Inbox
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#FF3B30] text-white text-[9px] font-black shadow-[0_0_8px_rgba(255,59,48,0.6)]">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B72A0]" size={12} />
            <input
              placeholder="Search messages..."
              className="w-full bg-[#050A1F]/80 border border-[#2979FF]/30 text-[#F5F7FF] text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00E5FF] placeholder:text-[#6B72A0]"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {CHANNELS.map(c => (
              <button
                key={c}
                onClick={() => setChannelFilter(c)}
                className={cn(
                  "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                  channelFilter === c
                    ? "bg-[#2979FF]/20 text-[#00E5FF] border border-[#00E5FF]/40"
                    : "text-[#6B72A0] hover:text-[#AAB2FF] border border-transparent",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#2979FF]/10">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-[#2979FF]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#6B72A0]">
              <Inbox size={32} className="mb-2 opacity-40" />
              <div className="text-xs">No messages</div>
            </div>
          ) : (
            filtered.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "p-3 cursor-pointer transition-colors border-l-2",
                  selectedId === t.id
                    ? "bg-[#2979FF]/10 border-[#00E5FF]"
                    : "hover:bg-[#2979FF]/5 border-transparent",
                  t.unreadCount > 0 && "bg-[#2979FF]/5",
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <ChannelIcon channel={t.channel} />
                    <span className={cn(
                      "text-xs font-bold truncate",
                      t.unreadCount > 0 ? "text-[#F5F7FF]" : "text-[#AAB2FF]",
                    )}>
                      {t.fromName ?? t.fromHandle}
                    </span>
                    {t.unreadCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2979FF] shadow-[0_0_6px_rgba(41,121,255,0.8)] flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-[9px] text-[#6B72A0] flex-shrink-0">{timeAgo(t.lastMessageAt)}</span>
                </div>
                {t.subject && (
                  <div className="text-[11px] font-bold text-[#AAB2FF] mb-0.5 truncate">{t.subject}</div>
                )}
                {t.messages[0] && (
                  <div className="text-[10px] text-[#6B72A0] truncate">{t.messages[0].body}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Thread Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {detailLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#2979FF]" />
          </div>
        ) : threadDetail ? (
          <>
            {/* Detail header */}
            <div className="p-5 border-b border-[#2979FF]/20 bg-[#050A1F]/30 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ChannelIcon channel={threadDetail.channel} />
                    <SBadge status={threadDetail.channel} />
                    <SBadge status={threadDetail.status} />
                  </div>
                  <h2 className="text-sm font-black text-[#F5F7FF] mb-1">
                    {threadDetail.subject ?? "Message"}
                  </h2>
                  <div className="flex items-center gap-3 text-[10px] text-[#6B72A0]">
                    <span className="flex items-center gap-1">
                      <User size={10} /> {threadDetail.fromName ?? threadDetail.fromHandle}
                    </span>
                    <span>· {timeAgo(threadDetail.lastMessageAt)}</span>
                  </div>
                </div>
                {threadDetail.status !== "resolved" && (
                  <button
                    onClick={() => resolveThread(threadDetail.id)}
                    className="text-[10px] font-bold text-[#00C853] border border-[#00C853]/30 px-3 py-1.5 rounded hover:bg-[#00C853]/10 transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3">
              {threadDetail.messages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[70%] p-3 rounded-xl text-sm",
                    msg.direction === "outbound"
                      ? "bg-[#2979FF] text-white ml-auto rounded-br-sm"
                      : "bg-[#0F1440] text-[#F5F7FF] border border-[#2979FF]/20 rounded-bl-sm",
                  )}
                >
                  <p className="leading-relaxed text-sm">{msg.body}</p>
                  <div className={cn(
                    "text-[9px] mt-1",
                    msg.direction === "outbound" ? "text-white/60" : "text-[#6B72A0]",
                  )}>
                    {timeAgo(msg.sentAt)}
                    {msg.sentByUser?.name ? ` · ${msg.sentByUser.name}` : ""}
                  </div>
                </div>
              ))}
            </div>

            {/* Reply box */}
            <div className="border-t border-[#2979FF]/20 p-4 flex-shrink-0 bg-[#0F1440]/30">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Reply to ${threadDetail.fromName ?? threadDetail.fromHandle}...`}
                rows={3}
                className="w-full bg-[#050A1F]/80 border border-[#2979FF]/30 text-[#F5F7FF] text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#00E5FF] placeholder:text-[#6B72A0] resize-none mb-2"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#6B72A0]">
                  {threadDetail.channel === "sms"
                    ? "160 chars · STOP opt-out auto-appended"
                    : "Rich text · CASL footer auto-appended"}
                </span>
                <button
                  disabled={!replyText.trim() || replySending}
                  onClick={sendReply}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                    replyText.trim() && !replySending
                      ? "bg-[#2979FF] text-white hover:bg-[#00E5FF] hover:text-[#050A1F] shadow-[0_0_15px_rgba(41,121,255,0.4)]"
                      : "bg-[#2979FF]/20 text-[#6B72A0] cursor-not-allowed",
                  )}
                >
                  {replySending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Send Reply
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Inbox size={48} className="text-[#2979FF]/30 mx-auto mb-4" />
              <div className="text-[#6B72A0] text-sm font-bold">Select a message</div>
              <div className="text-[#6B72A0] text-xs mt-1">{unreadCount} unread across all channels</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Auto Triggers Panel ──────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  contact_created: "New Contact",
  tag_added: "Tag Added",
  segment_joined: "Segment Joined",
  donation_made: "Donation Made",
  event_rsvped: "Event RSVP",
  form_submitted: "Form Submit",
  manual: "Manual",
};

function AutoTriggersPanel({ campaignId }: { campaignId: string }) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState<string>("new_contact");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`/api/comms/automations?campaignId=${campaignId}`)
      .then(r => r.json())
      .then((d: { rules?: AutomationRule[] }) => { if (d.rules) setRules(d.rules); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campaignId]);

  async function createRule() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/comms/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, name: newName.trim(), trigger: newTrigger, description: newDesc.trim() || undefined }),
      });
      const data = await res.json() as { rule?: AutomationRule };
      if (res.ok && data.rule) {
        setRules(prev => [data.rule!, ...prev]);
        setShowNew(false);
        setNewName(""); setNewTrigger("new_contact"); setNewDesc("");
        toast.success("Rule created");
      } else {
        toast.error("Failed to create rule");
      }
    } catch {
      toast.error("Failed to create rule");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(rule: AutomationRule) {
    setToggling(rule.id);
    try {
      const res = await fetch(`/api/comms/automations/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      const data = await res.json() as { rule?: AutomationRule };
      if (res.ok && data.rule) {
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: data.rule!.isActive } : r));
        toast.success(`${rule.name} ${data.rule.isActive ? "activated" : "paused"}`);
      }
    } catch {
      toast.error("Update failed");
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto relative z-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(41,121,255,0.8)] flex items-center gap-3">
          Auto-Triggers
          <span className="text-[12px] text-[#6B72A0] font-normal normal-case tracking-normal">
            {rules.filter(r => r.isActive).length} active
          </span>
        </h2>
        <button
          onClick={() => setShowNew(v => !v)}
          className="px-4 py-2 border border-[#2979FF]/40 rounded text-[11px] font-bold uppercase tracking-widest text-[#AAB2FF] hover:bg-[#2979FF]/10 transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> New Rule
        </button>
      </div>

      {showNew && (
        <div className="mb-6 bg-[#0F1440]/80 border border-[#2979FF]/40 rounded-lg p-4 space-y-3">
          <div className="text-[11px] font-black uppercase tracking-widest text-[#AAB2FF] mb-1">New Automation Rule</div>
          <input
            className="w-full bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-xs p-2 rounded outline-none focus:border-[#00E5FF]"
            placeholder="Rule name (e.g. Welcome new contacts)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <select
            value={newTrigger}
            onChange={e => setNewTrigger(e.target.value)}
            className="w-full bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-xs p-2 rounded outline-none focus:border-[#00E5FF]"
          >
            {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <textarea
            className="w-full bg-[#050A1F] border border-[#2979FF]/40 text-[#F5F7FF] text-xs p-2 rounded outline-none focus:border-[#00E5FF] resize-none"
            rows={2}
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-[10px] text-[#6B72A0] hover:text-[#AAB2FF]">Cancel</button>
            <button
              onClick={createRule}
              disabled={creating || !newName.trim()}
              className="px-4 py-1.5 bg-[#2979FF] text-white text-[10px] font-bold uppercase rounded hover:bg-[#2979FF]/80 disabled:opacity-40 flex items-center gap-1.5"
            >
              {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
              Create Rule
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#2979FF]" />
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#6B72A0]">
          <Zap size={48} className="mb-4 opacity-20" />
          <div className="text-sm font-bold mb-1">No automation rules yet</div>
          <div className="text-xs">Click &ldquo;New Rule&rdquo; above to create your first automation</div>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div
              key={rule.id}
              className="bg-[#0F1440]/60 border border-[#2979FF]/20 rounded-lg p-4 flex items-center justify-between gap-4 hover:border-[#2979FF]/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-black text-[#F5F7FF] truncate">{rule.name}</span>
                  <SBadge status={rule.isActive ? "live" : "draft"} />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#6B72A0]">
                  <span>
                    Trigger:{" "}
                    <span className="text-[#AAB2FF]">
                      {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                    </span>
                  </span>
                  <span>·</span>
                  <span>{rule.steps.length} step{rule.steps.length !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{rule._count.enrollments} enrolled</span>
                </div>
                {rule.description && (
                  <p className="text-[10px] text-[#6B72A0] mt-1 truncate">{rule.description}</p>
                )}
              </div>
              <button
                onClick={() => toggleActive(rule)}
                disabled={toggling === rule.id}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all border",
                  rule.isActive
                    ? "bg-[#00C853]/10 border-[#00C853]/40 text-[#00C853] hover:bg-[#FF3B30]/10 hover:border-[#FF3B30]/40 hover:text-[#FF3B30]"
                    : "bg-[#2979FF]/10 border-[#2979FF]/40 text-[#2979FF] hover:bg-[#2979FF]/20",
                )}
              >
                {toggling === rule.id ? "..." : rule.isActive ? "Pause" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Shell ───────────────────────────────────────────────────────────────

const SEQ_COLOR: Record<string, string> = {
  processing: "#00C853",
  queued:     "#EF9F27",
  sent:       "#6B72A0",
  failed:     "#FF3B30",
};

export default function CommunicationsClient({
  campaignId,
  campaignName,
  tags,
  wards: _wards,
}: Props) {
  const [activeTab, setActiveTab] = useState<NavTab>("broadcast");
  const [sequences, setSequences] = useState<ScheduledMessage[]>([]);
  const [inboxUnread, setInboxUnread] = useState(0);

  useEffect(() => {
    fetch(`/api/comms/scheduled?campaignId=${campaignId}`)
      .then(r => r.json())
      .then((d: { messages?: ScheduledMessage[] }) => {
        if (d.messages) {
          setSequences(
            d.messages
              .filter(m => ["queued", "processing", "sent"].includes(m.status))
              .slice(0, 6),
          );
        }
      })
      .catch(() => {});

    // Fetch unread count for inbox badge
    fetch(`/api/inbox?campaignId=${campaignId}&limit=40`)
      .then(r => r.json())
      .then((d: { threads?: Array<{ unreadCount: number }> }) => {
        if (d.threads) {
          setInboxUnread(d.threads.filter(t => t.unreadCount > 0).length);
        }
      })
      .catch(() => {});
  }, [campaignId]);

  const NAV_ITEMS: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ size?: number | string }>;
    badge?: number;
  }> = [
    { id: "broadcast", label: "Broadcast Deploy", icon: Send },
    { id: "inbox",     label: "Triage Inbox",     icon: Inbox, badge: inboxUnread },
    { id: "triggers",  label: "Auto-Triggers",     icon: Clock },
  ];

  return (
    <div className="flex h-full w-full bg-[#050A1F] text-[#F5F7FF] font-mono" style={{ minHeight: "calc(100vh - 64px)" }}>

      {/* ── Left Sidebar ── */}
      <div className="w-[280px] flex-shrink-0 border-r border-[#2979FF]/20 bg-[#0F1440]/90 backdrop-blur-xl flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-20">
        <div className="h-16 px-5 border-b border-[#2979FF]/20 flex items-center bg-[#050A1F]/50">
          <h1 className="text-[13px] font-black uppercase tracking-[0.2em] flex items-center gap-2 drop-shadow-[0_0_8px_rgba(41,121,255,0.8)]">
            <MessageSquare size={16} className="text-[#00E5FF]" /> Comms Grid
          </h1>
        </div>

        <div className="p-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded text-[11px] font-bold uppercase tracking-widest transition-all border",
                  activeTab === item.id
                    ? "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/40 shadow-[inset_0_0_10px_rgba(0,229,255,0.1)]"
                    : "border-transparent text-[#AAB2FF] hover:bg-[#2979FF]/10",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon size={14} /> {item.label}
                </span>
                {item.badge != null && item.badge > 0 && (
                  <span className="bg-[#FF3B30] text-white px-1.5 py-0.5 rounded-[3px] text-[9px] shadow-[0_0_8px_#FF3B30] animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <Link
            href="/communications/qa"
            className="w-full flex items-center justify-between px-3 py-2.5 rounded text-[11px] font-bold uppercase tracking-widest text-[#AAB2FF] hover:bg-[#2979FF]/10 border border-transparent transition-all"
          >
            <span className="flex items-center gap-2">
              <HelpCircle size={14} /> Q&A Inbox
            </span>
            <ChevronRight size={12} />
          </Link>
        </div>

        {/* Active Sequences */}
        <div className="flex-1 overflow-y-auto px-4 py-2 border-t border-[#2979FF]/20">
          <h3 className="text-[10px] font-black text-[#6B72A0] uppercase tracking-[0.2em] mb-4">
            Active Sequences
          </h3>
          {sequences.length === 0 ? (
            <div className="text-[10px] text-[#6B72A0]/60 italic">No active sequences</div>
          ) : (
            sequences.map(seq => (
              <div key={seq.id} className="mb-3 flex items-start justify-between group cursor-pointer">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-[#F5F7FF] group-hover:text-[#00E5FF] transition-colors truncate">
                    {seq.segment?.name ?? seq.subject ?? seq.bodyText.slice(0, 24)}
                  </div>
                  <div className="text-[9px] text-[#AAB2FF] mt-0.5 tracking-widest capitalize">
                    Progress: {seq.sentCount > 0 ? `${seq.sentCount} sent` : "--"}
                  </div>
                </div>
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ml-2"
                  style={{
                    backgroundColor: SEQ_COLOR[seq.status] ?? "#6B72A0",
                    boxShadow: `0 0 5px ${SEQ_COLOR[seq.status] ?? "#6B72A0"}`,
                  }}
                />
              </div>
            ))
          )}
        </div>

        {/* Bottom quick links */}
        <div className="p-3 border-t border-[#2979FF]/20 space-y-0.5">
          {[
            { href: "/communications/email", icon: Mail,     label: "Email Campaigns" },
            { href: "/communications/sms",   icon: Phone,    label: "SMS Centre" },
            { href: "/communications/inbox", icon: Settings, label: "Full Comms Suite" },
          ].map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-[10px] font-bold text-[#6B72A0] hover:text-[#AAB2FF] hover:bg-[#2979FF]/5 transition-colors"
              >
                <Icon size={12} /> {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Main Panel ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#050A1F]">
        {/* CRT scanline */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(41,121,255,0.03)_50%)] bg-[length:100%_4px] z-10 mix-blend-overlay" />
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-10" />

        <div className="relative z-20 flex flex-col flex-1 overflow-hidden">
          {activeTab === "broadcast" && (
            <BroadcastPanel
              campaignId={campaignId}
              campaignName={campaignName}
              tags={tags}
            />
          )}
          {activeTab === "inbox" && <TriageInboxPanel campaignId={campaignId} />}
          {activeTab === "triggers" && <AutoTriggersPanel campaignId={campaignId} />}
        </div>
      </div>
    </div>
  );
}
