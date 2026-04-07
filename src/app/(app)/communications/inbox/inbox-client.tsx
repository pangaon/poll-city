"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox, Mail, MessageSquare, Globe, MessageCircle,
  Filter, CheckCircle2,
} from "lucide-react";

interface LogItem {
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

interface QuestionItem {
  id: string;
  name: string | null;
  email: string | null;
  question: string;
  createdAt: string;
}

interface MentionItem {
  id: string;
  platform: string;
  authorHandle: string | null;
  authorName: string | null;
  content: string;
  url: string | null;
  mentionedAt: string;
  sentiment: string;
  needsResponse: boolean;
}

type InboxEntry = {
  id: string;
  type: "email" | "sms" | "question" | "mention";
  title: string;
  body: string;
  meta: string;
  date: Date;
  raw: LogItem | QuestionItem | MentionItem;
};

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  question: MessageCircle,
  mention: Globe,
};

const CHANNEL_COLORS = {
  email: { bg: "bg-[#1D9E75]/10", text: "text-[#1D9E75]" },
  sms: { bg: "bg-blue-100", text: "text-blue-700" },
  question: { bg: "bg-violet-100", text: "text-violet-700" },
  mention: { bg: "bg-amber-100", text: "text-amber-700" },
};

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

function buildEntries(
  logs: LogItem[],
  questions: QuestionItem[],
  mentions: MentionItem[]
): InboxEntry[] {
  const entries: InboxEntry[] = [];

  for (const log of logs) {
    const isSms = log.title?.toLowerCase().includes("sms") || log.body?.toLowerCase().includes("sms");
    entries.push({
      id: `log-${log.id}`,
      type: isSms ? "sms" : "email",
      title: log.title,
      body: `${log.deliveredCount.toLocaleString()} delivered, ${log.failedCount.toLocaleString()} failed, ${log.totalSubscribers.toLocaleString()} audience`,
      meta: log.status,
      date: new Date(log.sentAt ?? log.createdAt),
      raw: log,
    });
  }

  for (const q of questions) {
    entries.push({
      id: `q-${q.id}`,
      type: "question",
      title: q.name ?? "Anonymous",
      body: q.question,
      meta: q.email ?? "",
      date: new Date(q.createdAt),
      raw: q,
    });
  }

  for (const m of mentions) {
    entries.push({
      id: `m-${m.id}`,
      type: "mention",
      title: `${m.platform.toUpperCase()} -- ${m.authorHandle ?? m.authorName ?? "Unknown"}`,
      body: m.content,
      meta: m.sentiment,
      date: new Date(m.mentionedAt),
      raw: m,
    });
  }

  entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  return entries;
}

export default function InboxClient({
  logs,
  questions,
  mentions,
}: {
  logs: LogItem[];
  questions: QuestionItem[];
  mentions: MentionItem[];
}) {
  const [filter, setFilter] = useState<"all" | "email" | "sms" | "question" | "mention">("all");

  const entries = useMemo(() => buildEntries(logs, questions, mentions), [logs, questions, mentions]);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((e) => e.type === filter);
  }, [entries, filter]);

  const counts = useMemo(() => {
    const c = { all: entries.length, email: 0, sms: 0, question: 0, mention: 0 };
    for (const e of entries) c[e.type]++;
    return c;
  }, [entries]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 pb-[env(safe-area-inset-bottom)]">
      <motion.header
        className="mb-5"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-[#0A2342] flex items-center gap-2">
          <Inbox className="w-7 h-7 text-[#1D9E75]" /> Unified Inbox
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          All communications -- sent emails, SMS blasts, incoming questions, and social mentions -- in one view.
        </p>
      </motion.header>

      {/* filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {(
          [
            { key: "all" as const, label: "All", icon: Filter },
            { key: "email" as const, label: "Email", icon: Mail },
            { key: "sms" as const, label: "SMS", icon: MessageSquare },
            { key: "question" as const, label: "Questions", icon: MessageCircle },
            { key: "mention" as const, label: "Mentions", icon: Globe },
          ] as const
        ).map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 min-h-[44px] px-4 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                filter === f.key
                  ? "bg-[#0A2342] text-white border-[#0A2342]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#1D9E75]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {f.label}
              <span className={`ml-0.5 text-[10px] ${filter === f.key ? "text-white/70" : "text-slate-400"}`}>
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* entries */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Inbox className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-lg font-bold text-slate-700">Nothing here yet</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Your unified inbox collects every campaign communication in one place — sent emails, SMS blasts, voter questions, and social media mentions. Send your first email or SMS blast from the Communications page to see it here.
            </p>
          </motion.div>
        ) : (
          <motion.ul
            key={filter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {filtered.map((entry, i) => {
              const Icon = CHANNEL_ICONS[entry.type];
              const colors = CHANNEL_COLORS[entry.type];
              return (
                <motion.li
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: i * 0.03 }}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colors.bg}`}
                  >
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#0A2342] truncate text-sm">
                        {entry.title}
                      </p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {entry.type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">
                      {entry.body}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {entry.meta && `${entry.meta} · `}
                      {entry.date.toLocaleString()}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
