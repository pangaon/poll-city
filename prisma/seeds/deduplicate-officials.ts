import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FIELD_WEIGHTS: Array<{ key: keyof OfficialScoreInput; weight: number }> = [
  { key: "photoUrl", weight: 64 },
  { key: "email", weight: 32 },
  { key: "website", weight: 16 },
  { key: "twitter", weight: 8 },
  { key: "facebook", weight: 4 },
  { key: "instagram", weight: 2 },
];

type OfficialScoreInput = {
  photoUrl: string | null;
  email: string | null;
  website: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
};

type OfficialRow = OfficialScoreInput & {
  id: string;
  name: string;
  level: string;
  district: string;
  createdAt: Date;
  updatedAt: Date;
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function scoreOfficial(official: OfficialScoreInput): number {
  return FIELD_WEIGHTS.reduce((sum, field) => {
    return sum + (official[field.key] ? field.weight : 0);
  }, 0);
}

function pickWinner(group: OfficialRow[]): OfficialRow {
  return [...group].sort((a, b) => {
    const scoreDiff = scoreOfficial(b) - scoreOfficial(a);
    if (scoreDiff !== 0) return scoreDiff;

    const updatedDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
    if (updatedDiff !== 0) return updatedDiff;

    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}

function collectLosers(groups: Map<string, OfficialRow[]>): {
  losers: string[];
  duplicateGroups: number;
} {
  const losers: string[] = [];
  let duplicateGroups = 0;

  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    duplicateGroups += 1;

    const winner = pickWinner(group);
    for (const official of group) {
      if (official.id !== winner.id) {
        losers.push(official.id);
      }
    }
  }

  return { losers, duplicateGroups };
}

async function deleteDuplicateOfficials(idsToDelete: string[]): Promise<number> {
  if (idsToDelete.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    // Hint for future hardening: enforce a DB-level unique index on (name, level, district)
    // when data quality permits. For now we enforce uniqueness in seed/import code paths.
    await tx.campaign.updateMany({
      where: { officialId: { in: idsToDelete } },
      data: { officialId: null },
    });

    await tx.poll.updateMany({
      where: { officialId: { in: idsToDelete } },
      data: { officialId: null },
    });

    await tx.supportSignal.deleteMany({
      where: { officialId: { in: idsToDelete } },
    });

    await tx.official.deleteMany({ where: { id: { in: idsToDelete } } });
  });

  return idsToDelete.length;
}

async function main() {
  const allOfficials = await prisma.official.findMany({
    select: {
      id: true,
      name: true,
      level: true,
      district: true,
      photoUrl: true,
      email: true,
      website: true,
      twitter: true,
      facebook: true,
      instagram: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const byName = new Map<string, OfficialRow[]>();
  for (const official of allOfficials) {
    const key = normalize(official.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)?.push({ ...official, level: String(official.level), district: official.district ?? "" });
  }

  const byNameResult = collectLosers(byName);
  const firstPassDeleteIds = Array.from(new Set(byNameResult.losers));
  const deletedByName = await deleteDuplicateOfficials(firstPassDeleteIds);

  const remainingAfterFirstPass = await prisma.official.findMany({
    select: {
      id: true,
      name: true,
      level: true,
      district: true,
      photoUrl: true,
      email: true,
      website: true,
      twitter: true,
      facebook: true,
      instagram: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const byNameDistrict = new Map<string, OfficialRow[]>();
  for (const official of remainingAfterFirstPass) {
    const key = `${normalize(official.name)}|${normalize(official.district ?? "")}`;
    if (!byNameDistrict.has(key)) byNameDistrict.set(key, []);
    byNameDistrict
      .get(key)
      ?.push({ ...official, level: String(official.level), district: official.district ?? "" });
  }

  const byNameDistrictResult = collectLosers(byNameDistrict);
  const secondPassDeleteIds = Array.from(new Set(byNameDistrictResult.losers));
  const deletedByNameDistrict = await deleteDuplicateOfficials(secondPassDeleteIds);

  const officialsRemaining = await prisma.official.count();
  const duplicatesFound = byNameResult.losers.length + byNameDistrictResult.losers.length;
  const recordsDeleted = deletedByName + deletedByNameDistrict;

  console.log(`X duplicates found: ${duplicatesFound}`);
  console.log(`X records deleted: ${recordsDeleted}`);
  console.log(`X officials remaining: ${officialsRemaining}`);
}

main()
  .catch((error) => {
    console.error("Official deduplication failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
