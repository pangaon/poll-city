"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, Check, X, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { SwipePoll } from "@/components/polls/swipe-poll";

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
interface PollOption { id: string; text: string; order: number; imageUrl?: string; }
interface PollData {
  id: string; question: string; type: string;
  totalResponses: number; description: string | null;
  options: PollOption[];
}
interface PollResult { poll: PollData; results: unknown; type: string; }

/* ── Confetti ────────────────────────────────────────────────────────────── */
function Confetti() {
  const colors = ["#f59e0b","#ef4444","#3b82f6","#10b981","#ec4899","#8b5cf6","#06b6d4","#f97316"];
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${(i / 40) * 100}%`,
    delay: `${(i % 8) * 0.1}s`,
    size: `${Math.floor(i % 3) * 4 + 6}px`,
    duration: `${1.5 + (i % 4) * 0.3}s`,
  }));

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "confetti-kf";
    style.textContent = `
      @keyframes confettiFall {
        0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
      .confetti-p { animation: confettiFall var(--dur) ease-in var(--delay) forwards; }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById("confetti-kf")?.remove(); };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-p absolute rounded-sm"
          style={{
            left: p.left,
            top: "-20px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            "--delay": p.delay,
            "--dur": p.duration,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ── Animated result bar ─────────────────────────────────────────────────── */
function ResultBar({ label, percent, color, voted }: { label: string; percent: number; color: string; voted?: boolean }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(percent), 80);
    return () => clearTimeout(t);
  }, [percent]);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-white/90">{label}</span>
        <span className="font-bold text-white">{percent}%</span>
      </div>
      <div className="h-3 bg-white/20 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {voted && <p className="text-xs text-white/60 text-right">← your vote</p>}
    </div>
  );
}

/* ── Swipe Card (binary polls) ───────────────────────────────────────────── */
function SwipeCard({
  question, description, gradient, onVote,
}: {
  question: string; description: string | null; gradient: string;
  onVote: (vote: "yes" | "no") => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [flying, setFlying] = useState<"left" | "right" | null>(null);
  const touchStartX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    setDragX(e.touches[0].clientX - touchStartX.current);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (Math.abs(dragX) > 90) {
      const dir = dragX > 0 ? "right" : "left";
      setFlying(dir);
      setTimeout(() => onVote(dir === "right" ? "yes" : "no"), 350);
    } else {
      setDragX(0);
    }
  }, [dragX, onVote]);

  const rotation = dragX * 0.08;
  const absX = Math.abs(dragX);
  const showYes = dragX > 40;
  const showNo = dragX < -40;
  const flyX = flying === "right" ? 900 : flying === "left" ? -900 : dragX;

  const cardStyle: React.CSSProperties = {
    transform: `translateX(${flyX}px) rotate(${rotation}deg)`,
    transition: isDragging && !flying ? "none" : "transform 0.38s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.38s",
    opacity: flying ? 0 : 1 - absX / 400,
  };

  const glowStyle: React.CSSProperties = showYes
    ? { boxShadow: `0 0 ${absX / 2}px rgba(34,197,94,${Math.min(absX / 150, 0.7)})` }
    : showNo
    ? { boxShadow: `0 0 ${absX / 2}px rgba(239,68,68,${Math.min(absX / 150, 0.7)})` }
    : {};

  return (
    <div className="relative select-none touch-none">
      {/* Background hint card */}
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${gradient} opacity-40 scale-[0.96] translate-y-3`} />

      {/* Main card */}
      <div
        className={`relative rounded-3xl bg-gradient-to-br ${gradient} cursor-grab active:cursor-grabbing`}
        style={{ ...cardStyle, ...glowStyle, minHeight: "65vh" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Yes/No overlays */}
        <div className={`absolute top-8 left-8 px-4 py-2 border-4 border-emerald-400 rounded-2xl transition-opacity duration-150 ${showYes ? "opacity-100" : "opacity-0"}`}>
          <p className="text-emerald-400 font-black text-3xl tracking-widest">YES</p>
        </div>
        <div className={`absolute top-8 right-8 px-4 py-2 border-4 border-red-400 rounded-2xl transition-opacity duration-150 ${showNo ? "opacity-100" : "opacity-0"}`}>
          <p className="text-red-400 font-black text-3xl tracking-widest">NO</p>
        </div>

        {/* Content */}
        <div className="flex flex-col justify-end h-full p-8 pb-10" style={{ minHeight: "65vh" }}>
          <p className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wider">What do you think?</p>
          <h2 className="text-white text-2xl sm:text-3xl font-black leading-tight mb-3">{question}</h2>
          {description && <p className="text-white/70 text-sm leading-relaxed">{description}</p>}
        </div>
      </div>

      {/* Desktop buttons */}
      <div className="hidden sm:flex gap-4 mt-5 justify-center">
        <button
          onClick={() => { setFlying("left"); setTimeout(() => onVote("no"), 350); }}
          className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-red-200 text-red-600 font-bold rounded-2xl hover:bg-red-50 transition-all hover:scale-105 shadow-sm"
        >
          <X className="w-5 h-5" /> No
        </button>
        <button
          onClick={() => { setFlying("right"); setTimeout(() => onVote("yes"), 350); }}
          className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-emerald-200 text-emerald-600 font-bold rounded-2xl hover:bg-emerald-50 transition-all hover:scale-105 shadow-sm"
        >
          <Check className="w-5 h-5" /> Yes
        </button>
      </div>

      {/* Mobile hint */}
      <p className="sm:hidden text-center text-gray-400 text-xs mt-4">← Swipe to vote →</p>
    </div>
  );
}

/* ── Slider vote ─────────────────────────────────────────────────────────── */
function SliderVote({ gradient, onVote }: { gradient: string; onVote: (v: number) => void }) {
  const [val, setVal] = useState(50);
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${gradient} p-8`} style={{ minHeight: "55vh" }}>
      <div className="flex flex-col justify-end h-full">
        <p className="text-white/70 text-sm uppercase tracking-wider mb-3">Rate it</p>
        <p className="text-white text-6xl font-black mb-8">{val}</p>
        <input
          type="range" min="0" max="100" value={val}
          onChange={e => setVal(Number(e.target.value))}
          className="w-full mb-8 accent-white"
        />
        <div className="flex justify-between text-white/60 text-sm mb-8">
          <span>0 — Terrible</span><span>100 — Excellent</span>
        </div>
        <button
          onClick={() => onVote(val)}
          className="w-full py-4 bg-white/20 hover:bg-white/30 text-white font-bold text-lg rounded-2xl transition-all border border-white/30"
        >
          Submit Rating
        </button>
      </div>
    </div>
  );
}

/* ── Ranked vote ─────────────────────────────────────────────────────────── */
function RankedVote({
  options, gradient, onVote,
}: {
  options: PollOption[]; gradient: string;
  onVote: (ranked: { optionId: string; rank: number }[]) => void;
}) {
  const [order, setOrder] = useState(options);
  function move(idx: number, dir: -1 | 1) {
    const next = [...order];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  }
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${gradient} p-6`}>
      <p className="text-white/70 text-sm uppercase tracking-wider mb-2">Drag to rank</p>
      <h2 className="text-white font-black text-xl mb-5">Order your preferences</h2>
      <div className="space-y-2 mb-5">
        {order.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
            <span className="w-7 h-7 bg-white/20 text-white rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
            <span className="flex-1 text-white font-medium text-sm">{opt.text}</span>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => move(i, -1)} className="text-white/60 hover:text-white"><ChevronUp className="w-4 h-4" /></button>
              <button onClick={() => move(i, 1)} className="text-white/60 hover:text-white"><ChevronDown className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onVote(order.map((o, i) => ({ optionId: o.id, rank: i + 1 })))}
        className="w-full py-4 bg-white/20 hover:bg-white/30 text-white font-bold rounded-2xl transition-all border border-white/30"
      >
        Submit Rankings
      </button>
    </div>
  );
}

/* ── Multiple choice ─────────────────────────────────────────────────────── */
function MultipleChoiceVote({
  question, options, gradient, onVote,
}: {
  question: string; options: PollOption[]; gradient: string;
  onVote: (optionId: string, text: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${gradient} p-6 sm:p-8`} style={{ minHeight: "60vh" }}>
      <div className="flex flex-col justify-end h-full" style={{ minHeight: "52vh" }}>
        <p className="text-white/70 text-sm uppercase tracking-wider mb-3">Choose one</p>
        <h2 className="text-white font-black text-xl sm:text-2xl leading-tight mb-6">{question}</h2>
        <div className="space-y-3">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { setSelected(opt.id); onVote(opt.id, opt.text); }}
              className={`w-full text-left px-5 py-4 rounded-2xl font-semibold text-sm transition-all border-2 ${
                selected === opt.id
                  ? "bg-white text-gray-900 border-white shadow-lg scale-[1.02]"
                  : "bg-white/15 text-white border-white/30 hover:bg-white/25"
              }`}
            >
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Results display ─────────────────────────────────────────────────────── */
function ResultsDisplay({
  poll, results, gradient, onBack,
}: {
  poll: PollData; results: unknown; gradient: string; onBack: () => void;
}) {
  const totalResponses = poll.totalResponses;

  function pct(count: number) {
    return totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
  }

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${gradient} p-6 sm:p-8`} style={{ minHeight: "65vh" }}>
      <div className="flex flex-col justify-between h-full" style={{ minHeight: "57vh" }}>
        <div>
          <p className="text-white/70 text-sm uppercase tracking-wider mb-2">Results</p>
          <h2 className="text-white font-black text-xl sm:text-2xl leading-tight mb-2">{poll.question}</h2>
          <p className="text-white/60 text-sm mb-8 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />{totalResponses} votes
          </p>

          {/* Binary results */}
          {poll.type === "binary" && Array.isArray(results) && (
            <div className="space-y-4">
              {(results as Array<{ value: string; _count: number }>).map(r => (
                <ResultBar
                  key={r.value}
                  label={r.value === "yes" ? "Yes" : "No"}
                  percent={pct(r._count)}
                  color={r.value === "yes" ? "bg-emerald-400" : "bg-red-400"}
                />
              ))}
            </div>
          )}

          {/* Multiple choice results */}
          {poll.type === "multiple_choice" && Array.isArray(results) && (
            <div className="space-y-4">
              {(results as Array<{ id: string; text: string; count: number }>).map(opt => (
                <ResultBar
                  key={opt.id}
                  label={opt.text}
                  percent={pct(opt.count)}
                  color="bg-white/60"
                />
              ))}
            </div>
          )}

          {/* Slider/other results */}
          {poll.type === "slider" && (
            <div className="bg-white/15 rounded-2xl p-5 text-center">
              <p className="text-white/70 text-sm">Average Rating</p>
              <p className="text-white text-6xl font-black mt-2">
                {Array.isArray(results) && (results as Array<{ value: string; _count: number }>).length > 0
                  ? Math.round(
                      (results as Array<{ value: string; _count: number }>).reduce(
                        (s, r) => s + Number(r.value) * r._count, 0
                      ) / totalResponses
                    )
                  : "—"}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onBack}
            className="flex-1 py-3 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-2xl transition-all border border-white/30 text-sm"
          >
            ← Back to polls
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<PollResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

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
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
      toast.success("Vote recorded!");
      const d = await fetch(`/api/polls/${params.id}/respond`).then(r => r.json());
      setResult(d.data);
    } else {
      toast.error("Failed to record vote");
    }
  }

  async function voteRanked(ranked: { optionId: string; rank: number }[]) {
    const res = await fetch(`/api/polls/${params.id}/respond`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rankedResponses: ranked }),
    });
    if (res.ok) {
      setVoted(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
      toast.success("Vote recorded!");
      const d = await fetch(`/api/polls/${params.id}/respond`).then(r => r.json());
      setResult(d.data);
    } else {
      toast.error("Failed to record vote");
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="px-4 pt-10 pb-4">
        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="h-[65vh] bg-gray-200 rounded-3xl animate-pulse" />
      </div>
    </div>
  );

  if (!result) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Poll not found</p>
    </div>
  );

  const { poll, results, type } = result;
  const gradient = getGradient(poll.id);

  // Swipe / image_swipe — use existing SwipePoll component
  if ((type === "swipe" || type === "image_swipe") && !voted) {
    const options = poll.options.map(o => ({
      id: o.id, text: o.text, imageUrl: (o as { imageUrl?: string }).imageUrl,
    }));
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 pt-10 pb-24">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-blue-600 text-sm font-medium mb-5">
            <ArrowLeft className="w-4 h-4" /> Polls
          </button>
          <SwipePoll
            pollId={poll.id} question={poll.question} options={options}
            type={type as "swipe" | "image_swipe"}
            onComplete={() => {
              setVoted(true);
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 2500);
              fetch(`/api/polls/${params.id}/respond`).then(r => r.json()).then(d => setResult(d.data));
            }}
          />
        </div>
        {showConfetti && <Confetti />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showConfetti && <Confetti />}

      <div className="px-4 pt-10 pb-24 max-w-lg mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-blue-600 text-sm font-medium mb-5">
          <ArrowLeft className="w-4 h-4" /> Polls
        </button>

        {/* Voted — show results */}
        {voted && result && (
          <ResultsDisplay
            poll={poll} results={results} gradient={gradient}
            onBack={() => router.push("/social/polls")}
          />
        )}

        {/* Not voted — show voting UI */}
        {!voted && (
          <>
            {type === "binary" && (
              <SwipeCard
                question={poll.question}
                description={poll.description}
                gradient={gradient}
                onVote={(v) => vote(v)}
              />
            )}
            {type === "multiple_choice" && (
              <MultipleChoiceVote
                question={poll.question}
                options={poll.options}
                gradient={gradient}
                onVote={(optionId, text) => vote(text, optionId)}
              />
            )}
            {type === "slider" && (
              <SliderVote gradient={gradient} onVote={(v) => vote(String(v))} />
            )}
            {type === "ranked" && (
              <RankedVote options={poll.options} gradient={gradient} onVote={voteRanked} />
            )}
            {/* Fallback for any other types */}
            {!["binary","multiple_choice","slider","ranked","swipe","image_swipe"].includes(type) && (
              <div className={`rounded-3xl bg-gradient-to-br ${gradient} p-8`} style={{ minHeight: "60vh" }}>
                <div className="flex flex-col justify-end h-full" style={{ minHeight: "52vh" }}>
                  <h2 className="text-white font-black text-2xl mb-6">{poll.question}</h2>
                  <button onClick={() => vote("yes")}
                    className="w-full py-4 bg-white/20 hover:bg-white/30 text-white font-bold rounded-2xl transition-all border border-white/30">
                    Submit Vote
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
