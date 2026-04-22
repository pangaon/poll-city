import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export type ContactOverlayEntry = {
  supportLevel: string;
  skipHouse: boolean;
  visitCount: number;
};

export type ContactOverlayStats = {
  totalContacts: number;
  doorsWithData: number;
  doorsVisited: number;
  supporters: number;
};

export type ContactOverlayResponse = {
  contacts: Record<string, ContactOverlayEntry>;
  stats: ContactOverlayStats;
};

// Returns per-address contact intelligence for the active campaign.
// Key = normalised "civic street" string matching the OSM/ArcGIS address layer.
// Returns 401 silently when unauthenticated — map gracefully shows base layer only.
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error || !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 400 });

  // Optional ward filter — narrows result set for large campaigns
  const { searchParams } = new URL(req.url);
  const wardName = searchParams.get("wardName") ?? undefined;

  const contacts = await prisma.contact.findMany({
    where: {
      campaignId,
      deletedAt: null,
      streetNumber: { not: null },
      streetName: { not: null },
      ...(wardName ? { ward: { contains: wardName, mode: "insensitive" } } : {}),
    },
    select: {
      streetNumber: true,
      streetName: true,
      streetType: true,
      streetDirection: true,
      supportLevel: true,
      skipHouse: true,
      _count: {
        select: {
          interactions: { where: { type: "door_knock" } },
        },
      },
    },
  });

  const lookup: Record<string, ContactOverlayEntry> = {};

  for (const c of contacts) {
    const streetParts = [c.streetName, c.streetType, c.streetDirection].filter(Boolean).join(" ").trim();
    const key = `${c.streetNumber!} ${streetParts}`.toLowerCase();

    const existing = lookup[key];
    const visitCount = c._count.interactions;

    if (!existing) {
      lookup[key] = {
        supportLevel: c.supportLevel,
        skipHouse: c.skipHouse,
        visitCount,
      };
    } else {
      if (c.skipHouse) existing.skipHouse = true;
      existing.visitCount += visitCount;
      existing.supportLevel = dominantSupport(existing.supportLevel, c.supportLevel);
    }
  }

  const values = Object.values(lookup);
  const supporterLevels = new Set(["strong_support", "leaning_support"]);

  const stats: ContactOverlayStats = {
    totalContacts: contacts.length,
    doorsWithData: values.length,
    doorsVisited: values.filter(v => v.visitCount > 0).length,
    supporters: values.filter(v => supporterLevels.has(v.supportLevel)).length,
  };

  return NextResponse.json({ contacts: lookup, stats } satisfies ContactOverlayResponse);
}

// Most favourable support level wins (strong_support > leaning_support > undecided > ...)
const SUPPORT_PRIORITY = ["strong_support", "leaning_support", "undecided", "leaning_opposition", "strong_opposition", "unknown"];

function dominantSupport(a: string, b: string): string {
  const ai = SUPPORT_PRIORITY.indexOf(a);
  const bi = SUPPORT_PRIORITY.indexOf(b);
  return ai <= bi ? a : b;
}
