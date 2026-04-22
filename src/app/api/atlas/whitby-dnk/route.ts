import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

// Returns addresses flagged skipHouse=true for the active campaign.
// Campaign app only — never called from the public /whitby map.
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error || !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const wardName = searchParams.get("wardName") ?? undefined;

  const contacts = await prisma.contact.findMany({
    where: {
      campaignId,
      skipHouse: true,
      deletedAt: null,
      ...(wardName ? { ward: wardName } : {}),
    },
    select: {
      streetNumber: true,
      streetName: true,
      streetType: true,
      streetDirection: true,
      ward: true,
    },
  });

  const dnkAddresses = contacts
    .filter((c) => c.streetNumber && c.streetName)
    .map((c) => {
      const streetFull = [c.streetName, c.streetType, c.streetDirection]
        .filter(Boolean)
        .join(" ")
        .trim();
      return { civic: c.streetNumber!, street: streetFull, ward: c.ward ?? null };
    });

  return NextResponse.json({ dnkAddresses, count: dnkAddresses.length });
}
