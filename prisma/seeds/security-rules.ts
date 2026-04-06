// Seeds default security rules for Adoni's site monitoring.
// Usage: npx tsx prisma/seeds/security-rules.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RULES = [
  { name: "brute_force_login", description: "Multiple failed login attempts from same IP", threshold: 5, windowMins: 15, severity: "high", action: "block" },
  { name: "bulk_data_export", description: "Unusually large data export request", threshold: 3, windowMins: 60, severity: "medium", action: "alert" },
  { name: "permission_probe", description: "Repeated 403 errors from same user", threshold: 10, windowMins: 30, severity: "medium", action: "alert" },
  { name: "adoni_fishing", description: "Canvasser asking sensitive questions repeatedly", threshold: 3, windowMins: 60, severity: "low", action: "alert" },
  { name: "impossible_location", description: "Login from geographically impossible location", threshold: 1, windowMins: 60, severity: "critical", action: "block" },
  { name: "injection_attempt", description: "SQL, XSS, or prompt injection pattern detected", threshold: 1, windowMins: 1440, severity: "critical", action: "ban" },
  { name: "prompt_injection", description: "User attempting to override Adoni instructions", threshold: 2, windowMins: 60, severity: "high", action: "alert" },
  { name: "mass_deletion", description: "Large number of contacts deleted in short window", threshold: 50, windowMins: 10, severity: "critical", action: "alert" },
];

async function main() {
  let created = 0;
  let updated = 0;
  for (const rule of RULES) {
    const existing = await prisma.securityRule.findUnique({ where: { name: rule.name } });
    if (existing) {
      await prisma.securityRule.update({ where: { name: rule.name }, data: rule });
      updated += 1;
    } else {
      await prisma.securityRule.create({ data: rule });
      created += 1;
    }
  }
  console.log(`Security rules: created=${created} updated=${updated}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
