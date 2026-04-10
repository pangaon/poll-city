import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  goalAmount: z.number().positive().nullable().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
  status: z.enum(["draft", "active", "paused", "completed", "archived"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fcId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { fcId } = await params;
  const fc = await prisma.fundraisingCampaign.findUnique({
    where: { id: fcId, deletedAt: null },
    include: {
      _count: { select: { donations: true, pledges: true } },
    },
  });
  if (!fc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, fc.campaignId);
  if (forbidden) return forbidden;

  const stats = await prisma.donation.aggregate({
    where: { fundraisingCampaignId: fcId, status: { notIn: ["cancelled", "failed"] }, deletedAt: null },
    _sum: { amount: true, netAmount: true },
    _count: { id: true },
    _avg: { amount: true },
  });

  return NextResponse.json({
    data: {
      ...fc,
      stats: {
        raised: stats._sum.amount ?? 0,
        net: stats._sum.netAmount ?? 0,
        count: stats._count.id,
        avgGift: stats._avg.amount ?? 0,
      },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ fcId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { fcId } = await params;
  const fc = await prisma.fundraisingCampaign.findUnique({ where: { id: fcId, deletedAt: null }, select: { campaignId: true } });
  if (!fc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, fc.campaignId);
  if (forbidden) return forbidden;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const updated = await prisma.fundraisingCampaign.update({
    where: { id: fcId },
    data: {
      ...parsed.data,
      ...(parsed.data.startDate ? { startDate: new Date(parsed.data.startDate) } : {}),
      ...(parsed.data.endDate !== undefined ? { endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null } : {}),
      updatedByUserId: session!.user.id,
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ fcId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { fcId } = await params;
  const fc = await prisma.fundraisingCampaign.findUnique({ where: { id: fcId, deletedAt: null }, select: { campaignId: true } });
  if (!fc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, fc.campaignId);
  if (forbidden) return forbidden;

  await prisma.fundraisingCampaign.update({
    where: { id: fcId },
    data: { deletedAt: new Date(), updatedByUserId: session!.user.id },
  });

  return NextResponse.json({ success: true });
}
