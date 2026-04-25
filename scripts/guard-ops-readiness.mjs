#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const REQUIRED_FILES = [
  'docs/CANVASSER_NON_FORGET_CHECKLIST.md',
  'docs/PUSH_DEPLOY_AUTOPILOT.md',
  'docs/DEPLOY_CLAIM_VERIFICATION.md',
  'docs/AGENT_ENV_BOOTSTRAP.md',
  'docs/VIDEO_AUTOMATION_PLAN.md',
  'docs/video-library/videos.catalog.json'
];

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function safeSh(cmd) {
  try {
    return sh(cmd);
  } catch {
    return null;
  }
}

const missingFiles = REQUIRED_FILES.filter((f) => !fs.existsSync(f));
const changedAgainstMain = safeSh('git diff --name-only origin/main..HEAD')
  ?.split('\n')
  .map((x) => x.trim())
  .filter(Boolean) ?? [];

const schemaChanged = changedAgainstMain.includes('prisma/schema.prisma');

const catalogRaw = fs.existsSync('docs/video-library/videos.catalog.json')
  ? fs.readFileSync('docs/video-library/videos.catalog.json', 'utf8')
  : '{"videos":[]}';

let catalogCount = 0;
try {
  const parsed = JSON.parse(catalogRaw);
  catalogCount = Array.isArray(parsed.videos) ? parsed.videos.length : 0;
} catch {
  catalogCount = 0;
}

const videoPlanExists = fs.existsSync('docs/video-library/video-plan.generated.json');
const readiness = {
  generatedAt: new Date().toISOString(),
  head: safeSh('git rev-parse --short HEAD'),
  branch: safeSh('git rev-parse --abbrev-ref HEAD'),
  checks: {
    requiredFilesPresent: missingFiles.length === 0,
    requiredFilesMissing: missingFiles,
    schemaChanged,
    changedAgainstMainCount: changedAgainstMain.length,
    videoCatalogCount: catalogCount,
    videoPlanExists,
  },
  recommendations: [
    ...(schemaChanged ? ['Schema changed: include explicit migration owner and command in release summary.'] : []),
    ...(catalogCount === 0 ? ['Video catalog is empty: publish at least core onboarding videos.'] : []),
    ...(missingFiles.length ? ['Missing required runbook files: restore before release.'] : []),
  ],
};

const output = JSON.stringify(readiness, null, 2) + '\n';
fs.mkdirSync('.push-guard', { recursive: true });
fs.writeFileSync('.push-guard/ops-readiness.json', output);

const hash = crypto.createHash('sha256').update(output).digest('hex').slice(0, 12);
console.log(`Wrote .push-guard/ops-readiness.json (${hash})`);
if (readiness.recommendations.length) {
  console.log('Recommendations:');
  for (const rec of readiness.recommendations) console.log(`- ${rec}`);
}
