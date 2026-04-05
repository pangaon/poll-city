import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const contractsFile = path.join(repoRoot, "packages/api-contracts/src/index.ts");

if (!fs.existsSync(contractsFile)) {
  console.error("Contract test failed: packages/api-contracts/src/index.ts is missing");
  process.exit(1);
}

const source = fs.readFileSync(contractsFile, "utf8");
const requiredTokens = [
  "OfficialPublicDTO",
  "PollPublicDTO",
  "BridgeSignalDTO",
  "ApiResponse",
  "ApiListResponse",
];

const missing = requiredTokens.filter((token) => !source.includes(token));
if (missing.length > 0) {
  console.error(`Contract test failed: missing required contract exports/usages: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Contract tests passed.");
