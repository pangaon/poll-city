/**
 * Literature drop tracking — flyer delivery records.
 *
 * From SUBJECT-MATTER-BIBLE Part 3:
 * "The literature drop mode: Shows the street in order.
 * Canvasser taps each house as they drop the flyer.
 * System records: which piece, which date, which canvasser."
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { z } from "zod";

const dropSchema = z.object({
  campaignId: z.string().min(1),
  turfId: z.string().nullish(),
  literatureName: z.string().min(1).max(200),
  addresses: z.array(z.object({
    address: z.string().min(1),
    contactId: z.string().nullish(),
  })).min(1).max(500),
});

/** GET — List literature drops for a campaign */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "canvassing:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const drops = await prisma.activityLog.findMany({
    where: { campaignId, action: "literature_drop" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    drops: drops.map((d) => ({
      id: d.id,
      volunteer: d.user?.name ?? "Unknown",
      ...((d.details as Record<string, unknown>) ?? {}),
      createdAt: d.createdAt,
    })),
  });
}

/** POST — Record a literature drop batch */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "canvassing:write");
  if (permError) return permError;

  const body = await req.json();
  const parsed = dropSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const { campaignId, turfId, literatureName, addresses } = parsed.data;

  const log = await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "literature_drop",
      entityType: "literature_drop",
      entityId: turfId ?? campaignId,
      details: {
        literatureName,
        addressCount: addresses.length,
        turfId,
        droppedAt: new Date().toISOString(),
      },
    },
  });

  return NextResponse.json({
    ok: true,
    dropId: log.id,
    count: addresses.length,
    literature: literatureName,
  }, { status: 201 });
}
