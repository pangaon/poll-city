import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { createCanvassListSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "canvassing:read");
  if (permError) return permError;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const lists = await prisma.canvassList.findMany({
    where: { campaignId }, orderBy: { createdAt: "desc" },
    include: { assignments: { include: { user: { select: { id: true, name: true } } } } },
  });
  return NextResponse.json({ data: lists });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError2 = requirePermission(session!.user.role as string, "canvassing:write");
  if (permError2) return permError2;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = createCanvassListSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId: parsed.data.campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const list = await prisma.canvassList.create({ data: parsed.data });
  await prisma.activityLog.create({
    data: {
      campaignId: parsed.data.campaignId,
      userId: session!.user.id,
      action: "created",
      entityType: "canvass_list",
      entityId: list.id,
      details: { name: parsed.data.name },
    },
  });
  return NextResponse.json({ data: list }, { status: 201 });
}
