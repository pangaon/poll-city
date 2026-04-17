import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string(),
  contactId: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { campaignId, contactId } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const action = await prisma.amplificationAction.findUnique({
    where: { id: params.id, campaignId },
    select: { id: true, status: true },
  });

  if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (action.status !== "active") {
    return NextResponse.json({ error: "Action is not active" }, { status: 409 });
  }

  const participation = await prisma.amplificationParticipation.upsert({
    where: {
      amplificationActionId_contactId: {
        amplificationActionId: params.id,
        contactId: contactId ?? "",
      },
    },
    create: {
      amplificationActionId: params.id,
      contactId,
      participationStatus: "participated",
      participatedAt: new Date(),
    },
    update: {
      participationStatus: "participated",
      participatedAt: new Date(),
    },
  });

  return NextResponse.json({ participation }, { status: 201 });
}
