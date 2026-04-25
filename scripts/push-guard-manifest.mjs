#!/usr/bin/env node
/**
 * push-guard-manifest.mjs
 *
 * Generates a structured verification manifest for the push guard agent.
 * Run this BEFORE spawning the guard agent. The output is what the guard
 * agent uses to know what to verify — but the guard MUST re-verify
 * everything independently using its own tools. It does not trust this output.
 *
 * Usage (from a Claude session):
 *   npm run push:manifest
 *   → paste the output to the push guard agent brief
 */

import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

function run(cmd) {
  try {
    return execSync(cmd, { stdio: "pipe", encoding: "utf8" }).trim();
  } catch {
    return "(command failed)";
  }
}

const branch      = run("git rev-parse --abbrev-ref HEAD");
const headHash    = run("git rev-parse --short HEAD");
const commitCount = run("git rev-list --count origin/main..HEAD");
const logLines    = run(`git log --oneline -${Math.max(Number(commitCount) || 1, 1)} HEAD`);
const diffStat    = run(`git diff origin/main..HEAD --stat`);
const changedFiles = run(`git diff origin/main..HEAD --name-only`).split("\n").filter(Boolean);

// SHA-256 of the full diff — push-safe.mjs recomputes this at push time.
// If they differ: someone committed after approval → push is blocked.
// The guard MUST include this hash verbatim in approved.json as "diffHash".
const rawDiff  = run("git diff origin/main..HEAD");
const diffHash = crypto.createHash("sha256").update(rawDiff).digest("hex");

// ── RISK SCORING ─────────────────────────────────────────────────────────────
// Determines which model the working agent should use for the push guard.
// Higher risk = more independent reasoning needed = more capable model.
// ─────────────────────────────────────────────────────────────────────────────
let riskScore = 0;
const riskReasons = [];

if (changedFiles.length > 10)                        { riskScore += 3; riskReasons.push(`${changedFiles.length} files changed (large diff)`); }
else if (changedFiles.length > 4)                    { riskScore += 1; riskReasons.push(`${changedFiles.length} files changed (medium diff)`); }

if (changedFiles.some(f => f.includes("schema.prisma")))     { riskScore += 3; riskReasons.push("Prisma schema changed (migration required)"); }
if (changedFiles.some(f => f.includes("/auth/")))             { riskScore += 3; riskReasons.push("Auth code changed"); }
if (changedFiles.some(f => f.includes("fundraising") || f.includes("donation") || f.includes("stripe"))) { riskScore += 3; riskReasons.push("Payment/donation code changed"); }
if (changedFiles.some(f => f.includes("/api/")))              { riskScore += 2; riskReasons.push("API routes changed"); }
if (changedFiles.some(f => f.startsWith("mobile/") || f.startsWith("mobile-pcs/"))) { riskScore += 2; riskReasons.push("Mobile app changed"); }
if (changedFiles.some(f => f.includes("permissions") || f.includes("ops/")))        { riskScore += 2; riskReasons.push("Permissions or ops code changed"); }
if (changedFiles.some(f => f.includes("middleware")))         { riskScore += 2; riskReasons.push("Middleware changed"); }

const recommendedModel =
  riskScore >= 7 ? "opus"    :  // claude-opus-4-7 — genuine architectural reasoning
  riskScore >= 3 ? "sonnet"  :  // claude-sonnet-4-6 — default
                   "haiku";     // claude-haiku-4-5-20251001 — fast, cheap, small fixes

const manifest = {
  generatedAt: new Date().toISOString(),
  branch,
  headHash,
  commitsSinceMain: Number(commitCount) || 0,
  recentCommits: logLines,
  diffStat,
  changedFiles,
  diffHash,
  risk: { score: riskScore, reasons: riskReasons, recommendedModel },
  guardTokenPath: ".push-guard/approved.json",
  instructions: [
    "This manifest is what the WORKING AGENT claims was changed.",
    "The push guard MUST independently verify every file in changedFiles.",
    "The push guard MUST run: git diff origin/main..HEAD to read the actual diff.",
    "The push guard MUST read CONNECTIONS.md and verify platform logic connections.",
    "The push guard MUST NOT trust any summary provided by the working agent.",
    "The guard MUST include 'diffHash' verbatim from this manifest in approved.json.",
    "push-safe.mjs will recompute the hash at push time — mismatch = blocked push.",
    "If anything fails verification, write .push-guard/rejected.json instead.",
  ],
};

console.log("\n=== PUSH GUARD MANIFEST ===");
console.log(JSON.stringify(manifest, null, 2));
console.log("\n=== END MANIFEST ===");
console.log(`\nRisk score    : ${riskScore} — use ${recommendedModel.toUpperCase()} for the guard agent`);
if (riskReasons.length > 0) {
  console.log(`Risk reasons  : ${riskReasons.join(" | ")}`);
}
console.log(`\nNext steps:`);
console.log(`  1. Spawn push guard agent (model: ${recommendedModel}) using prompt in docs/PUSH_GUARD_PROTOCOL.md`);
console.log(`  2. Pass this manifest + your work brief to the guard`);
console.log(`  3. Guard writes .push-guard/approved.json`);
console.log(`  4. Run: npm run push:safe\n`);
