"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  X,
  Terminal,
  Activity,
  ShieldCheck,
  Zap,
  BarChart3,
  AlertTriangle,
  ChevronUp,
  Play,
  Square,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Palette / spring ─────────────────────────────────────────────────────────

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type QuickAction = {
  label: string;
  icon: React.ReactNode;
  prompt: string;
};

type BridgeStatus = "disconnected" | "connecting" | "connected";

type BridgeCommand = { id: string; label: string };

type TermLine = {
  id: string;
  type: "stdout" | "stderr" | "system";
  text: string;
};

type ActiveRun = {
  id: string;
  label: string;
  done: boolean;
  ok?: boolean;
};

// Bridge WebSocket message shapes (inbound from daemon)
type BridgeMsg =
  | { type: "ready"; whitelist: BridgeCommand[] }
  | { type: "start"; id: string; label: string; ts: number }
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "done"; id: string; code: number; ok: boolean }
  | { type: "killed"; text: string }
  | { type: "error"; text: string }
  | { type: "pong" };

// ─── Constants ────────────────────────────────────────────────────────────────

const BRIDGE_PORT = 7433;
const BRIDGE_URL = `ws://127.0.0.1:${BRIDGE_PORT}`;
const RECONNECT_DELAY_MS = 3000;

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Deploy Status",
    icon: <Activity className="w-3.5 h-3.5" />,
    prompt:
      "Check the current deployment status. Show me recent deployments and any active ops alerts.",
  },
  {
    label: "Sniff Test",
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    prompt:
      "Run a full sniff test: check connection chain completeness, recent deployments, active alerts, env status, and flag any security concerns.",
  },
  {
    label: "Env Status",
    icon: <Zap className="w-3.5 h-3.5" />,
    prompt:
      "Check which environment variables are configured. Flag anything critical that is missing.",
  },
  {
    label: "Platform Stats",
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    prompt:
      "Show me platform-wide statistics — campaign count, user count, total contacts, memberships.",
  },
  {
    label: "Active Alerts",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    prompt: "Show all active ops alerts ordered by severity.",
  },
];

// ─── Message renderer ─────────────────────────────────────────────────────────

function renderMessageContent(content: string): React.ReactNode {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const inner = part.slice(3);
      const newlineIdx = inner.indexOf("\n");
      const lang = newlineIdx > -1 ? inner.slice(0, newlineIdx).trim() : "";
      const code =
        newlineIdx > -1
          ? inner.slice(newlineIdx + 1).replace(/```$/, "").trimEnd()
          : inner.replace(/```$/, "").trimEnd();
      return (
        <pre
          key={i}
          className="bg-black/50 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-[#1D9E75] whitespace-pre leading-relaxed"
        >
          {lang && (
            <div className="text-white/25 text-[10px] mb-1.5 uppercase tracking-widest">
              {lang}
            </div>
          )}
          <code>{code}</code>
        </pre>
      );
    }
    return (
      <span key={i} className="whitespace-pre-wrap">
        {part}
      </span>
    );
  });
}

// ─── Bridge status dot ────────────────────────────────────────────────────────

function BridgeDot({ status }: { status: BridgeStatus }) {
  if (status === "connected") {
    return <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse flex-shrink-0" />;
  }
  if (status === "connecting") {
    return <Loader2 className="w-3 h-3 text-[#EF9F27] animate-spin flex-shrink-0" />;
  }
  return <span className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BuildClient() {
  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Bridge / terminal state ──────────────────────────────────────────────────
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>("connecting");
  const [bridgeCommands, setBridgeCommands] = useState<BridgeCommand[]>([]);
  const [termLines, setTermLines] = useState<TermLine[]>([]);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const termOutputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // ── Auto-scroll chat ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Auto-scroll terminal output ───────────────────────────────────────────────
  useEffect(() => {
    if (termOutputRef.current) {
      termOutputRef.current.scrollTop = termOutputRef.current.scrollHeight;
    }
  }, [termLines]);

  // ── Bridge WebSocket connection (auto-reconnect) ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (cancelled) return;

      setBridgeStatus("connecting");

      const ws = new WebSocket(BRIDGE_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        setBridgeStatus("connected");
      };

      ws.onmessage = (e) => {
        if (cancelled) return;
        let msg: BridgeMsg;
        try {
          msg = JSON.parse(e.data) as BridgeMsg;
        } catch {
          return;
        }

        switch (msg.type) {
          case "ready":
            setBridgeCommands(msg.whitelist);
            break;

          case "start":
            setActiveRun({ id: msg.id, label: msg.label, done: false });
            setTermLines([
              {
                id: crypto.randomUUID(),
                type: "system",
                text: `$ ${msg.label}\n`,
              },
            ]);
            setTerminalOpen(true); // auto-open on run
            break;

          case "stdout":
            setTermLines((prev) => [
              ...prev,
              { id: crypto.randomUUID(), type: "stdout", text: msg.text },
            ]);
            break;

          case "stderr":
            setTermLines((prev) => [
              ...prev,
              { id: crypto.randomUUID(), type: "stderr", text: msg.text },
            ]);
            break;

          case "done":
            setActiveRun((prev) =>
              prev ? { ...prev, done: true, ok: msg.ok } : null
            );
            setTermLines((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                type: "system",
                text: `\n[exit ${msg.code}] ${msg.ok ? "✓ success" : "✗ failed"}\n`,
              },
            ]);
            break;

          case "killed":
          case "error":
            setTermLines((prev) => [
              ...prev,
              { id: crypto.randomUUID(), type: "stderr", text: `\n${msg.text}\n` },
            ]);
            setActiveRun((prev) =>
              prev ? { ...prev, done: true, ok: false } : null
            );
            break;

          case "pong":
            // heartbeat — no action needed
            break;
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setBridgeStatus("disconnected");
        setBridgeCommands([]);
        setActiveRun(null);
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        // onclose fires after onerror — handled there
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // ── Send a bridge command ────────────────────────────────────────────────────
  const runBridgeCommand = useCallback((id: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "run", id }));
  }, []);

  // ── Kill active process ──────────────────────────────────────────────────────
  const killProcess = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "kill" }));
  }, []);

  // ── File handling ────────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === "string") {
        setAttachedFile({ name: file.name, content });
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  // ── Chat message sending ─────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() && !attachedFile) return;
      if (loading) return;

      const displayContent = attachedFile
        ? `[${attachedFile.name}]\n\n${text}`.trim()
        : text.trim();

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: displayContent,
      };

      const nextHistory = [...messages, userMessage];
      setMessages(nextHistory);
      setInput("");
      const sentFile = attachedFile;
      setAttachedFile(null);
      setLoading(true);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        const res = await fetch("/api/ops/build/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
            fileContent: sentFile?.content ?? null,
            fileName: sentFile?.name ?? null,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (!last || last.id !== assistantId) return prev;
            return [
              ...copy.slice(0, -1),
              { ...last, content: last.content + chunk },
            ];
          });
        }
      } catch (err) {
        console.error("[build-console]", err);
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (!last || last.id !== assistantId) return prev;
          return [
            ...copy.slice(0, -1),
            { ...last, content: "Request failed. Check the browser console." },
          ];
        });
      } finally {
        setLoading(false);
      }
    },
    [messages, attachedFile, loading]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-screen bg-[#0A2342] text-white overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0A2342]/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#1D9E75]/15 border border-[#1D9E75]/25">
            <Terminal className="w-3.5 h-3.5 text-[#1D9E75]" />
          </div>
          <div>
            <div className="text-sm font-semibold font-mono tracking-wide">BUILD CONSOLE</div>
            <div className="text-[10px] text-white/30 font-mono">poll.city/ops/build</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Bridge status */}
          <button
            onClick={() => setTerminalOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-mono transition-colors",
              bridgeStatus === "connected"
                ? "text-[#1D9E75] hover:text-[#1D9E75]/80"
                : bridgeStatus === "connecting"
                ? "text-[#EF9F27]"
                : "text-white/30 hover:text-white/50"
            )}
            title={
              bridgeStatus === "connected"
                ? "Bridge connected — click to toggle terminal"
                : bridgeStatus === "connecting"
                ? "Connecting to bridge..."
                : "Bridge offline — run: npm run bridge"
            }
          >
            {bridgeStatus === "connected" ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : bridgeStatus === "connecting" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span>
              {bridgeStatus === "connected"
                ? "BRIDGE"
                : bridgeStatus === "connecting"
                ? "CONNECTING"
                : "BRIDGE OFFLINE"}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
            <span className="text-[11px] text-white/40 font-mono">SUPER_ADMIN</span>
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="flex-shrink-0 flex gap-2 px-4 py-2.5 overflow-x-auto border-b border-white/8 scrollbar-none">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => sendMessage(action.prompt)}
            disabled={loading}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all",
              "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20",
              "text-white/60 hover:text-white",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center py-20"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Terminal className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-white/30 text-sm font-mono">Poll City Build Console</p>
              <p className="text-white/20 text-xs mt-1.5">
                Use a quick action or ask anything about the build, code, or deployments
              </p>
              <p className="text-white/15 text-xs mt-1">Drag any file to attach it</p>
              {bridgeStatus !== "connected" && (
                <p className="text-[#EF9F27]/50 text-xs mt-4 font-mono">
                  Run <span className="text-[#EF9F27]">npm run bridge</span> to enable the terminal
                </p>
              )}
            </motion.div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-6 h-6 rounded-md bg-[#1D9E75]/15 border border-[#1D9E75]/25 flex items-center justify-center mr-2.5 mt-0.5">
                  <Terminal className="w-3 h-3 text-[#1D9E75]" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-[#1D9E75]/15 border border-[#1D9E75]/25 text-white/90"
                    : "bg-white/5 border border-white/10 text-white/85 font-mono text-xs"
                )}
              >
                {msg.role === "assistant" ? (
                  msg.content ? (
                    renderMessageContent(msg.content)
                  ) : (
                    <span className="inline-block w-1.5 h-3.5 bg-[#1D9E75]/60 animate-pulse rounded-sm" />
                  )
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* ── Terminal Drawer ── */}
      <div className="flex-shrink-0 border-t border-white/10">
        {/* Drawer toggle bar */}
        <button
          onClick={() => setTerminalOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/30 transition-colors group"
        >
          <Terminal className="w-3 h-3 text-white/30 group-hover:text-white/50 flex-shrink-0" />
          <span className="text-[10px] font-mono text-white/30 group-hover:text-white/50 uppercase tracking-widest">
            Terminal
          </span>

          {/* Active run status */}
          {activeRun && !activeRun.done && (
            <div className="flex items-center gap-1.5 ml-2">
              <Loader2 className="w-3 h-3 text-[#EF9F27] animate-spin" />
              <span className="text-[10px] font-mono text-[#EF9F27] truncate max-w-[200px]">
                {activeRun.label}
              </span>
            </div>
          )}
          {activeRun?.done && (
            <div className="flex items-center gap-1.5 ml-2">
              {activeRun.ok ? (
                <CheckCircle className="w-3 h-3 text-[#1D9E75]" />
              ) : (
                <XCircle className="w-3 h-3 text-[#E24B4A]" />
              )}
              <span
                className={cn(
                  "text-[10px] font-mono truncate max-w-[200px]",
                  activeRun.ok ? "text-[#1D9E75]" : "text-[#E24B4A]"
                )}
              >
                {activeRun.label}
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <BridgeDot status={bridgeStatus} />
            <ChevronUp
              className={cn(
                "w-3.5 h-3.5 text-white/30 transition-transform",
                terminalOpen ? "" : "rotate-180"
              )}
            />
          </div>
        </button>

        {/* Drawer body */}
        <AnimatePresence>
          {terminalOpen && (
            <motion.div
              key="terminal-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 300, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="overflow-hidden bg-black/40"
            >
              <div className="flex flex-col h-full">
                {/* Command buttons */}
                <div className="flex-shrink-0 px-3 pt-2.5 pb-2 border-b border-white/8">
                  {bridgeStatus === "connected" ? (
                    <div className="flex flex-wrap gap-1.5">
                      {bridgeCommands.map((cmd) => (
                        <button
                          key={cmd.id}
                          onClick={() => runBridgeCommand(cmd.id)}
                          disabled={!!(activeRun && !activeRun.done)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-all",
                            "bg-white/5 hover:bg-[#1D9E75]/15 border border-white/10 hover:border-[#1D9E75]/30",
                            "text-white/50 hover:text-[#1D9E75]",
                            "disabled:opacity-30 disabled:cursor-not-allowed"
                          )}
                        >
                          <Play className="w-2.5 h-2.5" />
                          {cmd.label}
                        </button>
                      ))}
                      {activeRun && !activeRun.done && (
                        <button
                          onClick={killProcess}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-all bg-[#E24B4A]/10 hover:bg-[#E24B4A]/20 border border-[#E24B4A]/25 hover:border-[#E24B4A]/40 text-[#E24B4A]"
                        >
                          <Square className="w-2.5 h-2.5 fill-current" />
                          Kill
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-white/25">
                      <WifiOff className="w-3 h-3" />
                      <span className="text-[11px] font-mono">
                        {bridgeStatus === "connecting"
                          ? "Connecting to bridge daemon..."
                          : "Bridge offline — run: npm run bridge"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Output area */}
                <div
                  ref={termOutputRef}
                  className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed"
                >
                  {termLines.length === 0 ? (
                    <span className="text-white/15">
                      {bridgeStatus === "connected"
                        ? "Click a command button to run it. Output streams here in real time."
                        : "Waiting for bridge connection..."}
                    </span>
                  ) : (
                    termLines.map((line) => (
                      <span
                        key={line.id}
                        className={cn(
                          "whitespace-pre",
                          line.type === "stderr"
                            ? "text-[#E24B4A]/90"
                            : line.type === "system"
                            ? "text-[#EF9F27]/80"
                            : "text-white/70"
                        )}
                      >
                        {line.text}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Drag overlay ── */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#1D9E75]/8 border-2 border-dashed border-[#1D9E75]/40 z-50 flex flex-col items-center justify-center pointer-events-none"
          >
            <Paperclip className="w-8 h-8 text-[#1D9E75]/60 mb-2" />
            <div className="text-[#1D9E75] font-mono text-base">Drop file to attach</div>
            <div className="text-[#1D9E75]/50 font-mono text-xs mt-1">
              .ts .tsx .json .md .prisma .env .txt
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input area ── */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-white/10 bg-[#0A2342]/95"
      >
        {/* Attached file chip */}
        <AnimatePresence>
          {attachedFile && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={spring}
              className="flex items-center gap-2 mb-2"
            >
              <div className="flex items-center gap-1.5 bg-[#EF9F27]/15 border border-[#EF9F27]/30 rounded-md px-2.5 py-1 text-xs font-mono text-[#EF9F27]">
                <Paperclip className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{attachedFile.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-white/30 hover:text-white/70 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 items-end">
          {/* File picker */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".ts,.tsx,.js,.jsx,.json,.md,.prisma,.env,.env.example,.txt,.yaml,.yml,.css,.sql"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
            className={cn(
              "flex-shrink-0 p-2.5 rounded-lg border transition-colors",
              attachedFile
                ? "bg-[#EF9F27]/15 border-[#EF9F27]/30 text-[#EF9F27]"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10"
            )}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about the build, code, deployments..."
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-lg px-3.5 py-2.5 text-sm font-mono",
              "bg-white/5 border border-white/10 text-white placeholder-white/25",
              "focus:outline-none focus:border-[#1D9E75]/40",
              "transition-colors leading-relaxed"
            )}
            style={{ minHeight: "42px", maxHeight: "150px" }}
          />

          {/* Send */}
          <button
            type="submit"
            disabled={loading || (!input.trim() && !attachedFile)}
            className={cn(
              "flex-shrink-0 p-2.5 rounded-lg transition-all",
              "bg-[#1D9E75] hover:bg-[#1D9E75]/85 text-white",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-white/15 font-mono mt-2 text-center">
          Enter to send · Shift+Enter for newline · Drag any file to attach
        </p>
      </form>
    </div>
  );
}
