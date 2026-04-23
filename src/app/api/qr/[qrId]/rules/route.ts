import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { QrConditionType, QrActionType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  priority: z.number().int().min(0).max(100).default(0),
  conditionType: z.nativeEnum(QrConditionType),
  conditionValue: z.record(z.unknown()),
  actionType: z.nativeEnum(QrActionType),
  actionPayload: z.record(z.unknown()),
  isActive: z.boolean().default(true),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { qrId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const qr = await prisma.qrCode.findUnique({
    where: { id: params.qrId },
    select: { campaignId: true },
  });
  if (!qr || !qr.campaignId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: qr.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rules = await prisma.qrContextRule.findMany({
    where: { qrCodeId: params.qrId },
    orderBy: { priority: "asc" },
  });

  return NextResponse.json({ rules });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { qrId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const qr = await prisma.qrCode.findUnique({
    where: { id: params.qrId },
    select: { campaignId: true },
  });
  if (!qr || !qr.campaignId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: qr.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const rule = await prisma.qrContextRule.create({
    data: {
      qrCodeId: params.qrId,
      campaignId: qr.campaignId,
      priority: parsed.data.priority,
      conditionType: parsed.data.conditionType,
      conditionValue: parsed.data.conditionValue as Prisma.InputJsonValue,
      actionType: parsed.data.actionType,
      actionPayload: parsed.data.actionPayload as Prisma.InputJsonValue,
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
