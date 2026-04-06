import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import type { Prisma } from "@prisma/client";
import { CaseChannel, CasePriority, CaseStatus } from "@prisma/client";
import { resolveOfficialCampaignAccess } from "../../_access";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; caseId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const caseFile = await prisma.constituentCaseFile.findUnique({ where: { id: params.caseId } });
  if (!caseFile || caseFile.officialId !== params.id) {
    return NextResponse.json({ error: "Case file not found" }, { status: 404 });
  }

  const access = await resolveOfficialCampaignAccess(session!.user.id, params.id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string | null;
    category?: string | null;
    channel?: string;
    priority?: string;
    status?: string;
    dueAt?: string | null;
    assignedToUserId?: string | null;
    externalReference?: string | null;
    resolutionNotes?: string | null;
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const data: Prisma.ConstituentCaseFileUpdateInput = {};

  if (body.title !== undefined) data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.category !== undefined) data.category = body.category?.trim() || null;
  if (body.externalReference !== undefined) data.externalReference = body.externalReference?.trim() || null;

  if (body.channel && Object.values(CaseChannel).includes(body.channel as CaseChannel)) {
    data.channel = body.channel as CaseChannel;
  }

  if (body.priority && Object.values(CasePriority).includes(body.priority as CasePriority)) {
    data.priority = body.priority as CasePriority;
  }

  if (body.status && Object.values(CaseStatus).includes(body.status as CaseStatus)) {
    data.status = body.status as CaseStatus;
    if (body.status === CaseStatus.resolved) data.resolvedAt = new Date();
    if (body.status === CaseStatus.closed) data.closedAt = new Date();
  }

  if (body.dueAt !== undefined) {
    if (body.dueAt === null) {
      data.dueAt = null;
    } else {
      const dueAt = parseDate(body.dueAt);
      if (!dueAt) return NextResponse.json({ error: "Invalid dueAt" }, { status: 400 });
      data.dueAt = dueAt;
    }
  }

  if (body.assignedToUserId !== undefined) {
    data.assignedTo = body.assignedToUserId ? { connect: { id: body.assignedToUserId } } : { disconnect: true };
  }

  if (body.resolutionNotes !== undefined) {
    data.notes = {
      create: {
        authorUserId: session!.user.id,
        note: body.resolutionNotes?.trim() || "Status update",
        isInternal: true,
      },
    };
  }

  const updated = await prisma.constituentCaseFile.update({
    where: { id: params.caseId },
    data,
    include: {
      constituent: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      notes: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  return NextResponse.json({ data: updated });
}
