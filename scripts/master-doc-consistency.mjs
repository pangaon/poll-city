import fs from "fs";
import path from "path";

const root = process.cwd();

const requiredDocs = [
  "PRODUCT_BRIEF.md",
  "RESEARCH_BRIEF.md",
  "SECURITY_BLUEPRINT.md",
  "FEATURE_MATRIX.md",
  "STATUS_REPORT.md",
  "docs/architecture/ABUSE_AND_RISK_CONTROLS.md",
  "docs/architecture/AUDIT_AND_LOGGING_SPEC.md",
  "docs/architecture/API_AND_INTEGRATION_CONTRACTS.md",
];

const consistencyChecks = [
  {
    file: "FEATURE_MATRIX.md",
    mustContain: [
      "PRODUCT_BRIEF.md",
      "RESEARCH_BRIEF.md",
      "SECURITY_BLUEPRINT.md",
      "docs/architecture/ABUSE_AND_RISK_CONTROLS.md",
      "docs/architecture/AUDIT_AND_LOGGING_SPEC.md",
      "docs/architecture/API_AND_INTEGRATION_CONTRACTS.md",
    ],
  },
  {
    file: "SECURITY_BLUEPRINT.md",
    mustContain: ["PRODUCT_BRIEF.md", "RESEARCH_BRIEF.md"],
  },
  {
    file: "RESEARCH_BRIEF.md",
    mustContain: ["PRODUCT_BRIEF.md", "SECURITY_BLUEPRINT.md"],
  },
];

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

const errors = [];

for (const relPath of requiredDocs) {
  if (!exists(relPath)) {
    errors.push(`Missing required master document: ${relPath}`);
  }
}

for (const check of consistencyChecks) {
  if (!exists(check.file)) {
    errors.push(`Consistency check target file missing: ${check.file}`);
    continue;
  }

  const content = read(check.file);
  for (const token of check.mustContain) {
    if (!content.includes(token)) {
      errors.push(`${check.file} is missing reference: ${token}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Master doc consistency check failed:\n");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log("Master doc consistency check passed.");