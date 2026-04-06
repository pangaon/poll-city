/**
 * Canvassing opposition intelligence — block-by-block sign tracking.
 *
 * From SUBJECT-MATTER-BIBLE Part 3:
 * "As the canvasser walks down the street they can note what they see
 * on every house — even ones they do not knock. This builds a
 * block-by-block intelligence map."
 *
 * POST — Record what the canvasser sees (our sign, opponent sign, no sign)
 * GET — Get the intelligence map for a campaign
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { z } from "zod";

const intelSchema = z.object({
  campaignId: z.string().min(1),
  address: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  signType: z.enum(["our_sign", "opponent_sign", "multiple_opponent", "no_sign", "our_and_opponent"]),
  notes: z.string().max(500).nullish(),
});

/** GET — Get opposition intelligence data for a campaign */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "canvassing:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const intel = await prisma.activityLog.findMany({
    where: { campaignId, action: "sign_intelligence" },
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: { id: true, details: true, createdAt: true },
  });

  type IntelEntry = {
    id: string;
    createdAt: Date;
    signType?: "our_sign" | "opponent_sign" | "multiple_opponent" | "no_sign" | "our_and_opponent";
    address?: string;
    lat?: number;
    lng?: number;
    notes?: string;
  };

  const entries: IntelEntry[] = intel.map((i) => {
    const details = i.details && typeof i.details === "object" ? (i.details as Record<string, unknown>) : {};
    const signType = details.signType;

    return {
      id: i.id,
      createdAt: i.createdAt,
      signType:
        signType === "our_sign" ||
        signType === "opponent_sign" ||
        signType === "multiple_opponent" ||
        signType === "no_sign" ||
        signType === "our_and_opponent"
          ? signType
          : undefined,
      address: typeof details.address === "string" ? details.address : undefined,
      lat: typeof details.lat === "number" ? details.lat : undefined,
      lng: typeof details.lng === "number" ? details.lng : undefined,
      notes: typeof details.notes === "string" ? details.notes : undefined,
    };
  });

  const ourSigns = entries.filter((e) => e.signType === "our_sign" || e.signType === "our_and_opponent").length;
  const opponentSigns = entries.filter((e) => e.signType === "opponent_sign" || e.signType === "multiple_opponent" || e.signType === "our_and_opponent").length;
  const noSigns = entries.filter((e) => e.signType === "no_sign").length;

  return NextResponse.json({
    total: entries.length,
    ourSigns,
    opponentSigns,
    noSigns,
    entries,
  });
}

/** POST — Record sign intelligence from the field (3-second operation) */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "canvassing:write");
  if (permError) return permError;

  const body = await req.json();
  const parsed = intelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const { campaignId, address, lat, lng, signType, notes } = parsed.data;

  const log = await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "sign_intelligence",
      entityType: "sign_intel",
      entityId: campaignId,
      details: { address, lat, lng, signType, notes } as object,
    },
  });

  return NextResponse.json({ ok: true, id: log.id }, { status: 201 });
}
