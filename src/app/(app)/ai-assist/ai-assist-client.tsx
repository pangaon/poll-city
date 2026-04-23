"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
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
  Mic,
  MicOff,
  MapPin,
  Paperclip,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";

interface Message {
  role: "user" | "adoni";
  content: string;
  ts: number;
}

interface Props {
  campaignId: string;
  isMock: boolean;
}

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
      "What are the typical warning signs of a campaign that is about to lose?",
      "How do I convert undecided voters in a ward that leans right?",
      "Give me a debate prep checklist for a municipal candidates night.",
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: DollarSign,
    prompts: [
      "How much have we raised and what are our top donors?",
      "How should I allocate my remaining budget with 3 weeks to election day?",
      "What is the most cost-effective way to reach voters in the final week?",
      "Draft talking points for a fundraising call to a major donor.",
    ],
  },
  {
    id: "volunteers",
    label: "Volunteers",
    icon: Users,
    prompts: [
      "Show me the volunteer roster and who has a vehicle.",
      "Who can canvass this Saturday morning?",
      "Add Maria Chen as a volunteer — she can door knock on weekends and has a car.",
      "Fill unassigned shifts for this weekend from available volunteers.",
    ],
  },
];

function storageKey(campaignId: string) {
  return `poll-city:adoni-command-${campaignId}`;
}

function loadHistory(campaignId: string): Message[] {
  try {
    const raw = localStorage.getItem(storageKey(campaignId));
    if (!raw) return [];
    return (JSON.parse(raw) as Message[]).slice(-40);
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

/* CSV parser — maps common column names to volunteer fields */
function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

function csvToMessage(rows: Array<Record<string, string>>, fileName: string): string {
  const get = (row: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) {
      const found = Object.entries(row).find(([key]) => key.toLowerCase().includes(k));
      if (found?.[1]) return found[1];
    }
    return "";
  };
  const volunteers = rows.map((row) => ({
    firstName: get(row, "first", "fname", "given"),
    lastName: get(row, "last", "lname", "surname"),
    phone: get(row, "phone", "mobile", "cell"),
    email: get(row, "email", "mail"),
    skills: get(row, "skill", "role"),
    availability: get(row, "avail", "when"),
  })).filter((v) => v.firstName && v.lastName);

  if (volunteers.length === 0) {
    return `I uploaded "${fileName}" but could not find name columns. Please paste the list directly as text.`;
  }
  return `I have a list of ${volunteers.length} volunteers from "${fileName}". Please add them all using bulk_create_volunteers: ${JSON.stringify(volunteers)}`;
}

export default function AIAssistClient({ campaignId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<unknown>(null);

  const voiceSupported = typeof window !== "undefined" && (
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window
  );

  useEffect(() => {
    setMessages(loadHistory(campaignId));
    setHistoryLoaded(true);
  }, [campaignId]);

  useEffect(() => {
    if (!historyLoaded) return;
    saveHistory(campaignId, messages);
  }, [messages, campaignId, historyLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? (attachedFile?.content ?? prompt)).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content: attachedFile?.name ? `[File: ${attachedFile.name}]\n${content}` : content, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setAttachedFile(null);
    setLoading(true);
    setActiveCat(null);

    const history = messages.map((m) => ({ role: m.role === "adoni" ? "assistant" : "user", content: m.content }));

    try {
      const res = await fetch("/api/adoni/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: "ai-assist",
          messages: [...history, { role: "user", content }],
        }),
      });

      if (!res.ok) throw new Error("Request failed");
      if (!res.body) throw new Error("No stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      const adoniMsg: Message = { role: "adoni", content: "", ts: Date.now() };
      setMessages((prev) => [...prev, adoniMsg]);
      const msgTs = adoniMsg.ts;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.ts === msgTs ? { ...m, content: fullText } : m)),
        );
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "adoni",
        content: "I could not connect right now. Please try again.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [prompt, attachedFile, loading, messages]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? "");
      const isCsv = file.name.toLowerCase().endsWith(".csv");
      let content: string;
      if (isCsv) {
        content = csvToMessage(parseCsv(text), file.name);
      } else {
        content = `I am sharing a file "${file.name}":\n\n${text.slice(0, 8000)}`;
      }
      setAttachedFile({ name: file.name, content });
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const toggleVoice = useCallback(() => {
    if (listening) {
      if (recognitionRef.current) (recognitionRef.current as { stop: () => void }).stop();
      setListening(false);
      return;
    }
    const w = window as unknown as Record<string, unknown>;
    const SR = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => unknown) | undefined;
    if (!SR) return;
    const rec = new SR() as {
      continuous: boolean; interimResults: boolean; lang: string;
      onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
      onend: (() => void) | null; onerror: (() => void) | null;
      start: () => void; stop: () => void;
    };
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-CA";
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? "";
      if (t) setPrompt((prev) => prev ? `${prev} ${t}` : t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const activeCategory = CATEGORIES.find((c) => c.id === activeCat);
  const canSend = !loading && (!!prompt.trim() || !!attachedFile);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" style={{ backgroundColor: "#f8fafc" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0" style={{ backgroundColor: NAVY }}>
            <Image src="/images/adoni-bubble.png" alt="Adoni" fill className="object-cover" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Adoni — Command Centre</p>
            <p className="text-xs text-slate-400">Full platform access · Say anything, do anything</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearConversation}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 transition-colors px-2 py-1 rounded"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="text-center pt-8 pb-4"
          >
            <div className="relative h-20 w-20 rounded-full overflow-hidden mx-auto mb-4" style={{ backgroundColor: NAVY }}>
              <Image src="/images/adoni-bubble.png" alt="Adoni" fill className="object-cover" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">What can I do for you?</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Ask me anything. I can read your data, create records, write copy, and run your campaign — one command at a time.
            </p>
          </motion.div>
        )}

        {/* Quick prompts */}
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
                      activeCat === cat.id ? "text-white border-transparent" : "text-slate-600 border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    style={activeCat === cat.id ? { backgroundColor: NAVY } : {}}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.label}
                    <ChevronDown className={`h-3 w-3 transition-transform ${activeCat === cat.id ? "rotate-180" : ""}`} />
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

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.ts}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 overflow-hidden ${
                  msg.role === "user" ? "bg-slate-200 text-slate-600" : ""
                }`}
                style={msg.role === "adoni" ? { backgroundColor: NAVY } : {}}
              >
                {msg.role === "user" ? "You" : (
                  <Image src="/images/adoni-bubble.png" alt="Adoni" width={32} height={32} className="object-cover" />
                )}
              </div>
              <div className={`group max-w-[80%] space-y-1 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user" ? "text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                  }`}
                  style={msg.role === "user" ? { backgroundColor: NAVY } : {}}
                >
                  {msg.content}
                </div>
                <div className={`flex items-center gap-2 px-1 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <p className="text-xs text-slate-400">{formatTime(msg.ts)}</p>
                  {msg.role === "adoni" && msg.content && (
                    <button
                      onClick={() => copyMessage(msg.content, msg.ts)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
                    >
                      {copiedId === msg.ts ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 items-start">
            <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 mt-1" style={{ backgroundColor: NAVY }}>
              <Image src="/images/adoni-bubble.png" alt="Adoni" width={32} height={32} className="object-cover" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Inline suggestions after conversation starts */}
      {messages.length > 0 && !loading && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
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

      {/* Input bar */}
      <div className="px-4 pb-4 pt-2 bg-white border-t border-slate-100">
        {/* File attachment chip */}
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span className="flex-1 truncate">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-red-500 transition-colors">
              ×
            </button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept=".csv,.txt,.md" className="hidden" onChange={handleFile} />
        <div className="flex gap-2 items-center">
          {/* Attach */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Attach CSV or text file"
            className="h-12 w-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors disabled:opacity-40 shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          {/* Input */}
          <input
            value={attachedFile ? "" : prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={!!attachedFile || listening}
            placeholder={attachedFile ? `Send "${attachedFile.name}"` : listening ? "Listening…" : "Ask Adoni anything… (Enter to send)"}
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
            style={{
              minHeight: 48,
              "--tw-ring-color": GREEN,
              borderColor: listening ? GREEN : undefined,
              backgroundColor: listening ? "rgba(29,158,117,0.04)" : undefined,
            } as React.CSSProperties}
          />
          {/* Voice */}
          {voiceSupported && (
            <button
              onClick={toggleVoice}
              disabled={loading || !!attachedFile}
              title={listening ? "Stop recording" : "Dictate to Adoni"}
              className="h-12 w-10 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
              style={{
                borderColor: listening ? GREEN : "#e2e8f0",
                color: listening ? GREEN : "#64748b",
                backgroundColor: listening ? "rgba(29,158,117,0.08)" : "white",
              }}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
          {/* Send */}
          <button
            onClick={() => send()}
            disabled={!canSend}
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-white transition-all disabled:opacity-40 shrink-0"
            style={{ backgroundColor: NAVY }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-slate-400">
          Adoni reads your live campaign data and can take action. Review important changes before confirming.
        </p>
      </div>
    </div>
  );
}
