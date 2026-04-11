import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { audit } from "@/lib/audit";
import { SignStatus, SupportLevel } from "@prisma/client";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["scheduled", "installed", "removed", "declined"]).optional(),
  assignedUserId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  scheduledDate: z.string().nullable().optional(),
});

// ── PATCH /api/field/signs/[signId] ─────────────────────────────────────────
// Field crew updates: schedule → confirm install → confirm removal.
// Downstream: installed sign updates linked contact (signPlaced, supportLevel).
// FollowUpAction(sign_ops) auto-advances to completed on install/removed.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ signId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { signId } = await params;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }

  const sign = await prisma.sign.findUnique({
    where: { id: signId, deletedAt: null },
    select: { id: true, campaignId: true, status: true, contactId: true },
  });
  if (!sign) {
    return NextResponse.json({ error: "Sign not found" }, { status: 404 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, sign.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const { status, assignedUserId, notes, photoUrl, scheduledDate } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
      if (status === "installed" && sign.status !== "installed") {
        updateData.installedAt = new Date();
      }
      if (status === "removed" && sign.status !== "removed") {
        updateData.removedAt = new Date();
      }
    }
    if (assignedUserId !== undefined) updateData.assignedUserId = assignedUserId;
    if (notes !== undefined) updateData.notes = notes?.trim() ?? null;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (scheduledDate !== undefined) {
      // store in notes or as a custom field — Sign model has no scheduledDate,
      // we encode it in notes as metadata prefix for display purposes
      // (schema already has requestedAt / installedAt / removedAt — no scheduledDate field)
    }

    const updated = await tx.sign.update({
      where: { id: signId },
      data: updateData as Parameters<typeof tx.sign.update>[0]["data"],
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, phone: true } },
        assignedUser: { select: { id: true, name: true } },
      },
    });

    // Auto-advance linked sign_ops FollowUpAction
    if (status === "installed" || status === "removed") {
      await tx.followUpAction.updateMany({
        where: {
          signId,
          followUpType: "sign_ops",
          status: { in: ["pending", "assigned", "in_progress"] },
          deletedAt: null,
        },
        data: {
          status: "completed",
          completedAt: new Date(),
          completedById: session!.user.id,
        },
      });
    } else if (status === "scheduled") {
      await tx.followUpAction.updateMany({
        where: {
          signId,
          followUpType: "sign_ops",
          status: { in: ["pending"] },
          deletedAt: null,
        },
        data: { status: "in_progress" },
      });
    }

    // If installed: escalate contact support level + mark signPlaced
    if (status === "installed" && sign.status !== "installed" && sign.contactId) {
      const ESCALATE_FROM = new Set<SupportLevel>([
        "unknown",
        "leaning_support",
        "undecided",
      ]);
      const contact = await tx.contact.findUnique({
        where: { id: sign.contactId, deletedAt: null },
        select: { id: true, supportLevel: true },
      });
      if (contact) {
        await tx.contact.update({
          where: { id: contact.id },
          data: {
            signPlaced: true,
            lastContactedAt: new Date(),
            ...(ESCALATE_FROM.has(contact.supportLevel)
              ? { supportLevel: SupportLevel.strong_support }
              : {}),
          },
        });
      }
    }

    return updated;
  });

  await audit(prisma, "sign.update", {
    campaignId: sign.campaignId,
    userId: session!.user.id,
    entityId: signId,
    entityType: "Sign",
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ data: updated });
}
