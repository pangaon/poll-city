import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string(),
  text: z.string().min(1).max(100).transform((s) => s.trim().toLowerCase()),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const keywords = await prisma.repKeyword.findMany({
    where: { campaignId: campaignId!, active: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ keywords });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { campaignId, text } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const keyword = await prisma.repKeyword.upsert({
    where: { campaignId_text: { campaignId, text } },
    create: { campaignId, text, active: true },
    update: { active: true },
  });
  return NextResponse.json({ keyword }, { status: 201 });
}
