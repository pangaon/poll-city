#!/usr/bin/env node
/**
 * Poll City Bridge Daemon
 *
 * A local WebSocket server that lets the Build Console (/ops/build) execute
 * whitelisted terminal commands and stream their output back in real time.
 *
 * Security model:
 *   - Binds ONLY to 127.0.0.1 (localhost) — never reachable from outside
 *   - Double-checks remoteAddress on every connection
 *   - Accepts ONLY commands in the WHITELIST below — arbitrary input is rejected
 *   - One active process at a time — a new run kills the previous one
 *
 * Usage:
 *   npm run bridge
 *
 * Then open /ops/build in your browser. The terminal panel auto-connects.
 */

import { WebSocketServer } from "ws";
import { spawn } from "child_process";

const PORT = parseInt(process.env.BRIDGE_PORT ?? "7433", 10);
const CWD = process.cwd();

// ─── Whitelist ─────────────────────────────────────────────────────────────────
// These are the ONLY commands this daemon will execute.
// Add entries deliberately. Never expose a shell escape hatch.

const WHITELIST = [
  {
    id: "build",
    label: "npm run build",
    cmd: "npm",
    args: ["run", "build"],
  },
  {
    id: "tsc",
    label: "npx tsc --noEmit",
    cmd: "npx",
    args: ["tsc", "--noEmit"],
  },
  {
    id: "git-status",
    label: "git status",
    cmd: "git",
    args: ["status"],
  },
  {
    id: "git-log",
    label: "git log --oneline -10",
    cmd: "git",
    args: ["log", "--oneline", "-10"],
  },
  {
    id: "git-push",
    label: "git push",
    cmd: "git",
    args: ["push"],
  },
  {
    id: "prisma-gen",
    label: "npx prisma generate",
    cmd: "npx",
    args: ["prisma", "generate"],
  },
  {
    id: "prisma-migrate",
    label: "npx prisma migrate dev",
    cmd: "npx",
    args: ["prisma", "migrate", "dev"],
  },
  {
    id: "lint",
    label: "npm run lint",
    cmd: "npm",
    args: ["run", "lint"],
  },
  {
    id: "typecheck",
    label: "npm run typecheck",
    cmd: "npm",
    args: ["run", "typecheck"],
  },
  {
    id: "test",
    label: "npm test",
    cmd: "npm",
    args: ["test"],
  },
];

// ─── Server ────────────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ host: "127.0.0.1", port: PORT });

console.log(`\n╔══════════════════════════════════════════╗`);
console.log(`║      Poll City Bridge Daemon v1.0.0      ║`);
console.log(`╚══════════════════════════════════════════╝`);
console.log(`\n  WebSocket : ws://127.0.0.1:${PORT}`);
console.log(`  Directory : ${CWD}`);
console.log(`  Commands  : ${WHITELIST.length} whitelisted`);
console.log(`  Security  : localhost only, whitelist-enforced`);
console.log(`\n  Open /ops/build in your browser to connect.`);
console.log(`  Ctrl+C to stop.\n`);

wss.on("connection", (ws, req) => {
  const addr = req.socket.remoteAddress;

  // Belt-and-suspenders: wss already binds to 127.0.0.1, but double-check
  const isLocal =
    addr === "127.0.0.1" ||
    addr === "::1" ||
    addr === "::ffff:127.0.0.1";

  if (!isLocal) {
    console.warn(`[bridge] Rejected connection from ${addr}`);
    ws.close(1008, "Only localhost connections are permitted.");
    return;
  }

  console.log(`[bridge] Browser connected (${addr})`);

  // Send the whitelist so the UI can render command buttons dynamically
  send(ws, {
    type: "ready",
    whitelist: WHITELIST.map((c) => ({ id: c.id, label: c.label })),
  });

  /** @type {import("child_process").ChildProcess | null} */
  let activeProc = null;

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString("utf8"));
    } catch {
      send(ws, { type: "error", text: "Invalid message format." });
      return;
    }

    // ── run ──────────────────────────────────────────────────────────────────
    if (msg.type === "run") {
      // Kill any in-progress process before starting a new one
      if (activeProc && !activeProc.killed) {
        activeProc.kill();
        activeProc = null;
      }

      const cmd = WHITELIST.find((c) => c.id === String(msg.id ?? ""));
      if (!cmd) {
        send(ws, {
          type: "error",
          text: `Command not in whitelist: ${String(msg.id ?? "(empty)")}`,
        });
        return;
      }

      console.log(`[bridge] $ ${cmd.label}`);
      send(ws, { type: "start", id: cmd.id, label: cmd.label, ts: Date.now() });

      activeProc = spawn(cmd.cmd, cmd.args, {
        cwd: CWD,
        env: process.env,
        shell: true, // Required on Windows for npm/npx
        windowsHide: true,
      });

      activeProc.stdout?.on("data", (chunk) => {
        send(ws, { type: "stdout", text: chunk.toString("utf8") });
      });

      activeProc.stderr?.on("data", (chunk) => {
        send(ws, { type: "stderr", text: chunk.toString("utf8") });
      });

      activeProc.on("close", (code) => {
        const exitCode = code ?? -1;
        console.log(`[bridge] Exit ${exitCode}: ${cmd.label}`);
        send(ws, { type: "done", id: cmd.id, code: exitCode, ok: exitCode === 0 });
        activeProc = null;
      });

      activeProc.on("error", (err) => {
        console.error(`[bridge] Process error: ${err.message}`);
        send(ws, { type: "error", text: `Process error: ${err.message}` });
        activeProc = null;
      });

      return;
    }

    // ── kill ─────────────────────────────────────────────────────────────────
    if (msg.type === "kill") {
      if (activeProc && !activeProc.killed) {
        activeProc.kill();
        activeProc = null;
        send(ws, { type: "killed", text: "Process killed." });
        console.log(`[bridge] Process killed by user`);
      }
      return;
    }

    // ── ping ─────────────────────────────────────────────────────────────────
    if (msg.type === "ping") {
      send(ws, { type: "pong" });
      return;
    }
  });

  ws.on("close", () => {
    console.log(`[bridge] Browser disconnected`);
    if (activeProc && !activeProc.killed) {
      activeProc.kill();
      activeProc = null;
    }
  });

  ws.on("error", (err) => {
    console.error(`[bridge] WebSocket error: ${err.message}`);
  });
});

wss.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[bridge] ERROR: Port ${PORT} is already in use.\n` +
        `  Kill the existing bridge process, or set BRIDGE_PORT=<port> to use a different port.`
    );
  } else {
    console.error(`[bridge] Server error: ${err.message}`);
  }
  process.exit(1);
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * @param {import("ws").WebSocket} ws
 * @param {object} data
 */
function send(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// ─── Graceful shutdown ─────────────────────────────────────────────────────────

process.on("SIGINT", () => {
  console.log("\n[bridge] Shutting down...");
  wss.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  wss.close(() => process.exit(0));
});
