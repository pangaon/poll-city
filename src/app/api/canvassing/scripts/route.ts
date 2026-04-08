import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";

const createScriptSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(200),
  scriptType: z.enum(["supporter", "persuadable", "opposition", "general"]).default("general"),
  openingLine: z.string().min(1).max(2000),
  keyMessages: z.array(z.string().max(500)).max(5).default([]),
  issueResponses: z.record(z.string(), z.string().max(2000)).default({}),
  closingAsk: z.string().min(1).max(2000),
  literature: z.string().max(500).nullish(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
    const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const scripts = await prisma.canvassingScript.findMany({ where: { campaignId: campaignId! }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ data: scripts });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const raw = await req.json().catch(() => null);
  const parsed = createScriptSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:manage");
  if (forbidden) return forbidden;

  const script = await prisma.canvassingScript.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      scriptType: body.scriptType,
      openingLine: body.openingLine.trim(),
      keyMessages: body.keyMessages.filter((m: string) => m.trim()).slice(0, 5),
      issueResponses: body.issueResponses,
      closingAsk: body.closingAsk.trim(),
      literature: body.literature?.trim() || null,
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: body.campaignId,
      userId: session!.user.id,
      action: "created",
      entityType: "canvassing_script",
      entityId: script.id,
      details: { name: script.name, type: script.scriptType },
    },
  });

  return NextResponse.json({ data: script }, { status: 201 });
}
