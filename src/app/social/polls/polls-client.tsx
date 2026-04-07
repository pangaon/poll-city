"use client";
import { useState, useEffect } from "react";
import { BarChart2, Search, Clock, Users, Check, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

/* ── Gradient pool ──────────────────────────────────────────────────────── */
const GRADIENTS = [
  "from-blue-600 via-blue-700 to-purple-700",
  "from-emerald-500 via-emerald-600 to-teal-600",
  "from-orange-500 via-orange-600 to-red-600",
  "from-pink-500 via-pink-600 to-purple-600",
  "from-blue-500 via-cyan-600 to-blue-700",
  "from-violet-600 via-purple-600 to-indigo-700",
  "from-amber-500 via-orange-500 to-red-500",
  "from-indigo-600 via-indigo-700 to-blue-800",
];
function getGradient(id: string) {
  const sum = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return GRADIENTS[sum % GRADIENTS.length];
}

/* ── Types ──────────────────────────────────────────────────────────────── */
interface Poll {
  id: string;
  question: string;
  type: string;
  totalResponses: number;
  description: string | null;
  endsAt: string | null;
  tags: string[];
  options: { id: string; text: string }[];
}

/* ── Filter tabs ─────────────────────────────────────────────────────────── */
const TABS = [
  { key: "all",          label: "All" },
  { key: "municipal",    label: "Municipal" },
  { key: "provincial",   label: "Provincial" },
  { key: "federal",      label: "Federal" },
  { key: "school board", label: "School Board" },
];

/* ── Time remaining ──────────────────────────────────────────────────────── */
function timeRemaining(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return "Ending soon";
}

/* ── Poll card ───────────────────────────────────────────────────────────── */
function PollCard({
  poll, voted, onVote,
}: {
  poll: Poll;
  voted: boolean;
  onVote: (val: string, optId?: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const gradient = getGradient(poll.id);
  const remaining = timeRemaining(poll.endsAt);

  return (
    <div className={`relative rounded-3xl bg-gradient-to-br ${gradient} overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-semibold rounded-full capitalize">
            {poll.type.replace(/_/g, " ")}
          </span>
          <div className="flex items-center gap-3">
            {remaining && (
              <span className="flex items-center gap-1 text-white/70 text-xs">
                <Clock className="w-3 h-3" />{remaining}
              </span>
            )}
            <span className="flex items-center gap-1 text-white/70 text-xs">
              <Users className="w-3 h-3" />{poll.totalResponses}
            </span>
          </div>
        </div>
        <h3 className="text-white font-bold text-base sm:text-lg leading-snug">{poll.question}</h3>
        {poll.description && (
          <p className="text-white/70 text-xs mt-1.5 line-clamp-2">{poll.description}</p>
        )}
      </div>

      {/* Voting area */}
      {!voted ? (
        <div className="px-5 pb-5 space-y-2.5 mt-2">
          {poll.type === "binary" && (
            <div className="flex gap-3">
              <button
                onClick={() => { setSelected("yes"); onVote("yes"); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/90 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-sm text-sm"
              >
                <Check className="w-4 h-4" /> Yes
              </button>
              <button
                onClick={() => { setSelected("no"); onVote("no"); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/90 hover:bg-red-500 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-sm text-sm"
              >
                <X className="w-4 h-4" /> No
              </button>
            </div>
          )}
          {poll.type === "multiple_choice" && poll.options.slice(0, 3).map(opt => (
            <button
              key={opt.id}
              onClick={() => { setSelected(opt.id); onVote(opt.text, opt.id); }}
              className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] border-2 ${
                selected === opt.id
                  ? "bg-white text-gray-900 border-white"
                  : "bg-white/15 text-white border-white/30 hover:bg-white/25"
              }`}
            >
              {opt.text}
            </button>
          ))}
          {(poll.type === "slider" || poll.type === "ranked" || poll.type === "swipe" || poll.type === "image_swipe" || poll.options.length > 3) && (
            <Link
              href={`/social/polls/${poll.id}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-2xl transition-all border-2 border-white/30 text-sm"
            >
              Open Poll <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="px-5 pb-5 mt-2">
          <div className="flex items-center justify-between py-3 px-4 bg-white/15 rounded-2xl border border-white/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white text-sm font-medium">Voted!</span>
            </div>
            <Link href={`/social/polls/${poll.id}`} className="text-white/80 hover:text-white text-xs font-medium flex items-center gap-1">
              Results <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Skeleton card ───────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-3xl bg-gray-200 animate-pulse h-48" />
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function SocialPolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/polls")
      .then(r => r.json())
      .then(d => { setPolls(d.data ?? []); setLoading(false); });
  }, []);

  async function vote(pollId: string, value: string, optionId?: string) {
    try {
      const res = await fetch(`/api/polls/${pollId}/respond`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, optionId }),
      });
      if (res.status === 409) { toast.error("Already voted"); return; }
      setVoted(prev => new Set(Array.from(prev).concat(pollId)));
      toast.success("Vote recorded!");
    } catch { toast.error("Failed to record vote"); }
  }

  const filtered = polls.filter(p => {
    const matchesTab = activeTab === "all" || (p.tags ?? []).some(t => t.toLowerCase().includes(activeTab));
    const matchesSearch = !search || p.question.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Polls</h1>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search polls…"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5 max-w-lg mx-auto space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BarChart2 className="w-14 h-14 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 font-medium">No polls found</p>
            {search && <p className="text-gray-400 text-sm mt-1">Try a different search</p>}
          </div>
        ) : filtered.map(p => (
          <PollCard
            key={p.id}
            poll={p}
            voted={voted.has(p.id)}
            onVote={(val, optId) => vote(p.id, val, optId)}
          />
        ))}
      </div>
    </div>
  );
}
