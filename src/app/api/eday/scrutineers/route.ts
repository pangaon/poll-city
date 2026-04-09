/**
 * E-Day Scrutineer Assignments
 *
 * GET  — list all assignments for a campaign (admin/manager only)
 * POST — create or update an assignment
 *
 * A scrutineer is a campaign volunteer appointed by the candidate as an
 * official poll watcher. The candidate must sign each appointment.
 * Once signed, the scrutineer's polling station info auto-populates
 * on their device so OCR result scans require no manual station entry.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { configureWebPush, sendPushBatch } from "@/lib/notifications/push";

const createSchema = z.object({
  campaignId: z.string().min(1),
  userId: z.string().min(1),
  pollingStation: z.string().min(1),
  pollingAddress: z.string().optional(),
  municipality: z.string().min(1),
  ward: z.string().optional(),
  province: z.string().default("ON"),
  electionDate: z.string().datetime(),
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

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const forbidden = await requireAdminOrManager(campaignId, session!.user.id);
  if (forbidden) return forbidden;

  const assignments = await prisma.scrutineerAssignment.findMany({
    where: { campaignId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      assignedByUser: { select: { id: true, name: true } },
    },
    orderBy: [{ electionDate: "asc" }, { pollingStation: "asc" }],
  });

  return NextResponse.json({ data: assignments });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { campaignId, userId, pollingStation, pollingAddress, municipality, ward, province, electionDate, notes } = parsed.data;

  const forbidden = await requireAdminOrManager(campaignId, session!.user.id);
  if (forbidden) return forbidden;

  // Verify the target user is a member of this campaign
  const targetMembership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
  if (!targetMembership) {
    return NextResponse.json({ error: "User is not a member of this campaign" }, { status: 404 });
  }

  const electionDateObj = new Date(electionDate);

  const assignment = await prisma.scrutineerAssignment.upsert({
    where: {
      campaignId_userId_electionDate_pollingStation: {
        campaignId,
        userId,
        electionDate: electionDateObj,
        pollingStation,
      },
    },
    create: {
      campaignId,
      userId,
      pollingStation,
      pollingAddress,
      municipality,
      ward,
      province,
      electionDate: electionDateObj,
      assignedBy: session!.user.id,
      notes,
    },
    update: {
      pollingAddress,
      municipality,
      ward,
      notes,
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  // Notify the assigned scrutineer via push
  try {
    configureWebPush();
    const subs = await prisma.pushSubscription.findMany({
      where: { userId, campaignId },
      select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length > 0) {
      await sendPushBatch({
        subscriptions: subs,
        title: "Poll Day Assignment",
        body: `You've been assigned to ${pollingStation} — ${municipality}`,
        data: { assignmentId: assignment.id, campaignId, type: "eday_assignment" },
      });
    }
  } catch {
    // Non-fatal: push failure must not block assignment creation
  }

  return NextResponse.json({ data: assignment }, { status: 201 });
}
