import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { audit } from "@/lib/audit";
import {
  AssignmentType,
  AssignmentStatus,
  StopStatus,
  SupportLevel,
  SignStatus,
  Prisma,
} from "@prisma/client";
import {
  updateStopSchema,
  canvassOutcomeSchema,
  litDropOutcomeSchema,
  signInstallOutcomeSchema,
  signRemoveOutcomeSchema,
} from "@/lib/validators/field-assignments";

// Terminal stop statuses — any of these means the stop is done
const TERMINAL_STATUSES = new Set<StopStatus>([
  StopStatus.completed,
  StopStatus.skipped,
  StopStatus.exception,
  StopStatus.not_home,
  StopStatus.no_access,
]);

// Support levels from which we escalate when a sign is placed
const SIGN_ESCALATE_FROM = new Set<SupportLevel>([
  SupportLevel.unknown,
  SupportLevel.leaning_support,
  SupportLevel.undecided,
]);

// ─── PATCH /api/field-assignments/[id]/stops/[stopId] ────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; stopId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  // Fetch the stop, joining through to get assignment type + campaign scope
  const stop = await prisma.assignmentStop.findUnique({
    where: { id: params.stopId },
    include: {
      assignment: {
        select: {
          id: true,
          campaignId: true,
          assignmentType: true,
          status: true,
        },
      },
    },
  });

  if (!stop || stop.assignment.id !== params.id) {
    return NextResponse.json({ error: "Stop not found" }, { status: 404 });
  }

  const { campaignId, assignmentType, status: assignmentStatus } = stop.assignment;

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    campaignId,
    "canvassing:write",
  );
  if (forbidden) return forbidden;

  // Prevent updates on cancelled or completed assignments
  if (
    assignmentStatus === AssignmentStatus.cancelled ||
    assignmentStatus === AssignmentStatus.completed
  ) {
    return NextResponse.json(
      { error: `Cannot update stops on a ${assignmentStatus} assignment` },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateStopSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { status, outcome, exceptionType, exceptionNotes, notes } = parsed.data;

  // ── Type-specific outcome validation ───────────────────────────────────────

  if (outcome !== undefined) {
    let outcomeResult;
    switch (assignmentType) {
      case AssignmentType.canvass:
        outcomeResult = canvassOutcomeSchema.safeParse(outcome);
        break;
      case AssignmentType.lit_drop:
        outcomeResult = litDropOutcomeSchema.safeParse(outcome);
        break;
      case AssignmentType.sign_install:
        outcomeResult = signInstallOutcomeSchema.safeParse(outcome);
        break;
      case AssignmentType.sign_remove:
        outcomeResult = signRemoveOutcomeSchema.safeParse(outcome);
        break;
    }
    if (outcomeResult && !outcomeResult.success) {
      return NextResponse.json(
        { error: "Invalid outcome for assignment type", details: outcomeResult.error.flatten() },
        { status: 422 },
      );
    }
  }

  const isTerminal = TERMINAL_STATUSES.has(status);
  const now = new Date();

  // ── Update the stop ─────────────────────────────────────────────────────────

  const updatedStop = await prisma.assignmentStop.update({
    where: { id: params.stopId },
    data: {
      status,
      outcome: outcome !== undefined ? (outcome as Prisma.InputJsonValue) : undefined,
      exceptionType: exceptionType ?? undefined,
      exceptionNotes: exceptionNotes ?? undefined,
      notes: notes ?? undefined,
      completedAt: isTerminal ? now : undefined,
      completedById: isTerminal ? session!.user.id : undefined,
    },
  });

  // ── Downstream effects (non-fatal — never block the stop update) ────────────

  const contactId = stop.contactId;
  const householdId = stop.householdId;
  const signId = stop.signId;

  // 1. Contact: lastContactedAt + optional supportLevel / doNotContact (canvass)
  if (contactId && isTerminal) {
    const contactUpdate: Record<string, unknown> = { lastContactedAt: now };

    if (
      assignmentType === AssignmentType.canvass &&
      status === StopStatus.completed &&
      outcome
    ) {
      const canvassOutcome = outcome as {
        supportLevel?: SupportLevel;
        doNotContact?: boolean;
      };
      if (canvassOutcome.supportLevel) {
        contactUpdate.supportLevel = canvassOutcome.supportLevel;
      }
      if (canvassOutcome.doNotContact === true) {
        contactUpdate.doNotContact = true;
      }
    }

    prisma.contact
      .update({ where: { id: contactId }, data: contactUpdate })
      .catch(() => {});

    // 2. TurfStop: mark visited for this contact on all turfs
    prisma.turfStop
      .updateMany({
        where: { contactId },
        data: { visited: true, visitedAt: now },
      })
      .catch(() => {});
  }

  // 3. Sign: update status when a sign stop completes
  if (signId && status === StopStatus.completed) {
    if (assignmentType === AssignmentType.sign_install) {
      prisma.sign
        .update({
          where: { id: signId },
          data: { status: SignStatus.installed, installedAt: now },
        })
        .then(async (sign) => {
          // Mirror the existing sign-install contact escalation
          if (sign.contactId) {
            const contact = await prisma.contact.findUnique({
              where: { id: sign.contactId, deletedAt: null },
              select: { id: true, supportLevel: true },
            });
            if (contact) {
              const escalated = SIGN_ESCALATE_FROM.has(contact.supportLevel)
                ? SupportLevel.strong_support
                : undefined;
              await prisma.contact.update({
                where: { id: contact.id },
                data: {
                  signPlaced: true,
                  lastContactedAt: now,
                  ...(escalated ? { supportLevel: escalated } : {}),
                },
              });
            }
          }
          // Notify supporter
          import("@/lib/automation/inbound-engine")
            .then(({ notifySignInstalled }) => notifySignInstalled(signId))
            .catch(() => {});
        })
        .catch(() => {});
    } else if (assignmentType === AssignmentType.sign_remove) {
      prisma.sign
        .update({
          where: { id: signId },
          data: { status: SignStatus.removed, removedAt: now },
        })
        .catch(() => {});
    }
  }

  // 4. Household: update operationHistory for lit_drop
  if (householdId && assignmentType === AssignmentType.lit_drop && isTerminal) {
    prisma.household
      .update({
        where: { id: householdId },
        data: {
          operationHistory: {
            lit_drop: now.toISOString(),
          },
        },
      })
      .catch(() => {});
  }

  // ── Auto-complete the assignment when all stops are terminal ────────────────

  if (isTerminal) {
    const pendingCount = await prisma.assignmentStop.count({
      where: {
        assignmentId: params.id,
        status: StopStatus.pending,
      },
    });

    if (pendingCount === 0) {
      await prisma.fieldAssignment
        .update({
          where: { id: params.id },
          data: {
            status: AssignmentStatus.completed,
            completedAt: now,
          },
        })
        .catch(() => {});

      await audit(prisma, "field_assignment.auto_completed", {
        campaignId,
        userId: session!.user.id,
        entityId: params.id,
        entityType: "FieldAssignment",
        ip: req.headers.get("x-forwarded-for"),
        details: { trigger: "all_stops_terminal" },
      });
    }
  }

  // ── Audit the stop update ───────────────────────────────────────────────────

  await audit(prisma, "assignment_stop.update", {
    campaignId,
    userId: session!.user.id,
    entityId: params.stopId,
    entityType: "AssignmentStop",
    ip: req.headers.get("x-forwarded-for"),
    before: { status: stop.status },
    after: { status: updatedStop.status },
  });

  return NextResponse.json({ data: updatedStop });
}
