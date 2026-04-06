"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { stripMarkdown } from "@/lib/adoni/formatting";

type ChatMessage = { role: "user" | "assistant"; content: string };
type AdoniMode = "bubble" | "panel" | "fullscreen";
type BubbleDragState = "idle" | "drag-detected" | "drag-over" | "dropped";
type StructuredMode = "none" | "stats" | "contacts" | "email" | "roster" | "gotv";

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

interface StructuredData {
  mode: StructuredMode;
  payload?: Record<string, unknown>;
}

const STRUCTURED_HINTS: Record<Exclude<StructuredMode, "none">, RegExp[]> = {
  stats: [/support rate/i, /doors knocked/i, /finance/i, /days to election/i],
  contacts: [/contact table/i, /call list/i, /support level/i],
  email: [/subject/i, /open in composer/i, /draft email/i],
  roster: [/volunteer/i, /doors knocked/i, /availability/i],
  gotv: [/p1/i, /p2/i, /p3/i, /p4/i, /gotv/i],
};

const DEFAULT_STRUCTURED_DATA: Record<Exclude<StructuredMode, "none">, Record<string, unknown>> = {
  stats: {
    supportRate: 58,
    doorsToday: 212,
    activeVolunteers: 34,
    financePace: 71,
    daysToElection: 42,
    missingReceipts: 6,
  },
  contacts: {
    rows: [
      { name: "Avery Ross", phone: "+1-416-555-0191", support: "Leaning Support", lastContacted: "2d ago" },
      { name: "Jordan Patel", phone: "+1-647-555-0142", support: "Undecided", lastContacted: "5d ago" },
      { name: "Morgan Lee", phone: "Hidden", support: "Strong Support", lastContacted: "Today" },
    ],
  },
  email: {
    subject: "Quick volunteer push for this weekend",
    body: "Hi team, we are close to our weekend target. Please claim one extra shift if you can. Reply if you need a turf reassignment.",
  },
  roster: {
    rows: [
      { name: "Casey Nguyen", role: "Lead", doors: 76, availability: "Evenings", hasCar: true },
      { name: "Drew Martin", role: "Volunteer", doors: 41, availability: "Weekends", hasCar: false },
      { name: "Sam Kim", role: "Volunteer", doors: 29, availability: "Afternoons", hasCar: true },
    ],
  },
  gotv: {
    p1: 812,
    p2: 531,
    p3: 289,
    p4: 118,
    voted: 903,
    totalSupporters: 1750,
    actions: ["Text P1 no-response list", "Dispatch rides for P2 seniors", "Call undecided absentee requests"],
  },
};

function greetingByTime(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function inferStructuredMode(text: string): StructuredMode {
  for (const [mode, patterns] of Object.entries(STRUCTURED_HINTS)) {
    if (patterns.some((p) => p.test(text))) {
      return mode as StructuredMode;
    }
  }
  return "none";
}

function cycleMode(current: AdoniMode, mobile: boolean): AdoniMode {
  if (mobile) {
    return current === "bubble" ? "panel" : "bubble";
  }
  if (current === "bubble") return "panel";
  if (current === "panel") return "fullscreen";
  return "bubble";
}

function roleBadgeClass(level: string): string {
  if (/strong/i.test(level)) return "bg-emerald-100 text-emerald-700";
  if (/leaning/i.test(level)) return "bg-blue-100 text-blue-700";
  if (/undecided/i.test(level)) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function AdoniButton() {
  const pathname = usePathname();
  const [mode, setMode] = useState<AdoniMode>("bubble");
  const [prompt, setPrompt] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [contextLine, setContextLine] = useState<string>("");
  const [muted, setMuted] = useState(false);
  const [campaignName, setCampaignName] = useState("Poll City Campaign");
  const [isMobile, setIsMobile] = useState(false);
  const [dragState, setDragState] = useState<BubbleDragState>("idle");
  const [structured, setStructured] = useState<StructuredData>({ mode: "none" });
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setIsMobile(media.matches);
      setMode((prev) => (media.matches && prev === "fullscreen" ? "panel" : prev));
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    function onHotkey(ev: KeyboardEvent) {
      if ((ev.metaKey || ev.ctrlKey) && ev.shiftKey && ev.key.toLowerCase() === "a") {
        ev.preventDefault();
        setMode((prev) => cycleMode(prev, isMobile));
      }
    }
    window.addEventListener("keydown", onHotkey);
    return () => window.removeEventListener("keydown", onHotkey);
  }, [isMobile]);

  useEffect(() => {
    try {
      setMuted(localStorage.getItem("adoni:muted") === "1");
    } catch {
      // ignore local storage access issues
    }
  }, []);

  useEffect(() => {
    function onOpenRequest(ev: Event) {
      const detail = (ev as CustomEvent).detail as { prefill?: string } | undefined;
      if (detail?.prefill) {
        setPrompt(detail.prefill);
      }
      setMode("panel");
    }

    function onStructured(ev: Event) {
      const detail = (ev as CustomEvent).detail as StructuredData | undefined;
      if (!detail?.mode) return;
      setStructured(detail);
      setMode((prev) => (prev === "bubble" ? "panel" : prev));
    }

    window.addEventListener("pollcity:open-adoni", onOpenRequest as EventListener);
    window.addEventListener("pollcity:adoni-structured", onStructured as EventListener);

    return () => {
      window.removeEventListener("pollcity:open-adoni", onOpenRequest as EventListener);
      window.removeEventListener("pollcity:adoni-structured", onStructured as EventListener);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/adoni/suggestions?page=${encodeURIComponent(pathname)}`)
      .then((r) => r.json())
      .then((data: SuggestionPayload) => {
        if (!mounted) return;
        setSuggestions(
          data.suggestions?.length
            ? data.suggestions.slice(0, 4)
            : [
                "Daily brief",
                "Volunteer roster",
                "GOTV status",
                "Build a call list",
              ],
        );
        setCampaignName(data.context.campaignName || "Poll City Campaign");
        const dte =
          data.context.daysToElection === null
            ? "Election date not set"
            : `${data.context.daysToElection} days to election`;
        setContextLine(`${data.context.page} | ${dte}`);
      })
      .catch(() => {
        if (!mounted) return;
        setSuggestions(["Daily brief", "Volunteer roster", "GOTV status", "Build a call list"]);
        setContextLine("Context unavailable");
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

  useEffect(() => {
    function onDragStart() {
      if (mode === "bubble") setDragState("drag-detected");
    }
    function onDragEnd() {
      setDragState("idle");
    }
    window.addEventListener("dragstart", onDragStart);
    window.addEventListener("dragend", onDragEnd);
    return () => {
      window.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("dragend", onDragEnd);
    };
  }, [mode]);

  function toggleMuted() {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("adoni:muted", next ? "1" : "0");
      } catch {
        // ignore local storage access issues
      }
      return next;
    });
  }

  const assistantIntro = useMemo(
    () => `${greetingByTime()}. I can help with strategy, targeting, and execution on this page.`,
    [],
  );

  const unreadCount = useMemo(() => (suggestions.length > 0 ? Math.min(suggestions.length, 9) : 0), [suggestions]);

  async function send(text: string) {
    const userText = text.trim();
    if (!userText || streaming) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);
    setPrompt("");
    setStreaming(true);
    setMode((prev) => (prev === "bubble" ? "panel" : prev));

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

      const assistantMessage = messages[messages.length - 1]?.content ?? "";
      const inferredMode = inferStructuredMode(assistantMessage);
      if (inferredMode !== "none") {
        setStructured({ mode: inferredMode, payload: DEFAULT_STRUCTURED_DATA[inferredMode] });
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

  async function handleDropToBubble(ev: React.DragEvent<HTMLButtonElement>) {
    ev.preventDefault();
    const payload = ev.dataTransfer.getData("application/json") || ev.dataTransfer.getData("text/plain");
    setDragState("dropped");
    setMode("panel");
    await send(payload ? `Help me act on this item now: ${payload}` : "Help me act on the dropped item.");
    window.setTimeout(() => setDragState("idle"), 1200);
  }

  const bubbleSize = dragState === "drag-over" ? 80 : 60;
  const showChat = mode !== "bubble";

  return (
    <>
      {mode === "bubble" && (
        <div
          className="fixed z-40"
          style={{
            bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
            right: "1.25rem",
          }}
        >
          <button
            type="button"
            onClick={() => setMode("panel")}
            onDragOver={(ev) => {
              ev.preventDefault();
              setDragState("drag-over");
            }}
            onDragLeave={() => setDragState("drag-detected")}
            onDrop={handleDropToBubble}
            className="relative rounded-full overflow-hidden shadow-xl hover:shadow-2xl transition-all ring-2 ring-white/40 block"
            style={{
              height: `${bubbleSize}px`,
              width: `${bubbleSize}px`,
              transformOrigin: "bottom center",
              boxShadow:
                dragState === "drag-over"
                  ? "0 0 0 8px rgba(59,130,246,0.28), 0 18px 36px rgba(30,64,175,0.35)"
                  : undefined,
            }}
            aria-label="Ask Adoni"
          >
            <span
              className="absolute inset-0 rounded-full"
              style={{
                animation: "adoni-pulse-ring 1.8s ease-out infinite",
                border: "2px solid rgba(220, 38, 38, 0.75)",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/adoni-bubble.png"
              alt="Ask Adoni"
              className="h-full w-full object-cover"
              style={{ borderRadius: "50%" }}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-6 min-w-6 px-1 rounded-full bg-sky-500 text-white text-[11px] font-semibold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            {dragState !== "idle" && (
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-700 px-3 py-1 text-[11px] font-semibold text-white">
                {dragState === "drag-detected" && "Drop item to ask Adoni"}
                {dragState === "drag-over" && "Release to send to Adoni"}
                {dragState === "dropped" && "Item sent"}
              </span>
            )}
          </button>
        </div>
      )}

      {showChat && (
        <>
          {mode === "panel" && (
            <div className="fixed bottom-5 right-5 z-50 w-[400px] max-w-[calc(100vw-1rem)] max-h-[85vh] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl">
              <header className="flex items-center justify-between bg-gradient-to-r from-blue-800 to-sky-600 px-4 py-3 text-white">
                <div>
                  <p className="text-sm font-semibold">Adoni</p>
                  <p className="text-[11px] text-blue-100">{campaignName}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMode("bubble")}
                    className="rounded-md p-1 hover:bg-blue-900/40"
                    aria-label="Minimize Adoni"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                  {!isMobile && (
                    <button
                      type="button"
                      onClick={() => setMode("fullscreen")}
                      className="rounded-md p-1 hover:bg-blue-900/40"
                      aria-label="Open full Adoni"
                    >
                      <PanelRightOpen className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleMuted}
                    className="rounded-md p-1 hover:bg-blue-900/40"
                    aria-label={muted ? "Unmute Adoni" : "Mute Adoni"}
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("bubble")}
                    className="rounded-md p-1 hover:bg-blue-900/40"
                    aria-label="Close Adoni"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="text-xs text-slate-500">{contextLine || "Loading context"}</p>
                <p className="font-medium text-slate-900 mt-1">{assistantIntro}</p>
              </div>

              <MessageArea messages={messages} streaming={streaming} scrollerRef={scrollerRef} />

              <div className="border-t border-slate-200 px-3 pt-2 pb-3 bg-white">
                <div className="mb-2 flex gap-2 overflow-x-auto">
                  {(suggestions.length ? suggestions : ["Daily brief", "Volunteer roster", "GOTV status", "Build a call list"]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => void send(item)}
                      className="whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700 hover:bg-sky-100"
                    >
                      <Sparkles className="inline mr-1 h-3.5 w-3.5" />
                      {item}
                    </button>
                  ))}
                </div>
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(prompt);
                  }}
                >
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask Adoni"
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
            </div>
          )}

          {mode === "fullscreen" && !isMobile && (
            <div className="fixed inset-0 z-[60] bg-slate-950/40 animate-[adoni-fade-in_260ms_ease-out]">
              <div className="absolute inset-4 rounded-3xl bg-white shadow-2xl overflow-hidden grid grid-cols-[480px_1fr]">
                <section className="border-r border-slate-200 flex flex-col min-h-0">
                  <header className="flex items-center justify-between bg-gradient-to-r from-blue-800 to-sky-600 px-5 py-4 text-white">
                    <div>
                      <p className="text-sm font-semibold">Adoni</p>
                      <p className="text-xs text-blue-100">{campaignName}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMode("panel")}
                        className="rounded-md p-1.5 hover:bg-blue-900/40"
                        aria-label="Collapse fullscreen"
                      >
                        <PanelRightClose className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={toggleMuted}
                        className="rounded-md p-1.5 hover:bg-blue-900/40"
                        aria-label={muted ? "Unmute Adoni" : "Mute Adoni"}
                      >
                        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("bubble")}
                        className="rounded-md p-1.5 hover:bg-blue-900/40"
                        aria-label="Close Adoni"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </header>

                  <div className="px-5 py-3 border-b border-slate-200 text-sm text-slate-700">
                    <p className="text-xs text-slate-500">{contextLine || "Loading context"}</p>
                    <p className="font-medium text-slate-900 mt-1">{assistantIntro}</p>
                  </div>

                  <MessageArea messages={messages} streaming={streaming} scrollerRef={scrollerRef} />

                  <div className="border-t border-slate-200 px-4 pt-3 pb-4 bg-white">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {(suggestions.length ? suggestions : ["Daily brief", "Volunteer roster", "GOTV status", "Build a call list"]).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => void send(item)}
                          className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700 hover:bg-sky-100"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void send(prompt);
                      }}
                    >
                      <input
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask Adoni"
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
                </section>

                <section className="min-h-0 overflow-y-auto bg-slate-50 p-6">
                  <StructuredPanel structured={structured} setStructured={setStructured} />
                </section>
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        @keyframes adoni-pulse-ring {
          0% { transform: scale(0.95); opacity: 0.7; }
          70% { transform: scale(1.25); opacity: 0.12; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes adoni-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  );
}

function MessageArea({
  messages,
  streaming,
  scrollerRef,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  scrollerRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 bg-white">
      {messages.length === 0 && (
        <p className="text-sm text-slate-500">Ask anything about campaign priorities and execution.</p>
      )}
      {messages.map((m, idx) => (
        <div
          key={`${m.role}-${idx}`}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div className={`max-w-[82%] flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            {m.role === "assistant" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/images/adoni-bubble.png"
                alt="Adoni"
                className="h-8 w-8 rounded-full object-cover mt-1"
              />
            )}
            <div
              className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.role === "assistant" ? (stripMarkdown(m.content) || (streaming ? "Thinking..." : "")) : m.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StructuredPanel({
  structured,
  setStructured,
}: {
  structured: StructuredData;
  setStructured: (value: StructuredData) => void;
}) {
  const mode = structured.mode;

  if (mode === "none") {
    const actions = ["Daily brief", "Volunteer roster", "GOTV status", "Build a call list"];
    return (
      <div className="h-full rounded-2xl border border-dashed border-slate-300 bg-white p-6 flex flex-col justify-center">
        <p className="text-lg font-semibold text-slate-900">Structured Output</p>
        <p className="mt-2 text-sm text-slate-600">Run one of these actions to fill this workspace.</p>
        <div className="mt-4 grid gap-2">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() =>
                setStructured({
                  mode: action.toLowerCase().includes("roster")
                    ? "roster"
                    : action.toLowerCase().includes("gotv")
                      ? "gotv"
                      : action.toLowerCase().includes("call")
                        ? "contacts"
                        : "stats",
                  payload: action.toLowerCase().includes("roster")
                    ? DEFAULT_STRUCTURED_DATA.roster
                    : action.toLowerCase().includes("gotv")
                      ? DEFAULT_STRUCTURED_DATA.gotv
                      : action.toLowerCase().includes("call")
                        ? DEFAULT_STRUCTURED_DATA.contacts
                        : DEFAULT_STRUCTURED_DATA.stats,
                })
              }
              className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (mode === "stats") {
    const payload = (structured.payload ?? DEFAULT_STRUCTURED_DATA.stats) as Record<string, number>;
    const supportRate = Number(payload.supportRate ?? 0);
    const doorsToday = Number(payload.doorsToday ?? 0);
    const activeVolunteers = Number(payload.activeVolunteers ?? 0);
    const financePace = Number(payload.financePace ?? 0);
    const daysToElection = Number(payload.daysToElection ?? 0);
    const missingReceipts = Number(payload.missingReceipts ?? 0);

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Support rate</p>
          <div className="mt-3 h-32 w-32 rounded-full border-[10px] border-blue-200 border-t-blue-700 flex items-center justify-center text-2xl font-semibold text-blue-900">
            {supportRate}%
          </div>
        </article>
        <article className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Doors knocked today</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{doorsToday}</p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(5, supportRate))}%` }} />
          </div>
        </article>
        <article className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Active volunteers</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{activeVolunteers}</p>
        </article>
        <article className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Finance pace</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{financePace}%</p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.min(100, Math.max(5, financePace))}%` }} />
          </div>
        </article>
        <article className="rounded-2xl bg-white border border-slate-200 p-5 md:col-span-2">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-sm text-slate-500">Days to election</p>
              <p className="text-2xl font-semibold text-slate-900">{daysToElection}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Missing receipts</p>
              <p className={`text-2xl font-semibold ${missingReceipts > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {missingReceipts}
              </p>
            </div>
          </div>
        </article>
      </div>
    );
  }

  if (mode === "contacts") {
    const rows = ((structured.payload ?? DEFAULT_STRUCTURED_DATA.contacts) as Record<string, unknown>).rows as Array<Record<string, string>>;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Support</th>
              <th className="px-4 py-3 text-left">Last contacted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row.name}-${idx}`} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">
                  {row.phone === "Hidden" ? row.phone : <a className="text-blue-700" href={`tel:${row.phone}`}>{row.phone}</a>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${roleBadgeClass(row.support)}`}>{row.support}</span>
                </td>
                <td className="px-4 py-3">{row.lastContacted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (mode === "email") {
    const payload = (structured.payload ?? DEFAULT_STRUCTURED_DATA.email) as Record<string, string>;
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Subject</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{payload.subject}</p>
        <p className="mt-4 text-sm text-slate-500">Body</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{payload.body}</p>
        <button type="button" className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">
          Open in Composer
        </button>
      </article>
    );
  }

  if (mode === "roster") {
    const rows = ((structured.payload ?? DEFAULT_STRUCTURED_DATA.roster) as Record<string, unknown>).rows as Array<Record<string, unknown>>;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Doors</th>
              <th className="px-4 py-3 text-left">Availability</th>
              <th className="px-4 py-3 text-left">Car</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${String(row.name)}-${idx}`} className="border-t border-slate-100">
                <td className="px-4 py-3">{String(row.name)}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-1 text-xs">{String(row.role)}</span></td>
                <td className="px-4 py-3">{String(row.doors)}</td>
                <td className="px-4 py-3">{String(row.availability)}</td>
                <td className="px-4 py-3">{Boolean(row.hasCar) ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const payload = (structured.payload ?? DEFAULT_STRUCTURED_DATA.gotv) as Record<string, unknown>;
  const voted = Number(payload.voted ?? 0);
  const total = Number(payload.totalSupporters ?? 1);
  const pct = Math.round((voted / Math.max(1, total)) * 100);
  const actions = (payload.actions as string[]) || [];

  return (
    <div className="grid gap-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">P tier breakdown</p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-700">P1</p><p className="text-xl font-semibold text-emerald-900">{String(payload.p1)}</p></div>
          <div className="rounded-lg bg-blue-50 p-3"><p className="text-xs text-blue-700">P2</p><p className="text-xl font-semibold text-blue-900">{String(payload.p2)}</p></div>
          <div className="rounded-lg bg-amber-50 p-3"><p className="text-xs text-amber-700">P3</p><p className="text-xl font-semibold text-amber-900">{String(payload.p3)}</p></div>
          <div className="rounded-lg bg-rose-50 p-3"><p className="text-xs text-rose-700">P4</p><p className="text-xl font-semibold text-rose-900">{String(payload.p4)}</p></div>
        </div>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Voted counter</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{voted} / {total}</p>
        <div className="mt-3 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.min(100, Math.max(3, pct))}%` }} />
        </div>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Priority actions</p>
        <div className="mt-2 space-y-2">
          {actions.map((item) => (
            <p key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{item}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
