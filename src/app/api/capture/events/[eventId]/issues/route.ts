import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const createIssueSchema = z.object({
  locationId: z.string().min(1).nullish(),
  submissionId: z.string().min(1).nullish(),
  issueType: z.enum([
    "missing_scrutineer",
    "access_denied",
    "equipment_failure",
    "intimidation",
    "suspicious_activity",
    "ballot_irregularity",
    "long_lineup",
    "other",
  ]).default("other"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  description: z.string().min(1).max(2000),
});

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const event = await prisma.captureEvent.findFirst({
    where: { id: params.eventId, deletedAt: null },
    select: { campaignId: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const onlyOpen = req.nextUrl.searchParams.get("open") === "true";

  const issues = await prisma.captureIssueReport.findMany({
    where: {
      eventId: params.eventId,
      ...(onlyOpen ? { resolvedAt: null } : {}),
    },
    include: {
      location: { select: { id: true, name: true, ward: true } },
      reportedBy: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
    orderBy: [
      { severity: "desc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json({ data: issues });
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const event = await prisma.captureEvent.findFirst({
    where: { id: params.eventId, deletedAt: null },
    select: { campaignId: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: event.campaignId } },
    select: { status: true },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createIssueSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const issue = await prisma.captureIssueReport.create({
    data: {
      eventId: params.eventId,
      locationId: parsed.data.locationId ?? null,
      submissionId: parsed.data.submissionId ?? null,
      campaignId: event.campaignId,
      reportedById: session!.user.id,
      issueType: parsed.data.issueType,
      severity: parsed.data.severity,
      description: parsed.data.description,
    },
    include: { location: { select: { id: true, name: true } } },
  });

  // Update location status to "problem" if locationId provided
  if (parsed.data.locationId) {
    await prisma.captureLocation.update({
      where: { id: parsed.data.locationId },
      data: { status: "problem" },
    });
  }

  return NextResponse.json({ data: issue }, { status: 201 });
}
