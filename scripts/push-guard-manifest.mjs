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

const manifest = {
  generatedAt: new Date().toISOString(),
  branch,
  headHash,
  commitsSinceMain: Number(commitCount) || 0,
  recentCommits: logLines,
  diffStat,
  changedFiles,
  diffHash,
  guardTokenPath: ".push-guard/approved.json",
  instructions: [
    "This manifest is what the WORKING AGENT claims was changed.",
    "The push guard MUST independently verify every file in changedFiles.",
    "The push guard MUST run: git diff origin/main..HEAD to read the actual diff.",
    "The push guard MUST NOT trust any summary provided by the working agent.",
    "The guard MUST include 'diffHash' verbatim from this manifest in approved.json.",
    "push-safe.mjs will recompute the hash at push time — mismatch = blocked push.",
    "If anything fails verification, write .push-guard/rejected.json instead.",
  ],
};

console.log("\n=== PUSH GUARD MANIFEST ===");
console.log(JSON.stringify(manifest, null, 2));
console.log("\n=== END MANIFEST ===\n");
console.log("Next step: spawn the push guard agent with this manifest + your work brief.");
console.log("The guard writes .push-guard/approved.json if the push is approved.");
console.log("Then run: npm run push:safe\n");
