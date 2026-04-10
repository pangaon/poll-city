import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["pending", "partial", "fulfilled", "overdue", "cancelled"]).optional(),
  fulfilledAmount: z.number().min(0).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pledgeId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { pledgeId } = await params;
  const pledge = await prisma.pledge.findUnique({ where: { id: pledgeId }, select: { campaignId: true } });
  if (!pledge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, pledge.campaignId);
  if (forbidden) return forbidden;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const updated = await prisma.pledge.update({
    where: { id: pledgeId },
    data: {
      ...parsed.data,
      ...(parsed.data.dueDate !== undefined ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}
