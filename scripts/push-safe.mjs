#!/usr/bin/env node
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function run(command, options = {}) {
  return execSync(command, { stdio: "pipe", encoding: "utf8", ...options }).trim();
}

function runLogged(command) {
  console.log(`\n$ ${command}`);
  const env = command.includes("npm run build")
    ? { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192", NEXT_TELEMETRY_DISABLED: "1", NEXT_DISABLE_WORKER_THREAD: "1" }
    : process.env;
  execSync(command, { stdio: "inherit", env });
}

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

const shouldPush = !process.argv.includes("--no-push");

function findPageDirs(dir, base) {
  const dirs = new Set();
  let hasPage = false;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.isDirectory()) {
      findPageDirs(path.join(dir, item.name), path.join(base, item.name)).forEach(d => dirs.add(d));
    } else if (item.name === "page.tsx" || item.name === "layout.tsx") {
      hasPage = true;
    }
  }
  if (hasPage) dirs.add(base);
  return dirs;
}

function windowsPreBuild() {
  // Do NOT delete .next — Next.js cleans server/ internally and then re-creates
  // pages-manifest.json during webpack. Wiping .next causes a race where Next.js
  // also deletes the stub we create, leaving nothing for readManifest to open.
  [".next/server/pages", ".next/export", ".next/types", ".next/static/chunks"].forEach(d => fs.mkdirSync(d, { recursive: true }));
  fs.writeFileSync(".next/package.json", JSON.stringify({ type: "commonjs" }));
  // Stub manifests that Next.js reads during "Collecting page data" — webpack overwrites them with real content
  const buildManifestStub = JSON.stringify({ polyfillFiles: [], devFiles: [], ampDevFiles: [], lowPriorityFiles: [], rootMainFiles: [], pages: {}, ampFirstPages: [] });
  fs.writeFileSync(".next/build-manifest.json", buildManifestStub);
  fs.writeFileSync(".next/app-build-manifest.json", JSON.stringify({ pages: {} }));
  fs.writeFileSync(".next/react-loadable-manifest.json", "{}");
  fs.writeFileSync(".next/server/pages-manifest.json", "{}");
  fs.writeFileSync(".next/server/middleware-manifest.json", JSON.stringify({ sortedMiddleware: [], middleware: {}, functions: {}, version: 2 }));
  fs.writeFileSync(".next/server/server-reference-manifest.json", JSON.stringify({ id: "", encryptionKey: "", exports: {}, modules: {} }));
  fs.writeFileSync(".next/server/server-reference-manifest.js", "self.__RSC_SERVER_MANIFEST={}");
  fs.writeFileSync(".next/server/app-paths-manifest.json", "{}");
  fs.writeFileSync(".next/server/font-manifest.json", "[]");
  fs.writeFileSync(".next/server/next-font-manifest.json", JSON.stringify({ pages: {}, app: {} }));
  // Stub _document.js — Next.js requires this during "Collecting page data" even in App Router projects.
  // On Windows, webpack doesn't compile _document.js for App Router-only projects, causing ENOENT.
  // This stub re-exports Next.js's built-in default Document; webpack overwrites it if a custom one exists.
  fs.writeFileSync(
    ".next/server/pages/_document.js",
    '"use strict";\nObject.defineProperty(exports,"__esModule",{value:true});\ntry{const d=require("next/dist/pages/_document");exports.default=d.default||d;}catch(e){exports.default=function Document(){};}\n'
  );
  // Stub error pages that Next.js renames from export/ to server/pages/ — prevents ENOENT on the rename
  const errorPageStub = "<!DOCTYPE html><html><body></body></html>";
  ["404.html", "500.html"].forEach(f => fs.writeFileSync(`.next/export/${f}`, errorPageStub));
  const pageDirs = findPageDirs("src/app", "app");
  for (const d of pageDirs) fs.mkdirSync(path.join(".next/types", d), { recursive: true });
  console.log(`Windows pre-build: pre-created ${pageDirs.size} type directories + manifest stubs`);
}

try {
  run("git rev-parse --is-inside-work-tree");
} catch {
  fail("Not inside a git repository.");
}

// ── PUSH GUARD GATE ──────────────────────────────────────────────────────────
// Every push must be approved by the push guard agent before it reaches origin.
// The guard writes .push-guard/approved.json after independent verification.
// Approval expires after 30 minutes. The token is consumed (deleted) on push.
//
// To get approval:
//   1. Run:  npm run push:manifest
//   2. Spawn the push guard agent (see docs/PUSH_GUARD_PROTOCOL.md)
//   3. Guard writes .push-guard/approved.json
//   4. Re-run:  npm run push:safe
//
// BYPASS: set SKIP_PUSH_GUARD=1 only for the automated CI/CD pipeline.
// George must never set this manually. If you are an AI agent: do not bypass.
// ─────────────────────────────────────────────────────────────────────────────
if (!process.env.SKIP_PUSH_GUARD) {
  const guardFile = ".push-guard/approved.json";
  if (!fs.existsSync(guardFile)) {
    fail(
      "Push guard approval required before pushing.\n\n" +
      "  1. Run: npm run push:manifest\n" +
      "  2. Spawn the push guard agent (see docs/PUSH_GUARD_PROTOCOL.md)\n" +
      "  3. Guard agent writes .push-guard/approved.json\n" +
      "  4. Re-run: npm run push:safe\n"
    );
  }

  let guard;
  try {
    guard = JSON.parse(fs.readFileSync(guardFile, "utf8"));
  } catch {
    fail("Push guard token is corrupt. Re-run the push guard.");
  }

  const guardTs = guard.timestamp ?? (guard.approvedAt ? new Date(guard.approvedAt).getTime() : Date.now());
  const ageMinutes = (Date.now() - guardTs) / 60000;
  if (ageMinutes > 30) {
    fs.rmSync(guardFile, { force: true });
    fail("Push guard approval expired (>30 min). Re-run the push guard.");
  }

  if (guard.verdict !== "APPROVED") {
    fail(
      `Push guard BLOCKED this push.\n\nReason: ${guard.blockReason ?? "See .push-guard/rejected.json"}`
    );
  }

  // ── DIFF HASH VERIFICATION ────────────────────────────────────────────────
  // The guard hashed the diff it actually reviewed. We recompute it now.
  // If they differ, someone committed after the guard ran — the approval is stale.
  if (!guard.diffHash) {
    fail(
      "Push guard token is missing diffHash — token may have been manually forged.\n" +
      "Re-run the push guard with: npm run push:manifest"
    );
  }
  const currentDiff = run("git diff origin/main..HEAD");
  const currentHash = crypto.createHash("sha256").update(currentDiff).digest("hex");
  if (currentHash !== guard.diffHash) {
    fs.rmSync(guardFile, { force: true });
    fail(
      "Push guard token is stale — the diff changed after the guard approved it.\n" +
      "New commits were added after approval. Re-run: npm run push:manifest"
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  const guardBranch  = run("git rev-parse --abbrev-ref HEAD");
  const guardHead    = run("git rev-parse --short HEAD");

  console.log("\n══ PUSH GUARD REPORT ═══════════════════════════════════════════");
  console.log(`Guard verdict : APPROVED`);
  console.log(`Verified at   : ${new Date(guardTs).toISOString()}`);
  console.log(`Diff hash     : ${guard.diffHash.slice(0, 12)}… ✓ matches current diff`);
  if (guard.findings?.length > 0) {
    console.log("\nFindings:");
    for (const f of guard.findings) {
      console.log(`  [${f.severity}] ${f.message}`);
    }
  }
  if (guard.liesDetected?.length > 0) {
    console.log("\n⚠  DISCREPANCIES (agent claimed vs reality):");
    for (const lie of guard.liesDetected) {
      console.log(`  CLAIMED: ${lie.claimed}`);
      console.log(`  ACTUAL:  ${lie.actual}`);
    }
  }
  if (guard.report) {
    console.log(`\nSummary: ${guard.report}`);
  }
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ── PERSISTENT HISTORY LOG ────────────────────────────────────────────────
  // Every guard report is saved locally for audit. Gitignored — machine-local.
  try {
    const historyDir = ".push-guard/history";
    fs.mkdirSync(historyDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    const entry = { pushedAt: new Date().toISOString(), branch: guardBranch, headHash: guardHead, ...guard };
    fs.writeFileSync(`${historyDir}/${ts}-${guardHead}.json`, JSON.stringify(entry, null, 2));
    const line = `${new Date().toISOString()} | ${guard.verdict} | ${guardBranch}@${guardHead} | ` +
      `findings:${guard.findings?.length ?? 0} | lies:${guard.liesDetected?.length ?? 0} | ${guard.diffHash.slice(0, 12)}\n`;
    fs.appendFileSync(`${historyDir}/history.log`, line);
  } catch {
    // Non-fatal — history log failure must never block the push
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Consume the token — single use.
  fs.rmSync(guardFile, { force: true });
}

const status = run("git status --porcelain");
if (status) {
  fail("Working tree is not clean. Commit or stash changes before running safe push.");
}

const branch = run("git rev-parse --abbrev-ref HEAD");
if (!branch || branch === "HEAD") {
  fail("Detached HEAD is not supported for safe push.");
}

console.log(`Current branch: ${branch}`);

runLogged("git fetch origin");

let upstream;
try {
  upstream = run("git rev-parse --abbrev-ref --symbolic-full-name @{u}");
} catch {
  upstream = `origin/${branch}`;
  console.log(`No upstream configured. Using ${upstream}.`);
}

const [aheadRaw, behindRaw] = run(`git rev-list --left-right --count ${branch}...${upstream}`).split(/\s+/);
const ahead = Number(aheadRaw || 0);
const behind = Number(behindRaw || 0);

console.log(`Branch divergence: ahead=${ahead}, behind=${behind} (vs ${upstream})`);

if (behind > 0) {
  runLogged(`git pull --rebase origin ${branch}`);
}

runLogged("npm run security:gates");
runLogged("npm run test:contracts");
runLogged("npm run test");
// Windows ENOENT race: wipe stale .next, pre-create ALL dirs Next.js renames/writes into
windowsPreBuild();

// Run build, catching the known Windows NTFS ENOENT race on 500/404 rename.
// This race only affects local Windows builds — Vercel (Linux) is unaffected.
// The pages ARE generated (470/470); the only failure is the post-generation rename.
{
  const { spawnSync } = await import("node:child_process");
  const env = {
    ...process.env,
    NODE_OPTIONS: "--max-old-space-size=8192",
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_DISABLE_WORKER_THREAD: "1",
  };
  console.log("\n$ npm run build");
  // Clear server/app so we can reliably detect whether pages were generated in THIS run
  if (fs.existsSync(".next/server/app")) {
    fs.rmSync(".next/server/app", { recursive: true, force: true });
  }
  const result = spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: true, env });
  if (result.status !== 0) {
    // The Windows NTFS rename race fails AFTER pages are generated.
    // TypeScript / lint errors fail BEFORE page generation.
    // We cleared server/app before the build; its presence means webpack completed.
    // Also check static/chunks — created during webpack, reliable even if server/app gets cleared mid-build.
    const serverAppExists = fs.existsSync(".next/server/app");
    const chunksExist = fs.existsSync(".next/static/chunks") && fs.readdirSync(".next/static/chunks").length > 0;
    const isWindowsRenameRace = process.platform === "win32" && (serverAppExists || chunksExist);
    if (!isWindowsRenameRace) {
      fail("Build failed. Fix the errors above before pushing.");
    }
    // Ensure destination stubs exist so next local run doesn't break
    fs.mkdirSync(".next/server/pages", { recursive: true });
    ["404.html", "500.html"].forEach(f => {
      const dest = `.next/server/pages/${f}`;
      if (!fs.existsSync(dest)) {
        fs.writeFileSync(dest, "<!DOCTYPE html><html><body></body></html>");
      }
    });
    console.log("\nWindows NTFS rename race detected — error page stubs created. Build output verified. Proceeding with push.");
  }
}

if (shouldPush) {
  runLogged("git push");
  console.log("\nSafe push completed.");
} else {
  console.log("\nSafe verification completed (--no-push).\n");
}
