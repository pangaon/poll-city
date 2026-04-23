import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

// Returns a lightweight volunteer list for the turf-cutting canvasser combobox.
// Auth-gated — returns empty array (not 401) so the map degrades gracefully.
export async function GET(req: NextRequest) {
  const { session } = await apiAuth(req);
  if (!session) return NextResponse.json({ data: [] });

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) return NextResponse.json({ data: [] });

  const profiles = await prisma.volunteerProfile.findMany({
    where: { campaignId, deletedAt: null },
    select: {
      id: true,
      contact: { select: { firstName: true, lastName: true, phone: true } },
      user: { select: { name: true, phone: true } },
    },
    orderBy: [{ contact: { lastName: "asc" } }],
    take: 200,
  });

  const data = profiles.map(p => {
    const name = p.contact
      ? `${p.contact.firstName} ${p.contact.lastName}`.trim()
      : (p.user?.name ?? "Unknown");
    const phone = p.contact?.phone ?? p.user?.phone ?? undefined;
    return { id: p.id, name, phone };
  });

  return NextResponse.json({ data });
}
