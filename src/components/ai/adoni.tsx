"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Send, Sparkles, X } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

type SuggestionPayload = {
  context: {
    page: string;
    campaignName: string;
    daysToElection: number | null;
    contactCount: number;
    supporterCount: number;
    volunteerCount: number;
    userName: string;
  };
  suggestions: string[];
};

function greetingByTime(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Dad jokes — kept for levity
const DAD_JOKES: readonly string[] = [
  "Why did the candidate cross the road? To canvass the other side.",
  "What do you call a lawn sign that sings? A jingle bell.",
  "My campaign manager said I need more door knocks. I said — knock yourself out.",
  "Why did the volunteer bring a ladder to the rally? They heard the stakes were high.",
  "What's a politician's favourite fish? The debate herring.",
  "Our GOTV plan is so good, even the non-voters RSVP'd.",
  "Why did the budget spreadsheet go to therapy? Too many unbalanced feelings.",
  "What do you call it when a candidate eats too much? A super-majority.",
  "My turf was so tough, the map app asked for a raise.",
  "I ran for office once. Then I walked the rest of the way.",
];

// Encouragement — campaigns are long and hard
const ENCOURAGEMENT: readonly string[] = [
  "Campaigns are marathons, not sprints. You're doing the work most people won't.",
  "Every door you knock, every call you make — it compounds. Keep going.",
  "Your future constituents are counting on you showing up today. And you are.",
  "Democracy runs on volunteers like you. Thank you.",
  "Hard week? Rest is strategy too. Take the break you need.",
  "Small wins stack. Ten doors today is one hundred by end of week.",
  "The candidates who win are the ones who kept going when it got boring.",
  "You can't pour from an empty cup. Eat something real, drink water, then get back at it.",
  "Nobody remembers the campaigns that quit. They remember the ones that showed up.",
  "Progress over perfection. Ship the flyer. Send the email. Knock the door.",
];

// Page-aware tips — only fire on the matching route
const PAGE_TIPS: Record<string, string[]> = {
  "/contacts": [
    "Tip — add the GOTV Score column to prioritise who to call first.",
    "Tag your top-tier supporters. Future you will thank past you.",
  ],
  "/canvassing": [
    "Batch your canvass shifts by street side — faster loops, happier volunteers.",
    "Hydration break. Your canvassers need water more than pep talks.",
  ],
  "/canvassing/walk": [
    "Odd/even sides of the street = half the crossings = twice the doors.",
    "Log every not-home. Future revisits are golden.",
  ],
  "/gotv": [
    "GOTV math: 1 supporter contacted 3 times > 3 supporters contacted once.",
    "The calls that feel redundant are the ones that move turnout.",
  ],
  "/budget": [
    "Track expenses weekly, not at the deadline. Your CFO will love you.",
    "Leaving budget on the table is leaving votes on the table.",
  ],
  "/donations": [
    "Ask once a week. Ask specifically. Ask confidently.",
    "People give to campaigns that ask. That's it. That's the whole thing.",
  ],
  "/volunteers": [
    "A thank-you text this week keeps volunteers coming back next week.",
    "Match skills to tasks — nobody quits a shift they're good at.",
  ],
  "/dashboard": [
    "Pick the single highest-leverage thing today. Do that before anything else.",
    "Your health score isn't your worth — it's your roadmap. Use it.",
  ],
  "/settings/brand": [
    "One tweak at a time. Pick a colour, save, come back tomorrow.",
  ],
  "/print/templates": [
    "Pro tip: order signs in batches of 25. Runs cheaper than 10 at a time.",
  ],
};

type MessageKind = "joke" | "encouragement" | "tip";
interface AdoniMessage { kind: MessageKind; text: string; }

function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Smart selection:
//  • 40% chance of a page-aware tip if the current route matches
//  • 35% encouragement (weighted higher in morning + late evening)
//  • 25% joke
// This is page-awareness via the URL only — no tracking beyond that.
function pickMessage(pathname: string): AdoniMessage {
  const tips = Object.entries(PAGE_TIPS).find(([path]) =>
    path === pathname || pathname.startsWith(path + "/"),
  )?.[1];
  const roll = Math.random();
  if (tips && roll < 0.4) return { kind: "tip", text: pickOne(tips) };
  const hour = new Date().getHours();
  const encouragementWeight = hour < 9 || hour >= 20 ? 0.45 : 0.3;
  if (roll < 0.4 + encouragementWeight) {
    return { kind: "encouragement", text: pickOne(ENCOURAGEMENT) };
  }
  return { kind: "joke", text: pickOne(DAD_JOKES) };
}

export default function AdoniButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestion, setSuggestion] = useState<string>("");
  const [contextLine, setContextLine] = useState<string>("");
  const [waving, setWaving] = useState(false);
  const [message, setMessage] = useState<AdoniMessage | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const hasAutoOpened = sessionStorage.getItem("adoni:auto-opened") === "1";
      if (hasAutoOpened) return;
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem("adoni:auto-opened", "1");
      }, 900);
      return () => clearTimeout(timer);
    } catch {
      const timer = setTimeout(() => setOpen(true), 900);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    function onOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("pollcity:open-adoni", onOpenRequest as EventListener);
    return () => window.removeEventListener("pollcity:open-adoni", onOpenRequest as EventListener);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/adoni/suggestions?page=${encodeURIComponent(pathname)}`)
      .then((r) => r.json())
      .then((data: SuggestionPayload) => {
        if (!mounted) return;
        const first = data.suggestions?.[0] ?? "Want a quick strategy check for this page?";
        setSuggestion(first);
        const dte =
          data.context.daysToElection === null
            ? "Election date not set"
            : `${data.context.daysToElection} day(s) to election`;
        setContextLine(`${data.context.campaignName} · ${dte}`);
      })
      .catch(() => {
        if (!mounted) return;
        setSuggestion("Need help prioritizing today’s highest-impact actions?");
      });

    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  // Periodic wave + context-aware message. First wave after 12s, then every
  // 2-3 minutes while the chat is closed. Picks a joke, encouragement, or a
  // page-specific tip based on the current route + time of day.
  useEffect(() => {
    if (open) return;
    const triggerWave = () => {
      setMessage(pickMessage(pathname));
      setWaving(true);
      window.setTimeout(() => setWaving(false), 2500);
      window.setTimeout(() => setMessage(null), 9000);
    };
    const initial = window.setTimeout(triggerWave, 12_000);
    // Randomise interval slightly so it doesn't feel robotic
    const jitter = () => 120_000 + Math.floor(Math.random() * 60_000);
    let interval: number;
    const tick = () => {
      triggerWave();
      interval = window.setTimeout(tick, jitter());
    };
    interval = window.setTimeout(tick, jitter());
    return () => {
      window.clearTimeout(initial);
      window.clearTimeout(interval);
    };
  }, [open, pathname]);

  const assistantIntro = useMemo(
    () => `${greetingByTime()}. I'm Adoni. I can help with strategy, targeting, and execution on this page.`,
    []
  );

  async function send(text: string) {
    const userText = text.trim();
    if (!userText || streaming) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);
    setPrompt("");
    setStreaming(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/adoni/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: pathname, messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Adoni request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          const last = copy[lastIdx];
          if (last.role !== "assistant") return prev;
          copy[lastIdx] = { ...last, content: `${last.content}${chunk}` };
          return copy;
        });
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (lastIdx >= 0 && copy[lastIdx].role === "assistant") {
          copy[lastIdx] = {
            role: "assistant",
            content: "I could not respond right now. Please try again.",
          };
        }
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {!open && (
        <div
          className="fixed z-40"
          style={{
            bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
            right: "1.25rem",
          }}
        >
          {/* Adoni speech bubble — joke, encouragement, or page-aware tip */}
          {message && (
            <div
              className="absolute bottom-[72px] right-0 w-64 max-w-[calc(100vw-2.5rem)] bg-white border border-blue-200 rounded-2xl rounded-br-sm shadow-xl p-3 text-sm text-slate-800 animate-[adoni-pop_0.3s_ease-out]"
              role="status"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMessage(null);
                }}
                className="absolute top-1 right-1 text-slate-400 hover:text-slate-700 w-6 h-6 rounded-full flex items-center justify-center"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <p className="font-semibold text-xs uppercase tracking-wide mb-1 flex items-center gap-1.5" style={{
                color: message.kind === "tip" ? "#0f766e" : message.kind === "encouragement" ? "#7c3aed" : "#1e40af",
              }}>
                <span>
                  {message.kind === "joke" ? "👋" : message.kind === "encouragement" ? "💪" : "💡"}
                </span>
                <span>
                  {message.kind === "joke" ? "Adoni" : message.kind === "encouragement" ? "Adoni cheering you on" : "Adoni tip"}
                </span>
              </p>
              <p className="pr-4 leading-snug">{message.text}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full overflow-hidden shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-transform ring-2 ring-white/40 block"
            style={{
              height: "60px",
              width: "60px",
              transformOrigin: "bottom center",
              animation: waving ? "adoni-wave 0.6s ease-in-out 3" : undefined,
            }}
            aria-label="Ask Adoni"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/adoni-bubble.png"
              alt="Ask Adoni"
              className="h-full w-full object-cover"
              style={{ borderRadius: "50%" }}
            />
          </button>
          <style jsx>{`
            @keyframes adoni-wave {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(-14deg); }
              50% { transform: rotate(12deg); }
              75% { transform: rotate(-8deg); }
            }
            @keyframes adoni-pop {
              0% { opacity: 0; transform: translateY(8px) scale(0.96); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto rounded-2xl border border-blue-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-blue-700 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">Adoni AI Assistant</p>
              <p className="text-[11px] text-blue-100">{contextLine || "Campaign context loading..."}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 hover:bg-blue-800"
              aria-label="Close Adoni"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-slate-200 bg-blue-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{assistantIntro}</p>
            <button
              type="button"
              onClick={() => void send(suggestion)}
              className="mt-2 inline-flex items-start gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-left text-xs text-blue-800 hover:bg-blue-100"
            >
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{suggestion}</span>
            </button>
          </div>

          <div ref={scrollerRef} className="max-h-80 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">Ask me anything about your campaign execution priorities.</p>
            )}
            {messages.map((m, idx) => (
              <div
                key={`${m.role}-${idx}`}
                className={`rounded-xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-8 bg-blue-700 text-white"
                    : "mr-8 bg-slate-100 text-slate-800"
                }`}
              >
                {m.content || (m.role === "assistant" && streaming ? "Thinking..." : "")}
              </div>
            ))}
          </div>

          <form
            className="flex items-center gap-2 border-t border-slate-200 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(prompt);
            }}
          >
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Adoni..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="submit"
              disabled={streaming || !prompt.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
