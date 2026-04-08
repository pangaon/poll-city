import prisma from "@/lib/db/prisma";

interface SourceDefinition {
  name: string;
  type: string;
  url: string;
  geography: string;
  topics: string[];
}

const INITIAL_SOURCES: SourceDefinition[] = [
  {
    name: "Toronto City Council",
    type: "rss",
    url: "https://secure.toronto.ca/cc_rss/CCMainPageRSS.jspx",
    geography: "municipal:toronto",
    topics: ["zoning", "budget", "transit", "housing"],
  },
  {
    name: "City of Toronto News",
    type: "rss",
    url: "https://www.toronto.ca/news/rss.php",
    geography: "municipal:toronto",
    topics: ["housing", "transit", "budget", "safety"],
  },
  {
    name: "Government of Canada News",
    type: "rss",
    url: "https://www.canada.ca/en/news.rss.xml",
    geography: "national",
    topics: ["budget", "healthcare", "environment", "labour"],
  },
  {
    name: "OpenNorth Canadian Boundaries",
    type: "open_north",
    url: "https://represent.opennorth.ca/candidates/?limit=20",
    geography: "national",
    topics: [],
  },
  {
    name: "Ontario Legislature",
    type: "rss",
    url: "https://www.ola.org/en/rss/news.xml",
    geography: "provincial:ON",
    topics: ["budget", "housing", "healthcare", "education"],
  },
];

export interface SeedResult {
  created: number;
  updated: number;
  total: number;
}

export async function seedAutonomousSources(): Promise<SeedResult> {
  let created = 0;
  let updated = 0;

  for (const source of INITIAL_SOURCES) {
    const existing = await prisma.autonomousSource.findFirst({
      where: { name: source.name, type: source.type },
      select: { id: true },
    });

    if (existing) {
      await prisma.autonomousSource.update({
        where: { id: existing.id },
        data: {
          url: source.url,
          geography: source.geography,
          topics: source.topics,
          isActive: true,
        },
      });
      updated++;
    } else {
      await prisma.autonomousSource.create({
        data: {
          name: source.name,
          type: source.type,
          url: source.url,
          geography: source.geography,
          topics: source.topics,
          isActive: true,
        },
      });
      created++;
    }
  }

  return { created, updated, total: INITIAL_SOURCES.length };
}
