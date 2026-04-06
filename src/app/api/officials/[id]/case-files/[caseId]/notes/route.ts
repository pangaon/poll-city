import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { resolveOfficialCampaignAccess } from "../../../_access";

export async function POST(req: NextRequest, { params }: { params: { id: string; caseId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await resolveOfficialCampaignAccess(session!.user.id, params.id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const caseFile = await prisma.constituentCaseFile.findUnique({ where: { id: params.caseId } });
  if (!caseFile || caseFile.officialId !== params.id) {
    return NextResponse.json({ error: "Case file not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    note?: string;
    isInternal?: boolean;
    attachments?: string[];
  } | null;

  if (!body?.note?.trim()) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  const created = await prisma.constituentCaseNote.create({
    data: {
      caseFileId: params.caseId,
      authorUserId: session!.user.id,
      note: body.note.trim(),
      isInternal: body.isInternal ?? true,
      attachments: body.attachments?.filter(Boolean) || [],
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
