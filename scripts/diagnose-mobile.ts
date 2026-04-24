import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const email = "pangaon@gmail.com";

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, isActive: true, sessionVersion: true },
  });

  console.log("\n=== USER ===");
  console.log(user ?? "NOT FOUND");

  const campaigns = await prisma.campaign.findMany({
    select: { id: true, name: true, isActive: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log(`\n=== CAMPAIGNS (${campaigns.length} total) ===`);
  campaigns.forEach(c => console.log(` ${c.isActive ? "✓" : "✗"} ${c.name} (${c.id})`));

  if (user) {
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      select: { campaignId: true, role: true },
    });
    console.log(`\n=== MEMBERSHIPS (${memberships.length}) ===`);
    memberships.forEach(m => console.log(` ${m.role} → ${m.campaignId}`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
