import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";
import { Prisma } from "@prisma/client";

type Ctx = { params: { id: string } };

const branchResponseSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(200),
  next: z.string().nullable(),
});

const branchNodeSchema = z.object({
  id: z.string(),
  prompt: z.string().min(1).max(1000),
  responses: z.array(branchResponseSchema).min(1).max(8),
});

const branchLogicSchema = z.object({
  startNodeId: z.string(),
  nodes: z.array(branchNodeSchema).min(1).max(20),
});

export async function GET(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = session!.user.activeCampaignId as string;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const script = await prisma.canvassingScript.findFirst({
    where: { id: params.id, campaignId },
  });
  if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: script });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = session!.user.activeCampaignId as string;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:manage");
  if (forbidden) return forbidden;

  const script = await prisma.canvassingScript.findFirst({ where: { id: params.id, campaignId } });
  if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const raw = await req.json().catch(() => null);
  if (!raw) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Only allow updating branchLogic via this route for now
  const parsed = branchLogicSchema.safeParse(raw.branchLogic ?? raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid branch logic", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.canvassingScript.update({
    where: { id: params.id },
    data: { branchLogic: parsed.data as Prisma.InputJsonValue },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = session!.user.activeCampaignId as string;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:manage");
  if (forbidden) return forbidden;

  const script = await prisma.canvassingScript.findFirst({ where: { id: params.id, campaignId } });
  if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.canvassingScript.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
