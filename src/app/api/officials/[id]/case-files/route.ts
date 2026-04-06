import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { resolveOfficialCampaignAccess } from "../_access";
import { CaseChannel, CasePriority, CaseStatus } from "@prisma/client";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await resolveOfficialCampaignAccess(session!.user.id, params.id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status");

  const caseFiles = await prisma.constituentCaseFile.findMany({
    where: {
      officialId: params.id,
      ...(status && Object.values(CaseStatus).includes(status as CaseStatus)
        ? { status: status as CaseStatus }
        : {}),
    },
    include: {
      constituent: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      notes: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ priority: "desc" }, { openedAt: "desc" }],
    take: 500,
  });

  return NextResponse.json({ data: caseFiles, access });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await resolveOfficialCampaignAccess(session!.user.id, params.id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    constituentId?: string;
    title?: string;
    description?: string;
    category?: string;
    channel?: string;
    priority?: string;
    status?: string;
    dueAt?: string;
    assignedToUserId?: string;
    externalReference?: string;
  } | null;

  if (!body?.constituentId || !body?.title?.trim()) {
    return NextResponse.json({ error: "constituentId and title are required" }, { status: 400 });
  }

  const constituent = await prisma.constituent.findFirst({
    where: { id: body.constituentId, officialId: params.id },
    select: { id: true },
  });
  if (!constituent) return NextResponse.json({ error: "Invalid constituentId" }, { status: 400 });

  const dueAt = parseDate(body.dueAt);
  if (body.dueAt && !dueAt) return NextResponse.json({ error: "Invalid dueAt" }, { status: 400 });

  const channel =
    body.channel && Object.values(CaseChannel).includes(body.channel as CaseChannel)
      ? (body.channel as CaseChannel)
      : CaseChannel.web;

  const priority =
    body.priority && Object.values(CasePriority).includes(body.priority as CasePriority)
      ? (body.priority as CasePriority)
      : CasePriority.medium;

  const status =
    body.status && Object.values(CaseStatus).includes(body.status as CaseStatus)
      ? (body.status as CaseStatus)
      : CaseStatus.open;

  const created = await prisma.constituentCaseFile.create({
    data: {
      officialId: params.id,
      campaignId: access.campaignId,
      constituentId: body.constituentId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      category: body.category?.trim() || null,
      channel,
      priority,
      status,
      dueAt,
      assignedToUserId: body.assignedToUserId || null,
      externalReference: body.externalReference?.trim() || null,
    },
    include: {
      constituent: true,
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
