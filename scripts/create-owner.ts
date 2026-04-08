/**
 * Poll City — Create Personal Owner Account
 *
 * Run this ONCE on your production database to create George's
 * personal SUPER_ADMIN account with his real email and chosen password.
 *
 * This file is NOT seeded automatically — run it manually:
 *   npx tsx scripts/create-owner.ts
 *
 * Set env vars first:
 *   DATABASE_URL=<your Railway connection string>
 *   OWNER_EMAIL=george@yourdomain.com
 *   OWNER_PASSWORD=<choose a strong password>
 *   OWNER_NAME="George Hatzis"          # optional, defaults below
 */

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email    = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  const name     = process.env.OWNER_NAME ?? "George Hatzis";

  if (!email || !password) {
    console.error("❌  Set OWNER_EMAIL and OWNER_PASSWORD before running.");
    console.error("    Example:");
    console.error("    OWNER_EMAIL=george@yourdomain.com OWNER_PASSWORD=MyPassword123! npx tsx scripts/create-owner.ts");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`❌  User ${email} already exists (id: ${existing.id}). Aborting.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: Role.SUPER_ADMIN,
      emailVerified: true,
    },
  });

  console.log(`\n✅  Owner account created`);
  console.log(`    Name:  ${user.name}`);
  console.log(`    Email: ${user.email}`);
  console.log(`    Role:  ${user.role}`);
  console.log(`    ID:    ${user.id}`);
  console.log(`\n    Log in at: https://app.poll.city\n`);
}

main()
  .catch((e) => { console.error("❌ Failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
