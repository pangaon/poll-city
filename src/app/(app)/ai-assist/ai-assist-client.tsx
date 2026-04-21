"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { FeatureGuide } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Trash2,
  Copy,
  CheckCheck,
  Users,
  MessageSquare,
  DollarSign,
  Target,
  Mic2,
  MapPin,
  FileText,
  BarChart3,
  Zap,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

interface Message {
  role: "user" | "adoni";
  content: string;
  isMock?: boolean;
  ts: number;
}

interface Props {
  campaignId: string;
  isMock: boolean;
}

/* ─── Quick prompts by category ──────────────────────────────────────────── */

const CATEGORIES = [
  {
    id: "field",
    label: "Field",
    icon: MapPin,
    prompts: [
      "Who are my highest-priority doors to knock this weekend?",
      "Write a 60-second door-knock script focused on transit and housing affordability.",
      "How should I prioritise my volunteer assignments for the final week?",
      "What's a good GOTV message for supporters who haven't voted in the last two elections?",
    ],
  },
  {
    id: "comms",
    label: "Comms",
    icon: MessageSquare,
    prompts: [
      "Draft a short SMS reminder to send to supporters on election day.",
      "Write a fundraising email for the final push — urgent but not desperate.",
      "What subject line would get the best open rate for a volunteer recruitment email?",
      "Help me respond to an opponent attack on my transit platform.",
    ],
  },
  {
    id: "strategy",
    label: "Strategy",
    icon: Target,
    prompts: [
      "Summarise where my campaign stands and the top three things I need to do this week.",
      "What are the typical warning signs of a campaign that's about to lose?",
      "How do I convert undecided voters in a ward that leans right?",
      "Give me a debate prep checklist for a municipal candidates night.",
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: DollarSign,
    prompts: [
      "What are the MAGA spending limits for Ontario municipal candidates?",
      "How should I allocate my remaining budget with 3 weeks to election day?",
      "What is the most cost-effective way to reach voters in the final week?",
      "Draft talking points for a fundraising call to a major donor.",
    ],
  },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function storageKey(campaignId: string) {
  return `poll-city:adoni-history-${campaignId}`;
}

function loadHistory(campaignId: string): Message[] {
  try {
    const raw = localStorage.getItem(storageKey(campaignId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    // Keep only last 40 messages to prevent unbounded storage
    return parsed.slice(-40);
  } catch {
    return [];
  }
}

function saveHistory(campaignId: string, msgs: Message[]) {
  try {
    localStorage.setItem(storageKey(campaignId), JSON.stringify(msgs.slice(-40)));
  } catch { /* ignore */ }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function AIAssistClient({ campaignId, isMock }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = loadHistory(campaignId);
    setMessages(saved);
    setHistoryLoaded(true);
  }, [campaignId]);

  // Persist history on change
  useEffect(() => {
    if (!historyLoaded) return;
    saveHistory(campaignId, messages);
  }, [messages, campaignId, historyLoaded]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (text?: string) => {
      const content = (text ?? prompt).trim();
      if (!content || loading) return;

      const userMsg: Message = { role: "user", content, ts: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setPrompt("");
      setLoading(true);
      setActiveCat(null);

      // Auto-resize textarea back to single line
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      try {
        const res = await fetch("/api/ai-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "chat", campaignId, prompt: content }),
        });
        const data = (await res.json()) as { data?: { text: string; isMock?: boolean }; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Request failed");

        const adoniMsg: Message = {
          role: "adoni",
          content: data.data?.text ?? "I wasn't able to generate a response. Please try again.",
          isMock: data.data?.isMock,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, adoniMsg]);
      } catch (e) {
        const adoniMsg: Message = {
          role: "adoni",
          content: "I wasn't able to connect right now. Check your API key configuration and try again.",
          isMock: true,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, adoniMsg]);
      } finally {
        setLoading(false);
        textareaRef.current?.focus();
      }
    },
    [prompt, loading, campaignId],
  );

  const copyMessage = useCallback((content: string, ts: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(ts);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    try { localStorage.removeItem(storageKey(campaignId)); } catch { /* ignore */ }
    toast.success("Conversation cleared");
  }, [campaignId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const activeCategory = CATEGORIES.find((c) => c.id === activeCat);

  /* ─── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[900px]" style={{ backgroundColor: "#f8fafc" }}>
      <FeatureGuide
        featureKey="ai-assist"
        title="Your AI Campaign Assistant"
        description="AI Assist helps you write faster and think through campaign problems. Ask it to draft an email, suggest a response to a voter question, or help you articulate a policy position. It knows your campaign, your ward, and Canadian municipal election context."
        bullets={[
          "Write emails, social posts, and canvassing scripts in seconds",
          "Ask strategic questions: 'What should I say to renters in Ward 3?'",
          "All output is a draft — always review and personalise before sending",
        ]}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${GREEN} 100%)` }}
          >
            A
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Adoni</p>
            <p className="text-xs text-slate-400">Campaign intelligence assistant</p>
          </div>
          {isMock && (
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Demo mode
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearConversation}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 transition-colors px-2 py-1 rounded"
            title="Clear conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* ── Demo mode notice ────────────────────────────────────────────── */}
      {isMock && (
        <div className="mx-4 mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800 flex items-start gap-2">
          <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
          <span>
            Adoni is running in demo mode — responses are illustrative.
            Add <code className="font-mono bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> to Railway to activate live intelligence.
          </span>
        </div>
      )}

      {/* ── Messages ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Welcome state */}
        {messages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="text-center pt-8 pb-4"
          >
            <div
              className="inline-flex h-16 w-16 items-center justify-center rounded-full text-white text-2xl font-bold mb-4"
              style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${GREEN} 100%)` }}
            >
              A
            </div>
            <h2 className="text-xl font-bold text-slate-900">How can I help?</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Ask me anything about your campaign — strategy, scripting, voter analysis, finance, or what to do today.
            </p>
          </motion.div>
        )}

        {/* Quick prompts — category selector (only when no messages) */}
        {messages.length === 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 justify-center">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                      activeCat === cat.id
                        ? "text-white border-transparent"
                        : "text-slate-600 border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    style={activeCat === cat.id ? { backgroundColor: NAVY, borderColor: NAVY } : {}}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.label}
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${activeCat === cat.id ? "rotate-180" : ""}`}
                    />
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {activeCategory && (
                <motion.div
                  key={activeCategory.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-2 pt-2">
                    {activeCategory.prompts.map((p) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        className="text-left rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Message thread */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.ts}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 ${
                  msg.role === "user" ? "bg-slate-200 text-slate-600" : "text-white"
                }`}
                style={
                  msg.role === "adoni"
                    ? { background: `linear-gradient(135deg, ${NAVY} 0%, ${GREEN} 100%)` }
                    : {}
                }
              >
                {msg.role === "user" ? "You" : "A"}
              </div>

              {/* Bubble */}
              <div className={`group max-w-[80%] space-y-1 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                {msg.isMock && (
                  <p className="text-xs text-amber-600 font-medium px-1">Demo response</p>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "text-white rounded-tr-sm"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                  }`}
                  style={msg.role === "user" ? { backgroundColor: NAVY } : {}}
                >
                  {msg.content}
                </div>
                <div className={`flex items-center gap-2 px-1 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <p className="text-xs text-slate-400">{formatTime(msg.ts)}</p>
                  {msg.role === "adoni" && (
                    <button
                      onClick={() => copyMessage(msg.content, msg.ts)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
                      title="Copy response"
                    >
                      {copiedId === msg.ts ? (
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 items-start"
          >
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-1"
              style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${GREEN} 100%)` }}
            >
              A
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-slate-300 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Inline prompt suggestions (after conversation starts) ────────── */}
      {messages.length > 0 && !loading && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.flatMap((c) => c.prompts.slice(0, 1)).map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-50 whitespace-nowrap transition-colors"
              >
                {p.length > 48 ? p.slice(0, 48) + "…" : p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar ───────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 pt-2 bg-white border-t border-slate-100">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask Adoni anything… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
              style={{ "--tw-ring-color": GREEN, minHeight: 48, maxHeight: 160 } as React.CSSProperties}
            />
            {prompt.length > 0 && (
              <p className="absolute bottom-1 right-3 text-xs text-slate-400">
                {prompt.length}/2000
              </p>
            )}
          </div>
          <button
            onClick={() => send()}
            disabled={!prompt.trim() || loading}
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-white transition-all disabled:opacity-40 shrink-0"
            style={{ backgroundColor: NAVY }}
            title="Send (Enter)"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-slate-400">
          Adoni uses your campaign data to give relevant answers. Always verify key facts independently.
        </p>
      </div>
    </div>
  );
}
