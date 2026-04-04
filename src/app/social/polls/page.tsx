"use client";
import { useState, useEffect } from "react";
import { BarChart2, ChevronRight, Check, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Poll { id: string; question: string; type: string; totalResponses: number; description: string | null; options: { id: string; text: string }[]; }

export default function SocialPolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/polls")
      .then(r => r.json())
      .then(d => { setPolls(d.data ?? []); setLoading(false); });
  }, []);

  async function vote(pollId: string, value: string, optionId?: string) {
    try {
      await fetch(`/api/polls/${pollId}/respond`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, optionId }),
      });
      setVoted(prev => new Set(Array.from(prev).concat(pollId)));
      toast.success("Vote recorded!");
    } catch { toast.error("Failed to record vote"); }
  }

  if (loading) return (
    <div className="px-4 pt-12 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-blue-600" />Polls</h1>
      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-blue-600" />Polls</h1>
      {polls.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">No polls available yet</p></div>
      ) : polls.map((p) => (
        <PollCard key={p.id} poll={p} voted={voted.has(p.id)} onVote={(val, optId) => vote(p.id, val, optId)} />
      ))}
    </div>
  );
}

function PollCard({ poll: p, voted, onVote }: { poll: Poll; voted: boolean; onVote: (val: string, optId?: string) => void }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{p.type.replace("_", " ")}</span>
          <span className="text-xs text-gray-400">{p.totalResponses} votes</span>
        </div>
        <p className="font-semibold text-gray-900 text-sm leading-snug mt-2">{p.question}</p>
      </div>

      {!voted ? (
        <div className="px-4 pb-4 space-y-2">
          {p.type === "binary" && (
            <div className="flex gap-3">
              <button onClick={() => onVote("yes")} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-xl font-semibold text-sm hover:bg-emerald-100 transition-colors active:scale-95">
                <Check className="w-4 h-4" />Yes
              </button>
              <button onClick={() => onVote("no")} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl font-semibold text-sm hover:bg-red-100 transition-colors active:scale-95">
                <X className="w-4 h-4" />No
              </button>
            </div>
          )}
          {p.type === "multiple_choice" && p.options.map((opt) => (
            <button key={opt.id} onClick={() => { setSelectedOption(opt.id); onVote(opt.text, opt.id); }}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all active:scale-[0.98] ${selectedOption === opt.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700 hover:border-blue-300"}`}>
              {opt.text}
            </button>
          ))}
          {p.type === "slider" && (
            <SliderPoll onVote={(v) => onVote(String(v))} />
          )}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-700 font-medium">Your vote was recorded</span>
            <Link href={`/social/polls/${p.id}`} className="ml-auto text-xs text-blue-600 font-medium">See results →</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SliderPoll({ onVote }: { onVote: (v: number) => void }) {
  const [val, setVal] = useState(50);
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-gray-500"><span>Terrible (0)</span><span className="font-bold text-blue-600">{val}</span><span>Excellent (100)</span></div>
      <input type="range" min="0" max="100" value={val} onChange={(e) => setVal(Number(e.target.value))} className="w-full accent-blue-600" />
      <button onClick={() => onVote(val)} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition-colors">Submit Rating</button>
    </div>
  );
}
