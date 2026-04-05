import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const RULES = [
  {
    id: "no-dev-secret",
    label: "No hardcoded dev secrets",
    includeDir: "src",
    fileExtensions: [".ts", ".tsx"],
    pattern: /dev-secret/gi,
    severity: "error",
  },
  {
    id: "no-large-take",
    label: "Avoid take: 10000 in API routes",
    includeDir: "src/app/api",
    fileExtensions: [".ts", ".tsx"],
    pattern: /take\s*:\s*10000/gi,
    severity: "warn",
  },
  {
    id: "health-secret-header",
    label: "Health endpoint should gate internal details with x-health-secret",
    includeDir: "src/app/api/health",
    fileExtensions: [".ts", ".tsx"],
    pattern: /x-health-secret/gi,
    severity: "warn",
    mode: "required-presence",
  },
];

function walk(dirPath, exts, files = []) {
  if (!fs.existsSync(dirPath)) return files;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, exts, files);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (exts.includes(ext)) files.push(fullPath);
  }
  return files;
}

function toRelative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

let errorCount = 0;
let warnCount = 0;

for (const rule of RULES) {
  const targetDir = path.join(repoRoot, rule.includeDir);
  const files = walk(targetDir, rule.fileExtensions);

  if (rule.mode === "required-presence") {
    let found = false;
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      if (rule.pattern.test(text)) {
        found = true;
        break;
      }
    }

    if (!found) {
      if (rule.severity === "error") {
        errorCount += 1;
        console.error(`ERROR [${rule.id}] ${rule.label}`);
      } else {
        warnCount += 1;
        console.warn(`WARN  [${rule.id}] ${rule.label}`);
      }
    }

    continue;
  }

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const matches = text.match(rule.pattern);
    if (!matches || matches.length === 0) continue;

    const rel = toRelative(file);
    if (rule.severity === "error") {
      errorCount += matches.length;
      console.error(`ERROR [${rule.id}] ${rel} (${matches.length} match${matches.length > 1 ? "es" : ""})`);
    } else {
      warnCount += matches.length;
      console.warn(`WARN  [${rule.id}] ${rel} (${matches.length} match${matches.length > 1 ? "es" : ""})`);
    }
  }
}

console.log(`Security gates complete. errors=${errorCount}, warnings=${warnCount}`);

if (errorCount > 0) {
  process.exit(1);
}
