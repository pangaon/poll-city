/**
 * E-Day: PATCH — sign/update an assignment; DELETE — remove it
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { configureWebPush, sendPushBatch } from "@/lib/notifications/push";

const patchSchema = z.object({
  campaignId: z.string().min(1),
  candidateSigned: z.boolean().optional(),
  pollingStation: z.string().optional(),
  pollingAddress: z.string().optional(),
  notes: z.string().optional(),
});

async function requireAdminOrManager(campaignId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
  if (!membership || !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { campaignId, candidateSigned, pollingStation, pollingAddress, notes } = parsed.data;
  const forbidden = await requireAdminOrManager(campaignId, session!.user.id);
  if (forbidden) return forbidden;

  const assignment = await prisma.scrutineerAssignment.findUnique({ where: { id: params.id } });
  if (!assignment || assignment.campaignId !== campaignId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.scrutineerAssignment.update({
    where: { id: params.id },
    data: {
      ...(pollingStation !== undefined && { pollingStation }),
      ...(pollingAddress !== undefined && { pollingAddress }),
      ...(notes !== undefined && { notes }),
      ...(candidateSigned !== undefined && {
        candidateSigned,
        signedAt: candidateSigned ? new Date() : null,
      }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // If candidate just signed, notify the scrutineer
  if (candidateSigned === true && !assignment.candidateSigned) {
    try {
      configureWebPush();
      const subs = await prisma.pushSubscription.findMany({
        where: { userId: assignment.userId, campaignId },
        select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true },
      });
      if (subs.length > 0) {
        await sendPushBatch({
          subscriptions: subs,
          title: "Appointment Authorised",
          body: `Your appointment at ${updated.pollingStation} has been signed. You're clear to scan results on election night.`,
          data: { assignmentId: assignment.id, campaignId, type: "eday_signed" },
        });
      }
    } catch {
      // Non-fatal
    }
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const forbidden = await requireAdminOrManager(campaignId, session!.user.id);
  if (forbidden) return forbidden;

  const assignment = await prisma.scrutineerAssignment.findUnique({ where: { id: params.id } });
  if (!assignment || assignment.campaignId !== campaignId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.scrutineerAssignment.delete({ where: { id: params.id } });
  return NextResponse.json({ data: { removed: true } });
}
