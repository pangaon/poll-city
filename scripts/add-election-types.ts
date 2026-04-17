/**
 * One-time: add nomination + leadership to the ElectionType enum in PostgreSQL.
 * Prisma migrate dev requires a direct connection Railway's proxy doesn't support.
 * This script uses the Prisma client (which works via the proxy) instead.
 *
 * Safe to run multiple times — PostgreSQL ADD VALUE IF NOT EXISTS prevents duplicates.
 */

import prisma from "../src/lib/db/prisma";

async function main() {
  await prisma.$executeRaw`ALTER TYPE "ElectionType" ADD VALUE IF NOT EXISTS 'nomination'`;
  await prisma.$executeRaw`ALTER TYPE "ElectionType" ADD VALUE IF NOT EXISTS 'leadership'`;
  console.log("✓ ElectionType enum now includes nomination and leadership.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
