"use client";
/**
 * SwipePoll — Tinder-style polling for Poll City Social
 * Left = No/Disagree, Right = Yes/Agree, Up = Strong Yes, Down = Skip
 * Works with touch (mobile) and mouse drag (desktop)
 */
import { useState, useRef, useEffect } from "react";
import { Check, X, ChevronUp, SkipForward, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SwipeOption {
  id: string;
  text: string;
  imageUrl?: string;
  color?: string;
}

interface SwipePollProps {
  pollId: string;
  question: string;
  options: SwipeOption[];        // for image_swipe type
  type: "swipe" | "image_swipe";
  onComplete?: (responses: SwipeResponse[]) => void;
}

interface SwipeResponse {
  optionId: string;
  direction: "left" | "right" | "up" | "skip";
  timeMs: number;
}

const SWIPE_THRESHOLD = 80;     // px to trigger swipe
const ROTATION_FACTOR = 0.08;   // how much card rotates

export function SwipePoll({ pollId, question, options, type, onComplete }: SwipePollProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<SwipeResponse[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [exitDir, setExitDir] = useState<"left" | "right" | "up" | null>(null);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<any>(null);
  const startPos = useRef({ x: 0, y: 0, time: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const currentOption = options[currentIdx];
  const isLastCard = currentIdx === options.length - 1;

  // Determine overlay color based on drag direction
  const overlayColor = dragX > SWIPE_THRESHOLD / 2
    ? "right"
    : dragX < -SWIPE_THRESHOLD / 2
    ? "left"
    : dragY < -SWIPE_THRESHOLD / 2
    ? "up"
    : null;

  function handleSwipe(direction: "left" | "right" | "up" | "skip") {
    if (!currentOption) return;
    const timeMs = Date.now() - startPos.current.time;

    const response: SwipeResponse = { optionId: currentOption.id, direction, timeMs };
    const newResponses = [...responses, response];
    setResponses(newResponses);

    setExitDir(direction === "skip" ? "left" : direction);

    setTimeout(() => {
      setExitDir(null);
      setDragX(0);
      setDragY(0);

      if (currentIdx >= options.length - 1) {
        // All done — submit
        submitResponses(newResponses);
      } else {
        setCurrentIdx(i => i + 1);
      }
    }, 300);
  }

  async function submitResponses(finalResponses: SwipeResponse[]) {
    try {
      const res = await fetch(`/api/polls/${pollId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swipeResponses: finalResponses }),
      });
      const data = await res.json();
      setResults(data.data);
      setDone(true);
      onComplete?.(finalResponses);
    } catch {
      setDone(true);
    }
  }

  // Touch handlers
  function onTouchStart(e: React.TouchEvent) {
    startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    setIsDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging) return;
    setDragX(e.touches[0].clientX - startPos.current.x);
    setDragY(e.touches[0].clientY - startPos.current.y);
  }

  function onTouchEnd() {
    setIsDragging(false);
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      handleSwipe(dragX > 0 ? "right" : "left");
    } else if (dragY < -SWIPE_THRESHOLD) {
      handleSwipe("up");
    } else {
      setDragX(0);
      setDragY(0);
    }
  }

  // Mouse handlers (desktop)
  function onMouseDown(e: React.MouseEvent) {
    startPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsDragging(true);
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging) return;
      setDragX(e.clientX - startPos.current.x);
      setDragY(e.clientY - startPos.current.y);
    }
    function onMouseUp() {
      if (!isDragging) return;
      setIsDragging(false);
      if (Math.abs(dragX) > SWIPE_THRESHOLD) {
        handleSwipe(dragX > 0 ? "right" : "left");
      } else if (dragY < -SWIPE_THRESHOLD) {
        handleSwipe("up");
      } else {
        setDragX(0);
        setDragY(0);
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [isDragging, dragX, dragY]);

  if (done) return <SwipePollResults question={question} responses={responses} results={results} total={options.length} />;

  const rotation = dragX * ROTATION_FACTOR;
  const cardStyle = exitDir
    ? { transform: `translateX(${exitDir === "right" ? "120%" : exitDir === "left" ? "-120%" : "0"}) translateY(${exitDir === "up" ? "-120%" : "0"}) rotate(${exitDir === "right" ? 20 : exitDir === "left" ? -20 : 0}deg)`, transition: "transform 0.3s ease", opacity: 0 }
    : { transform: `translateX(${dragX}px) translateY(${dragY * 0.3}px) rotate(${rotation}deg)`, cursor: isDragging ? "grabbing" : "grab" };

  return (
    <div className="flex flex-col items-center gap-5 select-none">
      {/* Question */}
      <div className="text-center px-4">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Quick Poll</p>
        <h2 className="font-bold text-gray-900 text-base leading-snug">{question}</h2>
        <p className="text-xs text-gray-400 mt-1">{currentIdx + 1} of {options.length}</p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {options.map((_, i) => (
          <div key={i} className={cn("h-1.5 rounded-full transition-all",
            i < currentIdx ? "bg-emerald-400 w-4" : i === currentIdx ? "bg-blue-500 w-6" : "bg-gray-200 w-1.5")} />
        ))}
      </div>

      {/* Card stack */}
      <div className="relative w-72 h-96">
        {/* Background cards */}
        {options.slice(currentIdx + 1, currentIdx + 3).reverse().map((opt, i) => (
          <div key={opt.id} className="absolute inset-0 rounded-3xl bg-white border border-gray-200 shadow-md"
            style={{ transform: `scale(${0.92 + i * 0.04}) translateY(${(1 - i) * 10}px)`, zIndex: i }} />
        ))}

        {/* Active card */}
        {currentOption && (
          <div ref={cardRef} className="absolute inset-0 rounded-3xl bg-white border border-gray-200 shadow-xl overflow-hidden"
            style={{ ...cardStyle, zIndex: 10 }}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}>

            {/* Card content */}
            {currentOption.imageUrl ? (
              <img src={currentOption.imageUrl} alt={currentOption.text} className="w-full h-full object-cover" />
            ) : (
              <div className={cn("w-full h-full flex items-center justify-center p-8 text-center", currentOption.color ?? "bg-gradient-to-br from-blue-50 to-indigo-100")}>
                <p className="text-xl font-bold text-gray-800 leading-snug">{currentOption.text}</p>
              </div>
            )}

            {/* Swipe overlays */}
            {overlayColor === "right" && (
              <div className="absolute inset-0 bg-emerald-500/20 flex items-start justify-start p-6 rounded-3xl">
                <div className="bg-emerald-500 text-white font-black text-2xl px-4 py-2 rounded-2xl border-4 border-emerald-600 rotate-[-15deg]">YES ✓</div>
              </div>
            )}
            {overlayColor === "left" && (
              <div className="absolute inset-0 bg-red-500/20 flex items-start justify-end p-6 rounded-3xl">
                <div className="bg-red-500 text-white font-black text-2xl px-4 py-2 rounded-2xl border-4 border-red-600 rotate-[15deg]">NO ✗</div>
              </div>
            )}
            {overlayColor === "up" && (
              <div className="absolute inset-0 bg-blue-500/20 flex items-end justify-center pb-6 rounded-3xl">
                <div className="bg-blue-600 text-white font-black text-lg px-4 py-2 rounded-2xl border-4 border-blue-700">STRONGLY YES ⭐</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Button controls */}
      <div className="flex items-center gap-4">
        <button onClick={() => handleSwipe("left")}
          className="w-14 h-14 bg-red-50 border-2 border-red-200 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-md hover:bg-red-100">
          <X className="w-6 h-6 text-red-500" />
        </button>
        <button onClick={() => handleSwipe("skip")}
          className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded-full flex items-center justify-center active:scale-90 transition-all">
          <SkipForward className="w-4 h-4 text-gray-400" />
        </button>
        <button onClick={() => handleSwipe("up")}
          className="w-10 h-10 bg-blue-50 border-2 border-blue-200 rounded-full flex items-center justify-center active:scale-90 transition-all">
          <ChevronUp className="w-5 h-5 text-blue-500" />
        </button>
        <button onClick={() => handleSwipe("right")}
          className="w-14 h-14 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-md hover:bg-emerald-100">
          <Check className="w-6 h-6 text-emerald-500" />
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">← No &nbsp;&nbsp; Swipe &nbsp;&nbsp; Yes →<br />↑ Strongly Yes</p>
    </div>
  );
}

function SwipePollResults({ question, responses, results, total }: {
  question: string; responses: SwipeResponse[]; results: any; total: number;
}) {
  const yes = responses.filter(r => r.direction === "right" || r.direction === "up").length;
  const no = responses.filter(r => r.direction === "left").length;
  const skipped = responses.filter(r => r.direction === "skip").length;
  const strongYes = responses.filter(r => r.direction === "up").length;

  return (
    <div className="w-full max-w-sm space-y-5 animate-fade-in">
      <div className="text-center">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="w-7 h-7 text-emerald-600" />
        </div>
        <h2 className="font-bold text-gray-900">Thanks for your input!</h2>
        <p className="text-sm text-gray-500 mt-1">{question}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your responses</p>
        {[
          { label: "✅ Yes", value: yes, color: "bg-emerald-500", max: total },
          { label: "⭐ Strongly Yes", value: strongYes, color: "bg-blue-500", max: total },
          { label: "❌ No", value: no, color: "bg-red-400", max: total },
          { label: "⏭ Skipped", value: skipped, color: "bg-gray-300", max: total },
        ].map(({ label, value, color, max }) => value > 0 && (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">{label}</span>
              <span className="font-bold text-gray-900">{Math.round((value / max) * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${(value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {results?.communityResults && (
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />Community results ({results.communityResults.total} votes)
          </p>
          <div className="flex gap-3 text-center">
            <div className="flex-1"><p className="text-xl font-black text-emerald-600">{results.communityResults.yesPercent}%</p><p className="text-xs text-gray-500">Yes</p></div>
            <div className="flex-1"><p className="text-xl font-black text-red-500">{results.communityResults.noPercent}%</p><p className="text-xs text-gray-500">No</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
