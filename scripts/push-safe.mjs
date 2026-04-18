#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function run(command, options = {}) {
  return execSync(command, { stdio: "pipe", encoding: "utf8", ...options }).trim();
}

function runLogged(command) {
  console.log(`\n$ ${command}`);
  const env = command.includes("npm run build")
    ? { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192", NEXT_TELEMETRY_DISABLED: "1" }
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
  try { fs.rmSync(".next", { recursive: true, force: true }); } catch {}
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
runLogged("npm run build");

if (shouldPush) {
  runLogged("git push");
  console.log("\nSafe push completed.");
} else {
  console.log("\nSafe verification completed (--no-push).\n");
}
