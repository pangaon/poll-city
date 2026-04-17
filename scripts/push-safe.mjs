#!/usr/bin/env node
import { execSync } from "node:child_process";

function run(command, options = {}) {
  return execSync(command, { stdio: "pipe", encoding: "utf8", ...options }).trim();
}

function runLogged(command) {
  console.log(`\n$ ${command}`);
  const env = command.includes("npm run build")
    ? { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096", NEXT_TELEMETRY_DISABLED: "1" }
    : process.env;
  execSync(command, { stdio: "inherit", env });
}

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

const shouldPush = !process.argv.includes("--no-push");

try {
  run("git rev-parse --is-inside-work-tree");
} catch {
  fail("Not inside a git repository.");
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
runLogged("npm run build");

if (shouldPush) {
  runLogged("git push");
  console.log("\nSafe push completed.");
} else {
  console.log("\nSafe verification completed (--no-push).\n");
}
