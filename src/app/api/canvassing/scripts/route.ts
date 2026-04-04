import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
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
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scripts = await prisma.canvassingScript.findMany({ where: { campaignId }, orderBy: { updatedAt: "desc" } });
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

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } } });
  if (!membership || !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "VOLUNTEER_LEADER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const script = await prisma.canvassingScript.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      scriptType: body.scriptType,
      openingLine: body.openingLine.trim(),
      keyMessages: body.keyMessages.filter((m) => m.trim()).slice(0, 5),
      issueResponses: body.issueResponses,
      closingAsk: body.closingAsk.trim(),
      literature: body.literature?.trim() || null,
    },
  });

  return NextResponse.json({ data: script }, { status: 201 });
}
