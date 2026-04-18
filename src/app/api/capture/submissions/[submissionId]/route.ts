import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

async function guardSubmission(userId: string, submissionId: string) {
  const sub = await prisma.captureSubmission.findUnique({
    where: { id: submissionId },
    include: {
      event: { select: { campaignId: true } },
      results: { include: { candidate: { select: { id: true, name: true, party: true } } } },
      revisions: { orderBy: { createdAt: "desc" } },
      issues: true,
      location: { select: { id: true, name: true, ward: true } },
      submittedBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!sub) return { sub: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: sub.event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return { sub: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { sub, membership, error: null };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { sub, error: guardError } = await guardSubmission(session!.user.id, params.submissionId);
  if (guardError) return guardError;

  return NextResponse.json({ data: sub });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { sub, membership, error: guardError } = await guardSubmission(session!.user.id, params.submissionId);
  if (guardError) return guardError;

  // Only the submitter can update their draft, or a manager can update any
  const isManager = ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership!.role);
  const isOwner = sub!.submittedById === session!.user.id;

  if (!isOwner && !isManager) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (sub!.status === "approved" && !isManager) {
    return NextResponse.json({ error: "Cannot edit an approved submission" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await prisma.captureSubmission.update({
    where: { id: params.submissionId },
    data: {
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.status !== undefined && isManager && { status: body.status }),
    },
  });

  return NextResponse.json({ data: updated });
}
