import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { Prisma, ScriptTemplateType } from "@prisma/client";

// ── GET /api/field/scripts?campaignId=X ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const scriptType = req.nextUrl.searchParams.get("scriptType") as ScriptTemplateType | null;
  const validTypes: ScriptTemplateType[] = [
    "id_script", "persuasion", "gotv", "sign_ask", "donor_ask", "volunteer_ask", "general", "follow_up",
  ];

  const scripts = await prisma.scriptTemplate.findMany({
    where: {
      campaignId,
      deletedAt: null,
      isActive: true,
      ...(scriptType && validTypes.includes(scriptType) ? { scriptType } : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { scriptPackages: true } },
    },
    orderBy: [{ scriptType: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ data: scripts });
}

// ── POST /api/field/scripts ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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
  } | null;

  if (!body?.campaignId || !body?.name?.trim()) {
    return NextResponse.json({ error: "campaignId and name are required" }, { status: 400 });
  }
  if (!body.contentJson) {
    return NextResponse.json({ error: "contentJson is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const validTypes: ScriptTemplateType[] = [
    "id_script", "persuasion", "gotv", "sign_ask", "donor_ask", "volunteer_ask", "general", "follow_up",
  ];

  const script = await prisma.scriptTemplate.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      scriptType: validTypes.includes(body.scriptType!) ? body.scriptType! : "general",
      description: body.description?.trim() ?? null,
      contentJson: body.contentJson as Prisma.InputJsonValue,
      targetSupportLevels: (body.targetSupportLevels ?? []) as never[],
      language: body.language ?? "en",
      createdById: session!.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: script }, { status: 201 });
}
