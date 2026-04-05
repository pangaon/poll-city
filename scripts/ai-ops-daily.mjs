import { spawnSync } from "node:child_process";

const steps = [
  ["npm", ["run", "security:gates"]],
  ["npm", ["run", "test:contracts"]],
  ["npm", ["run", "build"]],
];

for (const [cmd, args] of steps) {
  console.log(`\n==> Running: ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nAI ops daily gates passed.");
