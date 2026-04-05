"use client";
import { useState } from "react";
import {
  Newspaper,
  MessageCircle,
  Share2,
  HeartHandshake,
  Film,
  FileText,
  Calendar,
  Copy,
  Check,
  Loader2,
  Sparkles,
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

const TABS: Array<{ kind: Kind; label: string; icon: React.ComponentType<{ className?: string }>; placeholder: string }> = [
  { kind: "press-release", label: "Press Release", icon: Newspaper, placeholder: "e.g. Announcing my candidacy for Ward 20 Toronto" },
  { kind: "canvass-script", label: "Canvass Script", icon: MessageCircle, placeholder: "e.g. Door-knock for persuadable voters on transit" },
  { kind: "social-post", label: "Social Posts", icon: Share2, placeholder: "e.g. Weekend canvass recap, thanking volunteers" },
  { kind: "fundraising-email", label: "Fundraising Email", icon: HeartHandshake, placeholder: "e.g. Q4 push to hit $10k spending limit" },
  { kind: "video-script", label: "Video Script", icon: Film, placeholder: "e.g. 60-second intro video: who I am, why I'm running" },
  { kind: "pamphlet-copy", label: "Pamphlet Copy", icon: FileText, placeholder: "e.g. Front door flyer — 3 main issues" },
  { kind: "social-calendar", label: "2-Week Calendar", icon: Calendar, placeholder: "e.g. GOTV push, 2 events, 3 issue posts per week" },
];

export default function AiCreatorClient({ campaignId, campaignName }: Props) {
  const [active, setActive] = useState<Kind>("press-release");
  const [brief, setBrief] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currentTab = TABS.find((t) => t.kind === active)!;

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
        body: JSON.stringify({ kind: active, brief, campaignId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      setOutput(data.text ?? "");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadMd() {
    const blob = new Blob([output], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${currentTab.label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
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

      {/* Tabs — horizontal scroll on mobile */}
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
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-sm space-y-3">
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
                onClick={copy}
                className="h-10 px-3 rounded-lg border border-slate-300 font-semibold text-sm flex items-center gap-1.5 hover:bg-slate-50"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={downloadMd}
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
    </div>
  );
}
