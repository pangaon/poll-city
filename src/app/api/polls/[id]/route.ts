import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const pollId = req.nextUrl.searchParams.get("id");
  if (!pollId) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!poll || !poll.campaignId) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: poll.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ data: poll });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const pollId = req.nextUrl.searchParams.get("id");
  if (!pollId) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const poll = await prisma.poll.findUnique({ where: { id: pollId }, select: { campaignId: true } });
  if (!poll || !poll.campaignId) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: poll.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updateData: any = {
    question: typeof body.question === "string" ? body.question.trim() : undefined,
    description: typeof body.description === "string" ? body.description.trim() || null : undefined,
    type: typeof body.type === "string" ? body.type : undefined,
    visibility: typeof body.visibility === "string" ? body.visibility : undefined,
    targetRegion: typeof body.targetRegion === "string" ? body.targetRegion.trim() || null : undefined,
    targetPostalPrefixes: Array.isArray(body.targetPostalPrefixes) ? body.targetPostalPrefixes.filter((item: unknown) => typeof item === "string" && item.trim() !== "") : undefined,
    endsAt: typeof body.endsAt === "string" ? new Date(body.endsAt) : undefined,
    tags: Array.isArray(body.tags) ? body.tags.filter((item: unknown) => typeof item === "string" && item.trim() !== "") : undefined,
  };

  if (Array.isArray(body.options)) {
    updateData.options = { deleteMany: {}, create: body.options.filter((item: unknown) => typeof item === "string" && item.trim() !== "").map((text: string, index: number) => ({ text: text.trim(), order: index })) };
  }

  const updated = await prisma.poll.update({
    where: { id: pollId },
    data: updateData,
    include: { options: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ data: updated });
}
