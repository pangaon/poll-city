"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Newspaper, MessageCircle, Share2, HeartHandshake, Film, FileText, Calendar,
  Copy, Check, Loader2, Sparkles, History, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";

interface Props {
  campaignId: string;
  campaignName: string;
}

type Kind =
  | "press-release"
  | "canvass-script"
  | "social-post"
  | "fundraising-email"
  | "video-script"
  | "pamphlet-copy"
  | "social-calendar";

type Tone = "formal" | "conversational" | "urgent" | "inspirational";

interface HistoryItem {
  id: string;
  kind: Kind;
  kindLabel: string;
  brief: string;
  output: string;
  ts: number;
}

const TABS: Array<{ kind: Kind; label: string; icon: React.ComponentType<{ className?: string }>; placeholder: string }> = [
  { kind: "press-release", label: "Press Release", icon: Newspaper, placeholder: "e.g. Announcing my candidacy for Ward 20 Toronto" },
  { kind: "canvass-script", label: "Canvass Script", icon: MessageCircle, placeholder: "e.g. Door-knock for persuadable voters on transit" },
  { kind: "social-post", label: "Social Posts", icon: Share2, placeholder: "e.g. Weekend canvass recap, thanking volunteers" },
  { kind: "fundraising-email", label: "Fundraising Email", icon: HeartHandshake, placeholder: "e.g. Q4 push to hit $10k spending limit" },
  { kind: "video-script", label: "Video Script", icon: Film, placeholder: "e.g. 60-second intro video: who I am, why I'm running" },
  { kind: "pamphlet-copy", label: "Pamphlet Copy", icon: FileText, placeholder: "e.g. Front door flyer — 3 main issues" },
  { kind: "social-calendar", label: "2-Week Calendar", icon: Calendar, placeholder: "e.g. GOTV push, 2 events, 3 issue posts per week" },
];

const TONES: Array<{ value: Tone; label: string; description: string }> = [
  { value: "formal", label: "Formal", description: "Professional, polished" },
  { value: "conversational", label: "Conversational", description: "Warm, approachable" },
  { value: "urgent", label: "Urgent", description: "Action-oriented, pressing" },
  { value: "inspirational", label: "Inspirational", description: "Motivating, aspirational" },
];

const HISTORY_KEY = (campaignId: string) => `poll-city:creator-history-${campaignId}`;
const MAX_HISTORY = 10;

function loadHistory(campaignId: string): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY(campaignId));
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(campaignId: string, items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY(campaignId), JSON.stringify(items.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage unavailable — skip
  }
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export default function AiCreatorClient({ campaignId, campaignName }: Props) {
  const [active, setActive] = useState<Kind>("press-release");
  const [tone, setTone] = useState<Tone>("conversational");
  const [brief, setBrief] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory(campaignId));
  }, [campaignId]);

  const currentTab = TABS.find((t) => t.kind === active)!;

  const addToHistory = useCallback((item: Omit<HistoryItem, "id">) => {
    setHistory((prev) => {
      const next = [{ ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }, ...prev].slice(0, MAX_HISTORY);
      saveHistory(campaignId, next);
      return next;
    });
  }, [campaignId]);

  async function generate() {
    if (!brief.trim()) {
      setError("Tell Adoni what you need.");
      return;
    }
    setLoading(true);
    setError(null);
    setOutput("");
    try {
      const res = await fetch("/api/adoni/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: active, brief, campaignId, tone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      const text = data.text ?? "";
      setOutput(text);
      if (text) {
        addToHistory({ kind: active, kindLabel: currentTab.label, brief: brief.slice(0, 120), output: text, ts: Date.now() });
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string = output) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadMd(text: string = output, label: string = currentTab.label) {
    const blob = new Blob([text], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function deleteHistoryItem(id: string) {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      saveHistory(campaignId, next);
      return next;
    });
    if (expandedHistoryId === id) setExpandedHistoryId(null);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 pb-[env(safe-area-inset-bottom)]">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-blue-700" /> AI Creator
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Adoni writes press releases, scripts, emails, and calendars for <strong>{campaignName}</strong>.
        </p>
      </header>

      {/* Content type tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2 -mx-4 px-4 md:mx-0 md:px-0 mb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.kind === active;
          return (
            <button
              key={t.kind}
              onClick={() => {
                setActive(t.kind);
                setOutput("");
                setError(null);
              }}
              className={`shrink-0 h-11 px-4 rounded-full font-semibold text-sm flex items-center gap-2 transition-colors ${
                isActive
                  ? "bg-blue-700 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-blue-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Input */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-sm space-y-4">
        {/* Tone selector */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Tone</p>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                title={t.description}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors ${
                  tone === t.value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Brief */}
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Tell Adoni what you need</span>
          <textarea
            rows={3}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={currentTab.placeholder}
            className="mt-1.5 w-full px-3 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
            maxLength={1000}
          />
          <span className="text-xs text-slate-400 mt-1 block text-right tabular-nums">{brief.length}/1000</span>
        </label>

        <button
          onClick={generate}
          disabled={loading || !brief.trim()}
          className="w-full h-12 rounded-lg bg-blue-700 text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Adoni is writing…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Generate {currentTab.label.toLowerCase()}
            </>
          )}
        </button>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      {/* Output */}
      {output && (
        <div className="mt-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">{currentTab.label}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => copy()}
                className="h-10 px-3 rounded-lg border border-slate-300 font-semibold text-sm flex items-center gap-1.5 hover:bg-slate-50"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => downloadMd()}
                className="h-10 px-3 rounded-lg border border-slate-300 font-semibold text-sm hover:bg-slate-50"
              >
                Download .md
              </button>
            </div>
          </div>
          <pre className="p-4 md:p-5 text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
            {output}
          </pre>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-5">
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-3"
          >
            <History className="w-4 h-4" />
            Recent generations ({history.length})
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="space-y-2">
              {history.map((item) => {
                const isExpanded = expandedHistoryId === item.id;
                return (
                  <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {item.kindLabel}
                          </span>
                          <span className="text-xs text-slate-400">{formatTs(item.ts)}</span>
                        </div>
                        <p className="text-sm text-slate-700 truncate mt-0.5">{item.brief}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                          className="h-8 px-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          {isExpanded ? "Hide" : "View"}
                        </button>
                        <button
                          onClick={() => { void copy(item.output); }}
                          className="h-8 px-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          title="Copy output"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => downloadMd(item.output, item.kindLabel)}
                          className="h-8 px-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          title="Download"
                        >
                          .md
                        </button>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="h-8 px-2 rounded-lg text-xs text-slate-400 hover:text-red-500 hover:bg-red-50"
                          title="Remove from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                        <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                          {item.output}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
