"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { stripMarkdown } from "@/lib/adoni/formatting";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolName?: string;
};

type AdoniMode = "bubble" | "panel" | "fullscreen";

type StructuredMode =
  | "none"
  | "stats"
  | "contacts"
  | "email"
  | "roster"
  | "gotv";

interface StructuredData {
  mode: StructuredMode;
  payload?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Colours                                                            */
/* ------------------------------------------------------------------ */

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _msgId = 0;
function nextId(): string {
  _msgId += 1;
  return `msg-${_msgId}-${Date.now()}`;
}

const TOOL_LABELS: Record<string, string> = {
  search_contacts: "Searching contacts",
  get_campaign_stats: "Pulling campaign stats",
  get_gotv_breakdown: "Building GOTV breakdown",
  build_call_list: "Building call list",
  draft_email: "Drafting email",
  get_volunteer_roster: "Loading volunteer roster",
  search_voters: "Searching voters",
  get_election_results: "Loading election results",
  get_canvass_stats: "Pulling canvass stats",
  get_financial_summary: "Pulling financial summary",
  get_upcoming_events: "Loading events",
  get_walk_list: "Building walk list",
  log_interaction: "Logging interaction",
  update_contact: "Updating contact",
  schedule_followup: "Scheduling follow-up",
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? "Working on it";
}

const STRUCTURED_HINTS: Record<Exclude<StructuredMode, "none">, RegExp[]> = {
  stats: [/support rate/i, /doors knocked/i, /finance/i, /days to election/i],
  contacts: [/contact table/i, /call list/i, /support level/i],
  email: [/subject/i, /open in composer/i, /draft email/i],
  roster: [/volunteer/i, /availability/i],
  gotv: [/p1/i, /p2/i, /p3/i, /p4/i, /gotv/i],
};

function inferStructuredMode(text: string): StructuredMode {
  for (const [mode, patterns] of Object.entries(STRUCTURED_HINTS)) {
    if (patterns.some((p) => p.test(text))) {
      return mode as StructuredMode;
    }
  }
  return "none";
}

function cycleMode(current: AdoniMode, mobile: boolean): AdoniMode {
  if (mobile) return current === "bubble" ? "panel" : "bubble";
  if (current === "bubble") return "panel";
  if (current === "panel") return "fullscreen";
  return "bubble";
}

function contextualSuggestions(path: string): string[] {
  if (path.includes("/canvassing") || path.startsWith("/canvass")) {
    return [
      "Best next 5 doors",
      "Quick persuasion script",
      "Log revisit priorities",
      "Volunteer handoff notes",
    ];
  }
  if (path.startsWith("/contacts")) {
    return [
      "Build follow-up list",
      "Top undecided contacts",
      "Tag high-priority voters",
      "Draft call script",
    ];
  }
  if (path.startsWith("/gotv")) {
    return [
      "GOTV status",
      "P1 no-response list",
      "Rides needed today",
      "Election day checklist",
    ];
  }
  if (path.startsWith("/volunteers")) {
    return [
      "Volunteer roster",
      "Fill unassigned shifts",
      "Who is over-capacity",
      "Tonight's action plan",
    ];
  }
  return ["Daily brief", "Volunteer roster", "GOTV status", "Build a call list"];
}

function storageKey(campaignId: string): string {
  return `adoni:chat:${campaignId}`;
}

function loadHistory(campaignId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(campaignId));
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

function saveHistory(campaignId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(storageKey(campaignId), JSON.stringify(messages.slice(-100)));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

function roleBadgeClass(level: string): string {
  if (/strong/i.test(level)) return "bg-emerald-100 text-emerald-700";
  if (/leaning/i.test(level)) return "bg-blue-100 text-blue-700";
  if (/undecided/i.test(level)) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

/* ------------------------------------------------------------------ */
/*  Default structured data (placeholder until real API)               */
/* ------------------------------------------------------------------ */

const DEFAULT_STRUCTURED: Record<Exclude<StructuredMode, "none">, Record<string, unknown>> = {
  stats: {
    supportRate: null,
    doorsToday: null,
    activeVolunteers: null,
    financePace: null,
    daysToElection: null,
    missingReceipts: null,
  },
  contacts: { rows: [] },
  email: { subject: "", body: "" },
  roster: { rows: [] },
  gotv: {
    p1: null,
    p2: null,
    p3: null,
    p4: null,
    voted: null,
    totalSupporters: null,
    actions: [],
  },
};

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const bubbleSpring = { type: "spring" as const, stiffness: 400, damping: 25 };
const panelSpring = { type: "spring" as const, stiffness: 300, damping: 30 };
const messageSpring = { type: "spring" as const, stiffness: 350, damping: 28 };

/* ------------------------------------------------------------------ */
/*  Shimmer component                                                  */
/* ------------------------------------------------------------------ */

function Shimmer({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="relative h-4 w-4 overflow-hidden rounded-full" style={{ background: GREEN }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
            animation: "adoni-shimmer 1.4s ease-in-out infinite",
          }}
        />
      </div>
      <span className="text-xs text-slate-500">{label}...</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MessageBubble                                                      */
/* ------------------------------------------------------------------ */

function MessageBubble({ msg, isLast, streaming }: { msg: ChatMessage; isLast: boolean; streaming: boolean }) {
  const isUser = msg.role === "user";
  const displayText = isUser ? msg.content : stripMarkdown(msg.content);
  const showThinking = !isUser && isLast && streaming && !msg.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={messageSpring}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
        style={
          isUser
            ? { backgroundColor: "#e2e8f0", color: "#1e293b" }
            : { backgroundColor: NAVY, color: "#ffffff" }
        }
      >
        {msg.toolName && !msg.content && <Shimmer label={toolLabel(msg.toolName)} />}
        {showThinking ? (
          <span className="text-blue-200">Thinking...</span>
        ) : (
          displayText
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  MessageArea                                                        */
/* ------------------------------------------------------------------ */

function MessageArea({
  messages,
  streaming,
  scrollerRef,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  scrollerRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-white">
      {messages.length === 0 && (
        <p className="text-sm text-slate-500">
          Ask anything about campaign priorities and execution.
        </p>
      )}
      {messages.map((m, idx) => (
        <MessageBubble
          key={m.id}
          msg={m}
          isLast={idx === messages.length - 1}
          streaming={streaming}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  InputBar                                                           */
/* ------------------------------------------------------------------ */

function InputBar({
  prompt,
  setPrompt,
  streaming,
  onSend,
  suggestions,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  streaming: boolean;
  onSend: (text: string) => void;
  suggestions: string[];
}) {
  return (
    <div className="border-t border-slate-200 px-3 pt-2 pb-3 bg-white">
      <div className="mb-2 flex gap-2 overflow-x-auto">
        {suggestions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSend(item)}
            className="whitespace-nowrap rounded-full border px-3 py-1 text-xs hover:opacity-80"
            style={{
              borderColor: GREEN,
              color: GREEN,
              backgroundColor: "rgba(29,158,117,0.06)",
              minHeight: 44,
            }}
          >
            <Sparkles className="inline mr-1 h-3.5 w-3.5" />
            {item}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSend(prompt);
        }}
      >
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask Adoni"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ minHeight: 44, "--tw-ring-color": GREEN } as React.CSSProperties}
        />
        <button
          type="submit"
          disabled={streaming || !prompt.trim()}
          className="inline-flex items-center justify-center rounded-lg text-white disabled:opacity-50"
          style={{ backgroundColor: NAVY, height: 44, width: 44 }}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

function PanelHeader({
  mode,
  isMobile,
  onClose,
  onToggleFullscreen,
}: {
  mode: AdoniMode;
  isMobile: boolean;
  onClose: () => void;
  onToggleFullscreen: () => void;
}) {
  return (
    <header
      className="flex items-center justify-between px-4 py-3 text-white"
      style={{ backgroundColor: NAVY }}
    >
      <div>
        <p className="text-sm font-semibold">Adoni</p>
        <p className="text-[11px] text-blue-200">Campaign assistant</p>
      </div>
      <div className="flex items-center gap-1">
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="rounded-md p-1.5 hover:bg-white/10"
            style={{ minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label={mode === "fullscreen" ? "Collapse to panel" : "Expand to fullscreen"}
          >
            {mode === "fullscreen" ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 hover:bg-white/10"
          style={{ minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="Close Adoni"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  StructuredPanel                                                    */
/* ------------------------------------------------------------------ */

function StructuredPanel({ structured }: { structured: StructuredData }) {
  const { mode } = structured;

  if (mode === "none") {
    return (
      <div className="h-full rounded-2xl border border-dashed border-slate-300 bg-white p-6 flex flex-col justify-center">
        <p className="text-lg font-semibold text-slate-900">Structured Output</p>
        <p className="mt-2 text-sm text-slate-600">
          Ask Adoni a question and structured data will appear here.
        </p>
      </div>
    );
  }

  if (mode === "stats") {
    const p = (structured.payload ?? DEFAULT_STRUCTURED.stats) as Record<string, number | null>;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {(
          [
            ["Support rate", p.supportRate != null ? `${p.supportRate}%` : "—"],
            ["Doors knocked today", p.doorsToday != null ? String(p.doorsToday) : "—"],
            ["Active volunteers", p.activeVolunteers != null ? String(p.activeVolunteers) : "—"],
            ["Finance pace", p.financePace != null ? `${p.financePace}%` : "—"],
            ["Days to election", p.daysToElection != null ? String(p.daysToElection) : "—"],
            ["Missing receipts", p.missingReceipts != null ? String(p.missingReceipts) : "—"],
          ] as const
        ).map(([label, value]) => (
          <article key={label} className="rounded-2xl bg-white border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
          </article>
        ))}
        {p.supportRate == null && (
          <p className="md:col-span-2 text-center text-sm text-slate-400">Ask Adoni for live stats to populate this panel</p>
        )}
      </div>
    );
  }

  if (mode === "contacts") {
    const rows = ((structured.payload ?? DEFAULT_STRUCTURED.contacts) as Record<string, unknown>)
      .rows as Array<Record<string, string>>;
    if (!rows || rows.length === 0) {
      return (
        <div className="h-full rounded-2xl border border-dashed border-slate-300 bg-white p-6 flex flex-col items-center justify-center">
          <p className="text-lg font-semibold text-slate-900">Contact List</p>
          <p className="mt-2 text-sm text-slate-500">Ask Adoni to build a call list or search contacts</p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Support</th>
              <th className="px-4 py-3 text-left">Last contacted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row.name}-${idx}`} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">{row.phone}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${roleBadgeClass(row.support)}`}>
                    {row.support}
                  </span>
                </td>
                <td className="px-4 py-3">{row.lastContacted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (mode === "email") {
    const p = (structured.payload ?? DEFAULT_STRUCTURED.email) as Record<string, string>;
    if (!p.subject && !p.body) {
      return (
        <div className="h-full rounded-2xl border border-dashed border-slate-300 bg-white p-6 flex flex-col items-center justify-center">
          <p className="text-lg font-semibold text-slate-900">Email Draft</p>
          <p className="mt-2 text-sm text-slate-500">Ask Adoni to draft an email to populate this panel</p>
        </div>
      );
    }
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Subject</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{p.subject}</p>
        <p className="mt-4 text-sm text-slate-500">Body</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{p.body}</p>
        <button
          type="button"
          className="mt-5 rounded-lg px-4 py-2 text-sm text-white hover:opacity-90"
          style={{ backgroundColor: NAVY }}
        >
          Open in Composer
        </button>
      </article>
    );
  }

  if (mode === "roster") {
    const rows = ((structured.payload ?? DEFAULT_STRUCTURED.roster) as Record<string, unknown>)
      .rows as Array<Record<string, unknown>>;
    if (!rows || rows.length === 0) {
      return (
        <div className="h-full rounded-2xl border border-dashed border-slate-300 bg-white p-6 flex flex-col items-center justify-center">
          <p className="text-lg font-semibold text-slate-900">Volunteer Roster</p>
          <p className="mt-2 text-sm text-slate-500">Ask Adoni for the volunteer roster to populate this panel</p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Doors</th>
              <th className="px-4 py-3 text-left">Availability</th>
              <th className="px-4 py-3 text-left">Car</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${String(row.name)}-${idx}`} className="border-t border-slate-100">
                <td className="px-4 py-3">{String(row.name)}</td>
                <td className="px-4 py-3">{String(row.role)}</td>
                <td className="px-4 py-3">{String(row.doors)}</td>
                <td className="px-4 py-3">{String(row.availability)}</td>
                <td className="px-4 py-3">{row.hasCar ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* gotv */
  const p = (structured.payload ?? DEFAULT_STRUCTURED.gotv) as Record<string, unknown>;
  const voted = p.voted != null ? Number(p.voted) : null;
  const total = p.totalSupporters != null ? Number(p.totalSupporters) : null;
  const pct = voted != null && total != null ? Math.round((voted / Math.max(1, total)) * 100) : null;
  const actions = (p.actions as string[]) ?? [];

  return (
    <div className="grid gap-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">P tier breakdown</p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {(["p1", "p2", "p3", "p4"] as const).map((key, i) => {
            const colours = [
              ["emerald", "emerald"],
              ["blue", "blue"],
              ["amber", "amber"],
              ["rose", "rose"],
            ][i];
            return (
              <div key={key} className={`rounded-lg bg-${colours[0]}-50 p-3`}>
                <p className={`text-xs text-${colours[1]}-700`}>{key.toUpperCase()}</p>
                <p className={`text-xl font-semibold text-${colours[1]}-900`}>{p[key] != null ? String(p[key]) : "—"}</p>
              </div>
            );
          })}
        </div>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Voted counter</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">
          {voted != null && total != null ? `${voted} / ${total}` : "—"}
        </p>
        {pct != null && (
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full"
              style={{ width: `${Math.min(100, Math.max(3, pct))}%`, backgroundColor: GREEN }}
            />
          </div>
        )}
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Priority actions</p>
        <div className="mt-2 space-y-2">
          {actions.length > 0 ? actions.map((item) => (
            <p key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {item}
            </p>
          )) : (
            <p className="text-sm text-slate-400">Ask Adoni for GOTV status to see priority actions</p>
          )}
        </div>
      </article>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function AdoniChat() {
  const pathname = usePathname();
  const [mode, setMode] = useState<AdoniMode>("bubble");
  const [prompt, setPrompt] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasSuggestion, setHasSuggestion] = useState(true);
  const [structured, setStructured] = useState<StructuredData>({ mode: "none" });
  const [isMobile, setIsMobile] = useState(false);
  const [campaignId] = useState("default");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(() => contextualSuggestions(pathname), [pathname]);

  /* Load history from localStorage */
  useEffect(() => {
    setMessages(loadHistory(campaignId));
  }, [campaignId]);

  /* Save on change */
  useEffect(() => {
    if (messages.length > 0) saveHistory(campaignId, messages);
  }, [messages, campaignId]);

  /* Mobile detection */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setIsMobile(mq.matches);
      if (mq.matches) setMode((prev) => (prev === "fullscreen" ? "panel" : prev));
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* Hotkey: Cmd/Ctrl + Shift + A */
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if ((ev.metaKey || ev.ctrlKey) && ev.shiftKey && ev.key.toLowerCase() === "a") {
        ev.preventDefault();
        setMode((prev) => cycleMode(prev, isMobile));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile]);

  /* Auto-scroll */
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  /* Send */
  const send = useCallback(
    async (text: string) => {
      const userText = text.trim();
      if (!userText || streaming) return;

      setHasSuggestion(false);

      const userMsg: ChatMessage = { id: nextId(), role: "user", content: userText };
      const assistantMsg: ChatMessage = { id: nextId(), role: "assistant", content: "" };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setPrompt("");
      setStreaming(true);
      if (mode === "bubble") setMode("panel");

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/adoni/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userText, page: pathname, history }),
        });

        if (!res.ok || !res.body) throw new Error("Request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;

          setMessages((prev) => {
            const copy = [...prev];
            const lastIdx = copy.length - 1;
            const last = copy[lastIdx];
            if (last.role !== "assistant") return prev;
            copy[lastIdx] = { ...last, content: last.content + chunk };
            return copy;
          });
        }

        /* Infer structured output */
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            const inferred = inferStructuredMode(last.content);
            if (inferred !== "none") {
              setStructured({ mode: inferred, payload: DEFAULT_STRUCTURED[inferred] });
            }
          }
          return prev;
        });
      } catch {
        setMessages((prev) => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (lastIdx >= 0 && copy[lastIdx].role === "assistant") {
            copy[lastIdx] = {
              ...copy[lastIdx],
              content: "I could not respond right now. Please try again.",
            };
          }
          return copy;
        });
      } finally {
        setStreaming(false);
      }
    },
    [streaming, messages, pathname, mode],
  );

  const handleClose = useCallback(() => setMode("bubble"), []);
  const handleToggleFullscreen = useCallback(
    () => setMode((prev) => (prev === "fullscreen" ? "panel" : "fullscreen")),
    [],
  );

  /* ---- Render --------------------------------------------------- */

  return (
    <>
      {/* Bubble */}
      <AnimatePresence>
        {mode === "bubble" && (
          <motion.button
            key="bubble"
            type="button"
            onClick={() => setMode("panel")}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={bubbleSpring}
            className="fixed z-[9999] rounded-full shadow-xl hover:shadow-2xl focus:outline-none"
            style={{
              bottom: 80,
              right: 20,
              width: 60,
              height: 60,
              backgroundColor: NAVY,
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label="Open Adoni chat"
          >
            <span className="text-white text-2xl font-bold select-none">A</span>
            {hasSuggestion && (
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  animation: "adoni-pulse-ring 1.8s ease-out infinite",
                  border: `2px solid ${GREEN}`,
                }}
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel mode */}
      <AnimatePresence>
        {mode === "panel" && (
          <motion.div
            key="panel"
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={panelSpring}
            className="fixed right-5 z-[9999] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            style={{
              bottom: 80,
              width: 400,
              maxWidth: "calc(100vw - 1rem)",
              height: "min(85vh, 760px)",
            }}
          >
            <PanelHeader
              mode={mode}
              isMobile={isMobile}
              onClose={handleClose}
              onToggleFullscreen={handleToggleFullscreen}
            />
            <MessageArea messages={messages} streaming={streaming} scrollerRef={scrollerRef} />
            <InputBar
              prompt={prompt}
              setPrompt={setPrompt}
              streaming={streaming}
              onSend={send}
              suggestions={suggestions}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen mode */}
      <AnimatePresence>
        {mode === "fullscreen" && !isMobile && (
          <motion.div
            key="fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-slate-950/40"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={panelSpring}
              className="absolute inset-4 rounded-3xl bg-white shadow-2xl overflow-hidden grid"
              style={{ gridTemplateColumns: "480px 1fr" }}
            >
              {/* Left: conversation */}
              <section className="border-r border-slate-200 flex flex-col min-h-0">
                <PanelHeader
                  mode={mode}
                  isMobile={isMobile}
                  onClose={handleClose}
                  onToggleFullscreen={handleToggleFullscreen}
                />
                <MessageArea messages={messages} streaming={streaming} scrollerRef={scrollerRef} />
                <InputBar
                  prompt={prompt}
                  setPrompt={setPrompt}
                  streaming={streaming}
                  onSend={send}
                  suggestions={suggestions}
                />
              </section>

              {/* Right: structured output */}
              <section className="min-h-0 overflow-y-auto bg-slate-50 p-6">
                <StructuredPanel structured={structured} />
              </section>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global keyframe styles */}
      <style jsx global>{`
        @keyframes adoni-pulse-ring {
          0% {
            transform: scale(0.95);
            opacity: 0.7;
          }
          70% {
            transform: scale(1.25);
            opacity: 0.12;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        @keyframes adoni-shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
}
