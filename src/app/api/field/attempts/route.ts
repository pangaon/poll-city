import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { FieldAttemptOutcome, SupportLevel, FollowUpActionType } from "@prisma/client";

// ── GET /api/field/attempts?campaignId=X ────────────────────────────────────

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const shiftId = req.nextUrl.searchParams.get("shiftId");
  const routeId = req.nextUrl.searchParams.get("routeId");
  const programId = req.nextUrl.searchParams.get("programId");
  const contactId = req.nextUrl.searchParams.get("contactId");
  const outcome = req.nextUrl.searchParams.get("outcome") as FieldAttemptOutcome | null;

  const validOutcomes: FieldAttemptOutcome[] = [
    "contacted", "no_answer", "not_home", "moved", "refused", "hostile",
    "supporter", "undecided", "opposition", "volunteer_interest", "donor_interest",
    "sign_requested", "follow_up", "bad_data", "inaccessible", "do_not_return",
  ];

  const attempts = await prisma.fieldAttempt.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(shiftId ? { shiftId } : {}),
      ...(routeId ? { routeId } : {}),
      ...(programId ? { fieldProgramId: programId } : {}),
      ...(contactId ? { contactId } : {}),
      ...(outcome && validOutcomes.includes(outcome) ? { outcome } : {}),
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, address1: true } },
      household: { select: { id: true, address1: true } },
      attemptedBy: { select: { id: true, name: true } },
      fieldTarget: { select: { id: true, targetType: true, status: true } },
    },
    orderBy: { attemptedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ data: attempts });
}

// Outcome → SupportLevel mapping (canvass outcomes that imply a support level)
const OUTCOME_TO_SUPPORT: Partial<Record<FieldAttemptOutcome, SupportLevel>> = {
  supporter: "strong_support",
  undecided: "undecided",
  opposition: "strong_opposition",
  volunteer_interest: "leaning_support",
  donor_interest: "leaning_support",
};

// Outcomes that require a follow-up action
const OUTCOME_TO_FOLLOWUP: Partial<Record<FieldAttemptOutcome, FollowUpActionType>> = {
  sign_requested: "sign_ops",
  volunteer_interest: "volunteer_referral",
  donor_interest: "donor_referral",
  follow_up: "revisit",
  moved: "crm_cleanup",
  bad_data: "bad_data",
  inaccessible: "building_retry",
};

// ── POST /api/field/attempts ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    contactId?: string;
    householdId?: string;
    signId?: string;
    fieldProgramId?: string;
    routeId?: string;
    shiftId?: string;
    fieldTargetId?: string;
    outcome?: FieldAttemptOutcome;
    outcomeNotes?: string;
    supportLevelCaptured?: SupportLevel;
    latitude?: number;
    longitude?: number;
    isProxy?: boolean;
    proofPhotoUrl?: string;
  } | null;

  if (!body?.campaignId || !body?.outcome) {
    return NextResponse.json({ error: "campaignId and outcome are required" }, { status: 400 });
  }

  const validOutcomes: FieldAttemptOutcome[] = [
    "contacted", "no_answer", "not_home", "moved", "refused", "hostile",
    "supporter", "undecided", "opposition", "volunteer_interest", "donor_interest",
    "sign_requested", "follow_up", "bad_data", "inaccessible", "do_not_return",
  ];

  if (!validOutcomes.includes(body.outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  // Determine support level: explicit capture > outcome mapping
  const supportLevel = body.supportLevelCaptured ?? OUTCOME_TO_SUPPORT[body.outcome] ?? null;

  // Create the attempt + run downstream effects atomically
  const [attempt] = await prisma.$transaction(async (tx) => {
    // 1. Create FieldAttempt
    const attempt = await tx.fieldAttempt.create({
      data: {
        campaignId: body.campaignId!,
        contactId: body.contactId ?? null,
        householdId: body.householdId ?? null,
        signId: body.signId ?? null,
        fieldProgramId: body.fieldProgramId ?? null,
        routeId: body.routeId ?? null,
        shiftId: body.shiftId ?? null,
        fieldTargetId: body.fieldTargetId ?? null,
        attemptedById: session!.user.id,
        outcome: body.outcome!,
        outcomeNotes: body.outcomeNotes?.trim() ?? null,
        supportLevelCaptured: supportLevel as SupportLevel | null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        isProxy: body.isProxy ?? false,
        proofPhotoUrl: body.proofPhotoUrl ?? null,
        source: "canvass",
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        attemptedBy: { select: { id: true, name: true } },
      },
    });

    // 2. Update contact if linked
    if (body.contactId && supportLevel) {
      await tx.contact.updateMany({
        where: { id: body.contactId, campaignId: body.campaignId! },
        data: {
          supportLevel: supportLevel as SupportLevel,
          lastContactedAt: new Date(),
        },
      });
    } else if (body.contactId) {
      await tx.contact.updateMany({
        where: { id: body.contactId, campaignId: body.campaignId! },
        data: { lastContactedAt: new Date() },
      });
    }

    // 3. Mark do-not-return on contact
    if (body.contactId && body.outcome === "do_not_return") {
      await tx.contact.updateMany({
        where: { id: body.contactId, campaignId: body.campaignId! },
        data: { doNotContact: true },
      });
    }

    // 4. Mark TurfStop visited if contact-linked
    if (body.contactId) {
      await tx.turfStop.updateMany({
        where: { contactId: body.contactId },
        data: { visited: true },
      });
    }

    // 5. Update FieldTarget status
    if (body.fieldTargetId) {
      const targetStatus = ["no_answer", "not_home", "follow_up", "inaccessible"].includes(body.outcome!)
        ? "revisit"
        : ["contacted", "supporter", "undecided", "opposition", "volunteer_interest", "donor_interest", "sign_requested", "refused", "hostile", "moved", "bad_data", "do_not_return"].includes(body.outcome!)
        ? "contacted"
        : "in_progress";

      await tx.fieldTarget.updateMany({
        where: { id: body.fieldTargetId, campaignId: body.campaignId! },
        data: {
          status: targetStatus as "revisit" | "contacted" | "in_progress",
          resolvedAt: ["contacted", "supporter", "undecided", "opposition", "refused", "hostile"].includes(body.outcome!)
            ? new Date()
            : null,
        },
      });
    }

    // 6. Create FollowUpAction for outcomes that require it
    const followUpType = OUTCOME_TO_FOLLOWUP[body.outcome!];
    if (followUpType) {
      await tx.followUpAction.create({
        data: {
          campaignId: body.campaignId!,
          fieldAttemptId: attempt.id,
          contactId: body.contactId ?? null,
          householdId: body.householdId ?? null,
          fieldTargetId: body.fieldTargetId ?? null,
          followUpType,
          status: "pending",
          priority: body.outcome === "sign_requested" ? "high" : "normal",
        },
      });
    }

    // 7. Log to ActivityLog if contact-linked
    if (body.contactId) {
      await tx.activityLog.create({
        data: {
          campaignId: body.campaignId!,
          userId: session!.user.id,
          action: "canvass_attempt",
          entityType: "Contact",
          entityId: body.contactId,
          details: { outcome: body.outcome, supportLevel },
        },
      });
    }

    return [attempt];
  });

  return NextResponse.json({ data: attempt }, { status: 201 });
}
