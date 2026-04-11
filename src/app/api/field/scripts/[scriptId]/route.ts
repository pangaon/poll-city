import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { Prisma, ScriptTemplateType } from "@prisma/client";

// ── GET /api/field/scripts/[scriptId] ───────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { scriptId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const script = await prisma.scriptTemplate.findFirst({
    where: { id: params.scriptId, campaignId, deletedAt: null },
    include: {
      createdBy: { select: { id: true, name: true } },
      scriptPackages: {
        where: { deletedAt: null },
        select: { id: true, name: true, isActive: true },
      },
    },
  });

  if (!script) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }

  return NextResponse.json({ data: script });
}

// ── PATCH /api/field/scripts/[scriptId] ──────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { scriptId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    scriptType?: ScriptTemplateType;
    description?: string;
    contentJson?: unknown;
    targetSupportLevels?: string[];
    language?: string;
    isActive?: boolean;
  } | null;

  const campaignId = body?.campaignId;
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const existing = await prisma.scriptTemplate.findFirst({
    where: { id: params.scriptId, campaignId, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }

  const validTypes: ScriptTemplateType[] = [
    "id_script", "persuasion", "gotv", "sign_ask", "donor_ask", "volunteer_ask", "general", "follow_up",
  ];

  const updated = await prisma.scriptTemplate.update({
    where: { id: params.scriptId },
    data: {
      ...(body?.name?.trim() ? { name: body.name.trim() } : {}),
      ...(body?.scriptType && validTypes.includes(body.scriptType) ? { scriptType: body.scriptType } : {}),
      ...(body?.description !== undefined ? { description: body.description?.trim() ?? null } : {}),
      ...(body?.contentJson !== undefined ? { contentJson: body.contentJson as Prisma.InputJsonValue } : {}),
      ...(body?.targetSupportLevels !== undefined ? { targetSupportLevels: body.targetSupportLevels as never[] } : {}),
      ...(body?.language ? { language: body.language } : {}),
      ...(body?.isActive !== undefined ? { isActive: body.isActive } : {}),
      version: existing.version + 1,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: updated });
}

// ── DELETE /api/field/scripts/[scriptId] ─────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { scriptId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const existing = await prisma.scriptTemplate.findFirst({
    where: { id: params.scriptId, campaignId, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
  }

  await prisma.scriptTemplate.update({
    where: { id: params.scriptId },
    data: { deletedAt: new Date(), isActive: false },
  });

  return NextResponse.json({ success: true });
}
