#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, "docs/video-library/videos.catalog.json");
const OUTPUT_PATH = path.join(ROOT, "docs/video-library/video-plan.generated.json");

const requiredVideos = [
  { id: "canvasser-getting-started", title: "Canvasser: Getting Started", category: "Getting Started" },
  { id: "canvasser-start-assignment", title: "Canvasser: Start Assignment", category: "Canvassing Core Flow" },
  { id: "canvasser-door-result-fast", title: "Canvasser: Log Door Result (Fast Path)", category: "Canvassing Core Flow" },
  { id: "canvasser-sign-request", title: "Canvasser: Request a Sign", category: "Canvassing Core Flow" },
  { id: "canvasser-volunteer-lead", title: "Canvasser: Capture Volunteer Lead", category: "Canvassing Core Flow" },
  { id: "canvasser-offline-mode", title: "Canvasser: Offline Mode + Sync Recovery", category: "Offline + Sync" },
  { id: "canvasser-map-list-toggle", title: "Canvasser: Switch Map/List Without Losing Context", category: "Canvassing Core Flow" },
  { id: "adoni-basic", title: "Adoni: Basic Door Note", category: "Adoni Usage + Fallback" },
  { id: "adoni-structured-actions", title: "Adoni: Structured Actions + Confirm Save", category: "Adoni Usage + Fallback" },
  { id: "adoni-fallback-manual-fast-mode", title: "Adoni Fallback: Manual Fast Mode", category: "Adoni Usage + Fallback" },
  { id: "manager-live-progress", title: "Field Manager: Live Progress View", category: "Manager Operations" },
  { id: "manager-resolve-sync-conflict", title: "Field Manager: Resolve Sync Conflict", category: "Manager Operations" },
  { id: "troubleshoot-login-sync", title: "Troubleshooting: Login + Sync Issues", category: "Troubleshooting" },
  { id: "troubleshoot-assignment-missing", title: "Troubleshooting: Missing Assignment", category: "Troubleshooting" }
];

function readCatalog() {
  if (!fs.existsSync(CATALOG_PATH)) {
    return { updatedAt: new Date().toISOString(), videos: [] };
  }

  try {
    const raw = fs.readFileSync(CATALOG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.videos)) return { updatedAt: new Date().toISOString(), videos: [] };
    return parsed;
  } catch {
    return { updatedAt: new Date().toISOString(), videos: [] };
  }
}

const catalog = readCatalog();
const existingById = new Map(catalog.videos.map((v) => [v.id, v]));

const missing = [];
const present = [];
for (const req of requiredVideos) {
  const existing = existingById.get(req.id);
  if (!existing) {
    missing.push({ ...req, status: "MISSING" });
    continue;
  }
  present.push({
    ...req,
    status: "PRESENT",
    url: existing.url ?? null,
    durationSec: existing.durationSec ?? null,
    updatedAt: existing.updatedAt ?? null
  });
}

const plan = {
  generatedAt: new Date().toISOString(),
  summary: {
    requiredCount: requiredVideos.length,
    presentCount: present.length,
    missingCount: missing.length,
    completionPercent: requiredVideos.length === 0 ? 100 : Math.round((present.length / requiredVideos.length) * 100)
  },
  missing,
  present,
  nextActions: [
    "Produce all videos in missing[] using the template workflow in docs/VIDEO_AUTOMATION_PLAN.md",
    "After publishing, update docs/video-library/videos.catalog.json with id/url/durationSec/updatedAt",
    "Re-run npm run video:plan until missingCount is 0"
  ]
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(plan, null, 2) + "\n");
console.log(`Generated ${path.relative(ROOT, OUTPUT_PATH)} — missing ${plan.summary.missingCount}/${plan.summary.requiredCount}`);
