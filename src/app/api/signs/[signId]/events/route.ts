import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { SignEventAction, SignStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ACTION_TO_STATUS: Partial<Record<SignEventAction, string>> = {
  install: "installed",
  remove:  "removed",
  damage:  "damaged",
  missing: "missing",
  repair:  "needs_repair",
};

const createEventSchema = z.object({
  campaignId:    z.string().min(1),
  action:        z.nativeEnum(SignEventAction),
  notes:         z.string().max(2000).nullish(),
  lat:           z.number().nullish(),
  lng:           z.number().nullish(),
  address:       z.string().max(500).nullish(),
  photoUrl:      z.string().url().nullish(),
  routeId:       z.string().nullish(),
  fieldTargetId: z.string().nullish(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { signId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sign = await prisma.sign.findUnique({
    where: { id: params.signId },
    select: { campaignId: true },
  });
  if (!sign) return NextResponse.json({ error: "Sign not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: sign.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const events = await prisma.signEvent.findMany({
    where: { signId: params.signId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ events });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { signId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sign = await prisma.sign.findUnique({
    where: { id: params.signId },
    select: { campaignId: true, status: true },
  });
  if (!sign) return NextResponse.json({ error: "Sign not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: sign.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const newStatus = ACTION_TO_STATUS[data.action];

  const [event] = await prisma.$transaction([
    prisma.signEvent.create({
      data: {
        signId:         params.signId,
        campaignId:     sign.campaignId,
        userId:         session!.user.id,
        action:         data.action,
        previousStatus: sign.status as string,
        notes:          data.notes ?? null,
        lat:            data.lat ?? null,
        lng:            data.lng ?? null,
        address:        data.address ?? null,
        photoUrl:       data.photoUrl ?? null,
        routeId:        data.routeId ?? null,
        fieldTargetId:  data.fieldTargetId ?? null,
      },
      include: { user: { select: { id: true, name: true } } },
    }),
    ...(newStatus
      ? [prisma.sign.update({
          where: { id: params.signId },
          data: { status: newStatus as SignStatus },
        })]
      : []),
  ]);

  return NextResponse.json({ event: { ...event, newStatus } }, { status: 201 });
}
