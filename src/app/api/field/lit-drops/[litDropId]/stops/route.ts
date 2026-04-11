import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// ── GET /api/field/lit-drops/[litDropId]/stops?campaignId=X ─────────────────
// Returns FieldAttempts for this lit drop shift

export async function GET(
  req: NextRequest,
  { params }: { params: { litDropId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const attempts = await prisma.fieldAttempt.findMany({
    where: {
      campaignId,
      shiftId: params.litDropId,
      deletedAt: null,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, address1: true } },
      household: { select: { id: true, address1: true } },
      attemptedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: attempts });
}

// ── POST /api/field/lit-drops/[litDropId]/stops ──────────────────────────────
// Records a delivery outcome for one stop on this lit drop run

export async function POST(
  req: NextRequest,
  { params }: { params: { litDropId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    contactId?: string;
    householdId?: string;
    fieldTargetId?: string;
    // "not_home" = lit left at door, "inaccessible" = no access, "contacted" = spoke to someone
    outcome?: "not_home" | "inaccessible" | "contacted" | "bad_data";
    outcomeNotes?: string;
    latitude?: number;
    longitude?: number;
    unitsDelivered?: number;
  } | null;

  if (!body?.campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  // Verify the shift exists and belongs to this campaign
  const shift = await prisma.fieldShift.findFirst({
    where: { id: params.litDropId, campaignId: body.campaignId, shiftType: "literature", deletedAt: null },
  });
  if (!shift) {
    return NextResponse.json({ error: "Lit drop run not found" }, { status: 404 });
  }

  const validOutcomes = ["not_home", "inaccessible", "contacted", "bad_data"] as const;
  const outcome = validOutcomes.includes(body.outcome as typeof validOutcomes[number])
    ? body.outcome!
    : "not_home";

  const attempt = await prisma.$transaction(async (tx) => {
    const created = await tx.fieldAttempt.create({
      data: {
        campaignId: body.campaignId!,
        shiftId: params.litDropId,
        fieldProgramId: shift.fieldProgramId,
        contactId: body.contactId ?? null,
        householdId: body.householdId ?? null,
        fieldTargetId: body.fieldTargetId ?? null,
        attemptedById: session!.user.id,
        outcome,
        outcomeNotes: body.outcomeNotes?.trim() ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        source: "canvass",
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        household: { select: { id: true, address1: true } },
        attemptedBy: { select: { id: true, name: true } },
      },
    });

    // If inaccessible, create a lit_missed follow-up
    if (outcome === "inaccessible" && (body.contactId || body.householdId)) {
      await tx.followUpAction.create({
        data: {
          campaignId: body.campaignId!,
          fieldAttemptId: created.id,
          contactId: body.contactId ?? null,
          householdId: body.householdId ?? null,
          fieldTargetId: body.fieldTargetId ?? null,
          followUpType: "lit_missed",
          status: "pending",
          priority: "normal",
        },
      });
    }

    // Update contact.lastContactedAt if we spoke to someone
    if (outcome === "contacted" && body.contactId) {
      await tx.contact.update({
        where: { id: body.contactId },
        data: { lastContactedAt: new Date() },
      });
    }

    // Mark FieldTarget as complete if provided
    if (body.fieldTargetId) {
      await tx.fieldTarget.update({
        where: { id: body.fieldTargetId },
        data: {
          status: outcome === "inaccessible" ? "inaccessible" : "complete",
          resolvedAt: new Date(),
        },
      });
    }

    return created;
  });

  return NextResponse.json({ data: attempt }, { status: 201 });
}
