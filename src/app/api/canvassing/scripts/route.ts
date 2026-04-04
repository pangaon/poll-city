import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

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
  const body = await req.json().catch(() => null) as {
    campaignId?: string; name?: string; scriptType?: "supporter" | "persuadable" | "opposition" | "general";
    openingLine?: string; keyMessages?: string[]; issueResponses?: Record<string, string>;
    closingAsk?: string; literature?: string;
  } | null;

  if (!body?.campaignId || !body.name?.trim() || !body.openingLine?.trim() || !body.closingAsk?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } } });
  if (!membership || !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "VOLUNTEER_LEADER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const script = await prisma.canvassingScript.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      scriptType: body.scriptType ?? "general",
      openingLine: body.openingLine.trim(),
      keyMessages: (body.keyMessages ?? []).filter((m) => m.trim()).slice(0, 5),
      issueResponses: body.issueResponses ?? {},
      closingAsk: body.closingAsk.trim(),
      literature: body.literature?.trim() || null,
    },
  });

  return NextResponse.json({ data: script }, { status: 201 });
}
