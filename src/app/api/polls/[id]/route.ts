import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { audit } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  if (poll.campaignId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId: poll.campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ data: poll });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    select: { campaignId: true },
  });
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  if (poll.campaignId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId: poll.campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};

  if (typeof body.question === "string") updateData.question = body.question.trim();
  if (typeof body.description === "string") updateData.description = body.description.trim() || null;
  if (typeof body.type === "string") updateData.type = body.type;
  if (typeof body.visibility === "string") updateData.visibility = body.visibility;
  if (typeof body.targetRegion === "string") updateData.targetRegion = body.targetRegion.trim() || null;
  if (Array.isArray(body.targetPostalPrefixes)) {
    updateData.targetPostalPrefixes = body.targetPostalPrefixes.filter(
      (item: unknown) => typeof item === "string" && item.trim() !== ""
    );
  }
  if (typeof body.endsAt === "string") updateData.endsAt = new Date(body.endsAt);
  if (body.endsAt === null) updateData.endsAt = null;
  if (Array.isArray(body.tags)) {
    updateData.tags = body.tags.filter((item: unknown) => typeof item === "string" && item.trim() !== "");
  }
  // Management flags
  if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;
  if (typeof body.isFeatured === "boolean") updateData.isFeatured = body.isFeatured;
  // Close poll immediately
  if (body.closeNow === true) updateData.endsAt = new Date();

  if (Array.isArray(body.options)) {
    updateData.options = {
      deleteMany: {},
      create: body.options
        .filter((item: unknown) => typeof item === "string" && item.trim() !== "")
        .map((text: string, index: number) => ({ text: text.trim(), order: index })),
    };
  }

  const updated = await prisma.poll.update({
    where: { id: params.id },
    data: updateData,
    include: { options: { orderBy: { order: "asc" } } },
  });

  if (poll.campaignId) {
    await audit(prisma, "poll.update", {
      campaignId: poll.campaignId,
      userId: session!.user.id,
      entityId: params.id,
      entityType: "Poll",
      ip: req.headers.get("x-forwarded-for"),
    });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    select: { campaignId: true },
  });
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  if (poll.campaignId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId: poll.campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft-delete: set isActive = false rather than hard delete to preserve response data
  await prisma.poll.update({ where: { id: params.id }, data: { isActive: false } });

  return NextResponse.json({ data: { archived: true } });
}
