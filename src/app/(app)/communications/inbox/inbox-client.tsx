"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox, Mail, MessageSquare, Filter, ChevronLeft,
  Send, CheckCircle2, Clock, AlertCircle, RefreshCw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Channel = "email" | "sms";
type ThreadStatus = "open" | "resolved" | "snoozed";
type Direction = "inbound" | "outbound";

interface ThreadContact {
  id: string;
  firstName: string;
  lastName: string;
}

interface ThreadPreviewMessage {
  body: string;
  direction: Direction;
  sentAt: string;
}

interface InboxThread {
  id: string;
  channel: Channel;
  status: ThreadStatus;
  subject: string | null;
  fromHandle: string;
  fromName: string | null;
  lastMessageAt: string;
  unreadCount: number;
  contact: ThreadContact | null;
  messages: ThreadPreviewMessage[];
}

interface InboxMessageSender {
  id: string;
  name: string | null;
}

interface InboxMessage {
  id: string;
  direction: Direction;
  fromHandle: string;
  toHandle: string;
  body: string;
  bodyHtml: string | null;
  sentAt: string;
  sentByUser: InboxMessageSender | null;
}

interface ThreadDetail extends Omit<InboxThread, "messages"> {
  messages: InboxMessage[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const CHANNEL_ICONS: Record<Channel, typeof Mail> = { email: Mail, sms: MessageSquare };
const CHANNEL_COLORS: Record<Channel, { bg: string; text: string }> = {
  email: { bg: "bg-[#1D9E75]/10", text: "text-[#1D9E75]" },
  sms: { bg: "bg-blue-50", text: "text-blue-700" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function displayName(thread: InboxThread | ThreadDetail): string {
  if (thread.contact) {
    return `${thread.contact.firstName} ${thread.contact.lastName}`.trim();
  }
  return thread.fromName ?? thread.fromHandle;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((now - then) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

// ─── Thread List Item ─────────────────────────────────────────────────────────

function ThreadItem({
  thread,
  selected,
  onClick,
}: {
  thread: InboxThread;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = CHANNEL_ICONS[thread.channel];
  const colors = CHANNEL_COLORS[thread.channel];
  const preview = thread.messages[0];
  const name = displayName(thread);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-slate-100 transition-colors flex gap-3 items-start min-h-[72px] ${
        selected
          ? "bg-[#0A2342]/5 border-l-2 border-l-[#1D9E75]"
          : "hover:bg-slate-50 border-l-2 border-l-transparent"
      }`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colors.bg}`}>
        <Icon className={`w-4 h-4 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <span className={`font-semibold text-sm truncate ${thread.unreadCount > 0 ? "text-[#0A2342]" : "text-slate-700"}`}>
            {name}
          </span>
          <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
            {relativeTime(thread.lastMessageAt)}
          </span>
        </div>
        {thread.subject && (
          <p className="text-xs text-slate-600 truncate mt-0.5">{thread.subject}</p>
        )}
        {preview && (
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {preview.direction === "outbound" ? "You: " : ""}
            {preview.body}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
            {thread.channel}
          </span>
          {thread.status === "resolved" && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
              resolved
            </span>
          )}
          {thread.unreadCount > 0 && (
            <span className="ml-auto w-5 h-5 rounded-full bg-[#1D9E75] text-white text-[10px] font-bold flex items-center justify-center">
              {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: InboxMessage }) {
  const isOut = msg.direction === "outbound";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isOut
            ? "bg-[#0A2342] text-white rounded-br-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
        <p className={`text-[10px] mt-1 ${isOut ? "text-white/60" : "text-slate-400"}`}>
          {isOut && msg.sentByUser ? `${msg.sentByUser.name ?? "You"} · ` : ""}
          {new Date(msg.sentAt).toLocaleString("en-CA", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

// ─── Thread Pane ─────────────────────────────────────────────────────────────

function ThreadPane({
  campaignId,
  threadId,
  onBack,
  onResolved,
}: {
  campaignId: string;
  threadId: string;
  onBack: () => void;
  onResolved: (id: string) => void;
}) {
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inbox/${threadId}?campaignId=${campaignId}`);
      if (res.ok) {
        const data = (await res.json()) as { thread: ThreadDetail };
        setThread(data.thread);
      }
    } finally {
      setLoading(false);
    }
  }, [campaignId, threadId]);

  useEffect(() => {
    void fetchThread();
  }, [fetchThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  async function handleSend() {
    if (!replyBody.trim() || sending) return;
    setSending(true);
    setSendError(null);

    const optimistic: InboxMessage = {
      id: `opt-${Date.now()}`,
      direction: "outbound",
      fromHandle: "you",
      toHandle: thread?.fromHandle ?? "",
      body: replyBody,
      bodyHtml: null,
      sentAt: new Date().toISOString(),
      sentByUser: null,
    };
    setThread((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev,
    );
    const bodySnapshot = replyBody;
    setReplyBody("");

    try {
      const res = await fetch(`/api/inbox/${threadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, body: bodySnapshot }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Send failed");
      }
      void fetchThread();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Failed to send");
      setThread((prev) =>
        prev
          ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimistic.id) }
          : prev,
      );
      setReplyBody(bodySnapshot);
    } finally {
      setSending(false);
    }
  }

  async function handleResolve() {
    if (!thread || resolving) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/inbox/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, status: "resolved" }),
      });
      if (res.ok) onResolved(threadId);
    } finally {
      setResolving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-slate-300 animate-spin" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Thread not found
      </div>
    );
  }

  const colors = CHANNEL_COLORS[thread.channel];
  const Icon = CHANNEL_ICONS[thread.channel];
  const name = displayName(thread);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colors.bg}`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0A2342] text-sm truncate">{name}</p>
          <p className="text-xs text-slate-400 truncate">{thread.fromHandle}</p>
        </div>
        {thread.status !== "resolved" ? (
          <button
            onClick={() => void handleResolve()}
            disabled={resolving}
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#1D9E75] px-3 py-1.5 rounded-full border border-[#1D9E75]/30 hover:bg-[#1D9E75]/10 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolve
          </button>
        ) : (
          <span className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-slate-400 px-3 py-1.5 rounded-full bg-slate-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50">
        {thread.messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400 mt-8">No messages yet</p>
        ) : (
          thread.messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply box */}
      {thread.status !== "resolved" && (
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {sendError && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 mb-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {sendError}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={
                thread.channel === "email"
                  ? "Type your reply… (⌘↵ to send)"
                  : "Type your SMS reply… (⌘↵ to send)"
              }
              rows={3}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75] placeholder:text-slate-400"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!replyBody.trim() || sending}
              className="shrink-0 w-10 h-10 rounded-xl bg-[#0A2342] text-white flex items-center justify-center hover:bg-[#0A2342]/90 transition-colors disabled:opacity-40"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          {thread.channel === "sms" && (
            <p className="text-[10px] text-slate-400 mt-1.5">
              {replyBody.length}/320 characters
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

type ChannelFilter = "all" | Channel;
type StatusFilter = "open" | "resolved";

export default function InboxClient({
  campaignId,
  initialThreads,
}: {
  campaignId: string;
  initialThreads: InboxThread[];
}) {
  const [threads, setThreads] = useState<InboxThread[]>(initialThreads);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialThreads.length >= 40
      ? initialThreads[initialThreads.length - 1]?.lastMessageAt ?? null
      : null,
  );
  const [showThread, setShowThread] = useState(false);

  const filtered = threads.filter((t) => {
    if (channelFilter !== "all" && t.channel !== channelFilter) return false;
    return t.status === statusFilter;
  });

  const counts = {
    open: threads.filter((t) => t.status === "open").length,
    resolved: threads.filter((t) => t.status === "resolved").length,
    unread: threads.filter((t) => t.unreadCount > 0).length,
  };

  async function loadMore() {
    if (loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ campaignId, cursor: nextCursor, limit: "30" });
      if (channelFilter !== "all") params.set("channel", channelFilter);
      const res = await fetch(`/api/inbox?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { threads: InboxThread[]; nextCursor: string | null };
        setThreads((prev) => {
          const ids = new Set(prev.map((t) => t.id));
          return [...prev, ...data.threads.filter((t) => !ids.has(t.id))];
        });
        setNextCursor(data.nextCursor);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  function handleSelectThread(id: string) {
    setSelectedId(id);
    setShowThread(true);
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unreadCount: 0 } : t)),
    );
  }

  function handleResolved(id: string) {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "resolved" } : t)),
    );
    setShowThread(false);
    setSelectedId(null);
  }

  return (
    <div className="h-[calc(100dvh-64px)] flex flex-col">
      {/* Top bar */}
      <motion.div
        className="shrink-0 px-4 py-4 border-b border-slate-200 bg-white"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-[#0A2342] flex items-center gap-2">
            <Inbox className="w-5 h-5 text-[#1D9E75]" />
            Unified Inbox
            {counts.unread > 0 && (
              <span className="text-xs font-bold bg-[#1D9E75] text-white px-2 py-0.5 rounded-full">
                {counts.unread} unread
              </span>
            )}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["open", "resolved"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`min-h-[36px] px-3 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                statusFilter === s
                  ? "bg-[#0A2342] text-white border-[#0A2342]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#1D9E75]"
              }`}
            >
              {s === "open" ? (
                <Clock className="w-3 h-3" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              {s === "open" ? "Open" : "Resolved"}
              <span className="opacity-60 text-[10px]">
                {s === "open" ? counts.open : counts.resolved}
              </span>
            </button>
          ))}

          <div className="w-px bg-slate-200 self-stretch mx-0.5" />

          {(
            [
              { key: "all" as ChannelFilter, label: "All", icon: Filter },
              { key: "email" as ChannelFilter, label: "Email", icon: Mail },
              { key: "sms" as ChannelFilter, label: "SMS", icon: MessageSquare },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setChannelFilter(key)}
              className={`min-h-[36px] px-3 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                channelFilter === key
                  ? "bg-[#0A2342] text-white border-[#0A2342]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#1D9E75]"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Body: two-panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thread list panel */}
        <div
          className={`md:w-80 lg:w-96 md:border-r border-slate-200 flex flex-col ${
            showThread ? "hidden md:flex" : "flex w-full"
          }`}
        >
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 px-6 text-center"
                >
                  <Inbox className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="font-semibold text-slate-600 text-sm">
                    {statusFilter === "open"
                      ? "No open conversations"
                      : "No resolved conversations"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Inbound emails and SMS replies from contacts appear here automatically.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={`${channelFilter}-${statusFilter}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {filtered.map((thread) => (
                    <ThreadItem
                      key={thread.id}
                      thread={thread}
                      selected={selectedId === thread.id}
                      onClick={() => handleSelectThread(thread.id)}
                    />
                  ))}
                  {nextCursor && (
                    <div className="px-4 py-3 text-center">
                      <button
                        onClick={() => void loadMore()}
                        disabled={loadingMore}
                        className="text-xs text-[#1D9E75] font-semibold hover:underline disabled:opacity-50"
                      >
                        {loadingMore ? "Loading…" : "Load more"}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Thread detail panel */}
        <div
          className={`flex-1 flex flex-col ${
            !showThread ? "hidden md:flex" : "flex w-full"
          }`}
        >
          <AnimatePresence mode="wait">
            {selectedId ? (
              <motion.div
                key={selectedId}
                className="flex-1 flex flex-col overflow-hidden"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={spring}
              >
                <ThreadPane
                  campaignId={campaignId}
                  threadId={selectedId}
                  onBack={() => setShowThread(false)}
                  onResolved={handleResolved}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty-state"
                className="hidden md:flex flex-1 items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-center">
                  <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-medium">
                    Select a conversation
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
