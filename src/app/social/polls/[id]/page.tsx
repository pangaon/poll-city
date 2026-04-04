"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BarChart2, Users, Check } from "lucide-react";
import { toast } from "sonner";
import { SwipePoll } from "@/components/polls/swipe-poll";

interface PollOption { id: string; text: string; order: number; imageUrl?: string; }
interface PollData {
  id: string; question: string; type: string;
  totalResponses: number; description: string | null;
  options: PollOption[];
}
interface PollResult { poll: PollData; results: any; type: string; }

export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<PollResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    fetch(`/api/polls/${params.id}/respond`)
      .then(r => r.json())
      .then(d => { setResult(d.data); setLoading(false); });
  }, [params.id]);

  async function vote(value: string, optionId?: string) {
    const res = await fetch(`/api/polls/${params.id}/respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, optionId }),
    });
    if (res.status === 409) { toast.error("You have already voted on this poll"); setVoted(true); return; }
    if (res.ok) {
      setVoted(true);
      toast.success("Vote recorded!");
      const d = await fetch(`/api/polls/${params.id}/respond`).then(r => r.json());
      setResult(d.data);
    } else {
      toast.error("Failed to record vote");
    }
  }

  if (loading) return (
    <div className="px-4 pt-12 space-y-4">
      <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
      <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  );

  if (!result) return <div className="px-4 pt-12 text-center text-gray-400">Poll not found</div>;

  const { poll, results, type } = result;

  function getPercent(count: number) {
    if (!poll.totalResponses) return 0;
    return Math.round((count / poll.totalResponses) * 100);
  }

  // SWIPE POLL — fully wired
  if ((type === "swipe" || type === "image_swipe") && !voted) {
    const options = poll.options.map(o => ({
      id: o.id,
      text: o.text,
      imageUrl: (o as any).imageUrl,
    }));
    return (
      <div className="px-4 pt-12 pb-24">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-blue-600 text-sm mb-6">
          <ArrowLeft className="w-4 h-4" />Polls
        </button>
        <SwipePoll
          pollId={poll.id}
          question={poll.question}
          options={options}
          type={type as "swipe" | "image_swipe"}
          onComplete={() => {
            setVoted(true);
            fetch(`/api/polls/${params.id}/respond`).then(r => r.json()).then(d => setResult(d.data));
          }}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-12 pb-24 space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-blue-600 text-sm">
        <ArrowLeft className="w-4 h-4" />Polls
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-5 h-5 text-blue-600" />
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">
            {type.replace(/_/g, " ")}
          </span>
          <span className="text-xs text-gray-400 ml-auto">
            <Users className="w-3 h-3 inline mr-1" />{poll.totalResponses} votes
          </span>
        </div>
        <h1 className="font-bold text-gray-900 text-lg leading-snug">{poll.question}</h1>
        {poll.description && <p className="text-sm text-gray-500 mt-2">{poll.description}</p>}
      </div>

      {/* Results display */}
      {voted && type === "binary" && Array.isArray(results) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Community Results</h3>
          {results.map((r: any) => (
            <div key={r.value} className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium w-8 capitalize">{r.value}</span>
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${r.value === "yes" ? "bg-emerald-500" : "bg-red-400"}`}
                  style={{ width: `${getPercent(r._count)}%` }} />
              </div>
              <span className="text-sm font-bold text-gray-700 w-10 text-right">{getPercent(r._count)}%</span>
            </div>
          ))}
        </div>
      )}

      {voted && type === "multiple_choice" && Array.isArray(results) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Community Results</h3>
          {results.map((opt: any) => (
            <div key={opt.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{opt.text}</span>
                <span className="text-sm font-bold text-gray-900">{getPercent(opt.count)}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${getPercent(opt.count)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Voting UI */}
      {!voted && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Cast your vote</h3>

          {type === "binary" && (
            <div className="flex gap-3">
              <button onClick={() => vote("yes")}
                className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />Yes
              </button>
              <button onClick={() => vote("no")}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl active:scale-95 transition-all">
                No
              </button>
            </div>
          )}

          {type === "multiple_choice" && Array.isArray(poll.options) && (
            <div className="space-y-2">
              {poll.options.map(opt => (
                <button key={opt.id} onClick={() => vote(opt.text, opt.id)}
                  className="w-full text-left px-4 py-3 border-2 border-gray-200 hover:border-blue-400 rounded-xl text-sm font-medium transition-all active:scale-98">
                  {opt.text}
                </button>
              ))}
            </div>
          )}

          {type === "slider" && <SliderVote onVote={(v) => vote(String(v))} />}

          {type === "ranked" && Array.isArray(poll.options) && (
            <RankedVote options={poll.options} onVote={(ranked) => {
              fetch(`/api/polls/${params.id}/respond`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rankedResponses: ranked }),
              }).then(() => { setVoted(true); toast.success("Vote recorded!"); });
            }} />
          )}
        </div>
      )}

      {voted && <div className="text-center py-4 text-emerald-600 font-semibold text-sm">✅ Your vote has been recorded</div>}
    </div>
  );
}

function SliderVote({ onVote }: { onVote: (v: number) => void }) {
  const [val, setVal] = useState(50);
  return (
    <div className="space-y-4">
      <div className="flex justify-between text-xs text-gray-500">
        <span>0</span><span className="font-bold text-blue-600 text-lg">{val}</span><span>100</span>
      </div>
      <input type="range" min="0" max="100" value={val}
        onChange={e => setVal(Number(e.target.value))} className="w-full accent-blue-600" />
      <button onClick={() => onVote(val)}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all">
        Submit Rating
      </button>
    </div>
  );
}

function RankedVote({ options, onVote }: { options: PollOption[]; onVote: (ranked: { optionId: string; rank: number }[]) => void }) {
  const [order, setOrder] = useState(options);
  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...order];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setOrder(next);
  }
  function moveDown(idx: number) {
    if (idx === order.length - 1) return;
    const next = [...order];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setOrder(next);
  }
  return (
    <div className="space-y-2">
      {order.map((opt, i) => (
        <div key={opt.id} className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200">
          <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
          <span className="flex-1 text-sm font-medium">{opt.text}</span>
          <div className="flex flex-col gap-0.5">
            <button onClick={() => moveUp(i)} className="text-gray-400 hover:text-gray-700 text-xs leading-none">▲</button>
            <button onClick={() => moveDown(i)} className="text-gray-400 hover:text-gray-700 text-xs leading-none">▼</button>
          </div>
        </div>
      ))}
      <button onClick={() => onVote(order.map((o, i) => ({ optionId: o.id, rank: i + 1 })))}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all mt-3">
        Submit Rankings
      </button>
    </div>
  );
}
