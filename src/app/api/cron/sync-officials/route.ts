import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────────────────────
// Weekly officials sync from authoritative government sources.
//
//   • Federal MPs       → Represent API: /representatives/house-of-commons/
//   • Ontario MPPs      → Represent API: /representatives/ontario-legislature/
//
// (OurCommons.ca OData would be more authoritative but requires auth + parsing
//  a 5MB XML payload — Represent aggregates the same OLA/HoC data cleanly.)
//
// Dedup key = name + level (level is derived ONLY from elected_office).
// This is the Jonathan Tsao fix: same name at different levels = different records.
// ─────────────────────────────────────────────────────────────────────────────

const REPRESENT_BASE = "https://represent.opennorth.ca";

interface RepresentPerson {
  name?: string;
  first_name?: string;
  last_name?: string;
  elected_office?: string;
  district_name?: string;
  party_name?: string;
  photo_url?: string;
  email?: string;
  url?: string;
  offices?: { tel?: string; type?: string }[];
}

interface RepresentListResponse {
  objects?: RepresentPerson[];
  meta?: { total_count?: number; next?: string | null };
}

type GovernmentLevel = "federal" | "provincial" | "municipal";

function levelFromOffice(office: string | undefined): GovernmentLevel | null {
  const o = (office ?? "").toUpperCase().trim();
  if (o === "MP") return "federal";
  if (o === "MPP" || o === "MLA" || o === "MNA" || o === "MHA") return "provincial";
  if (o === "MAYOR" || o.includes("COUNCILLOR") || o.includes("ALDERMAN") || o.includes("TRUSTEE")) {
    return "municipal";
  }
  return null;
}

function firstPhone(rep: RepresentPerson): string | null {
  for (const o of rep.offices ?? []) {
    if (o?.tel) return o.tel;
  }
  return null;
}

async function fetchAllPages(setSlug: string): Promise<RepresentPerson[]> {
  const collected: RepresentPerson[] = [];
  let url: string | null = `${REPRESENT_BASE}/representatives/${setSlug}/?limit=200&format=json`;
  let safety = 10;
  while (url && safety-- > 0) {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Represent ${setSlug} ${res.status}`);
    const data = (await res.json()) as RepresentListResponse;
    collected.push(...(data.objects ?? []));
    const next = data.meta?.next ?? null;
    url = next ? (next.startsWith("http") ? next : `${REPRESENT_BASE}${next}`) : null;
  }
  return collected;
}

async function upsertRep(rep: RepresentPerson): Promise<"created" | "updated" | "skipped"> {
  const level = levelFromOffice(rep.elected_office);
  if (!level || !rep.name) return "skipped";

  const existing = await prisma.official.findFirst({
    where: {
      level: level as never,
      name: { equals: rep.name, mode: "insensitive" },
    },
    select: { id: true },
  });

  const data = {
    name: rep.name,
    title: (rep.elected_office ?? "Representative").trim(),
    level: level as never,
    district: rep.district_name ?? "",
    partyName: rep.party_name || null,
    party: rep.party_name || null,
    photoUrl: rep.photo_url || null,
    email: rep.email || null,
    phone: firstPhone(rep),
    website: rep.url || null,
    firstName: rep.first_name || null,
    lastName: rep.last_name || null,
    externalSource: "represent_opennorth",
    isActive: true,
  };

  if (existing) {
    await prisma.official.update({ where: { id: existing.id }, data });
    return "updated";
  } else {
    await prisma.official.create({
      data: { ...data, isClaimed: false },
    });
    return "created";
  }
}

export async function GET(req: NextRequest) {
  // Auth — require CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stats = {
    federal: { created: 0, updated: 0, skipped: 0, errors: 0 },
    provincial: { created: 0, updated: 0, skipped: 0, errors: 0 },
  };

  try {
    const federal = await fetchAllPages("house-of-commons");
    for (const rep of federal) {
      try {
        const result = await upsertRep(rep);
        stats.federal[result] += 1;
      } catch {
        stats.federal.errors += 1;
      }
    }

    const ontario = await fetchAllPages("ontario-legislature");
    for (const rep of ontario) {
      try {
        const result = await upsertRep(rep);
        stats.provincial[result] += 1;
      } catch {
        stats.provincial.errors += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      syncedAt: new Date().toISOString(),
      stats,
    });
  } catch (error) {
    console.error("[cron/sync-officials] failed:", error);
    return NextResponse.json(
      { ok: false, error: String(error), stats },
      { status: 500 },
    );
  }
}
