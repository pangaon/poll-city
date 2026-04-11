import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// ── GET /api/field/scripts/packages?campaignId=X ────────────────────────────

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const packages = await prisma.scriptPackage.findMany({
    where: { campaignId, deletedAt: null, isActive: true },
    include: {
      primaryScript: { select: { id: true, name: true, scriptType: true } },
      fieldProgram: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: packages });
}

// ── POST /api/field/scripts/packages ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    description?: string;
    fieldProgramId?: string;
    primaryScriptId?: string;
    scriptIds?: string[];
  } | null;

  if (!body?.campaignId || !body?.name?.trim()) {
    return NextResponse.json({ error: "campaignId and name are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const pkg = await prisma.scriptPackage.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      fieldProgramId: body.fieldProgramId ?? null,
      primaryScriptId: body.primaryScriptId ?? null,
      scriptIds: body.scriptIds ?? [],
      createdById: session!.user.id,
    },
    include: {
      primaryScript: { select: { id: true, name: true, scriptType: true } },
      fieldProgram: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: pkg }, { status: 201 });
}
