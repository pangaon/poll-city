import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const before = await prisma.electionResult.count({ where: { electionDate: new Date("2018-10-22") } });
  console.log("2018 rows before:", before);

  const deleted = await prisma.$executeRaw`
    DELETE FROM election_results
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY election_date, jurisdiction, candidate_name
          ORDER BY created_at ASC
        ) AS rn
        FROM election_results
        WHERE election_date = '2018-10-22'
      ) sub WHERE rn > 1
    )
  `;
  console.log("Deleted:", deleted);

  const after = await prisma.electionResult.count({ where: { electionDate: new Date("2018-10-22") } });
  console.log("2018 rows after:", after);
}

main().catch(console.error).finally(() => prisma.$disconnect());
