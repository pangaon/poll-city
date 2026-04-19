import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

// GET  /api/ops/social/officials — full officials list for George's ops panel
// PATCH /api/ops/social/officials — toggle isActive, subscriptionStatus, isClaimed

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const officials = await prisma.official.findMany({
    where: { externalSource: "toronto_city_council_2024" },
    orderBy: [{ title: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      title: true,
      district: true,
      isActive: true,
      isClaimed: true,
      subscriptionStatus: true,
      website: true,
      _count: {
        select: {
          follows: true,
          questions: true,
          politicianPosts: true,
          campaigns: true,
        },
      },
    },
  });

  // Attach claim info (which campaign is linked)
  const linkedCampaigns = await prisma.campaign.findMany({
    where: { officialId: { not: null } },
    select: {
      id: true,
      name: true,
      candidateName: true,
      isActive: true,
      officialId: true,
    },
  });

  const campaignByOfficial = new Map<string, typeof linkedCampaigns[0]>();
  for (const c of linkedCampaigns) {
    if (c.officialId) campaignByOfficial.set(c.officialId, c);
  }

  return NextResponse.json({
    data: officials.map((o) => ({
      ...o,
      linkedCampaign: campaignByOfficial.get(o.id) ?? null,
    })),
  });
}

const PatchSchema = z.object({
  id: z.string().cuid(),
  isActive: z.boolean().optional(),
  subscriptionStatus: z.enum(["free", "verified", "premium"]).optional(),
  isClaimed: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { id, ...data } = parsed.data;

  const updated = await prisma.official.update({
    where: { id },
    data,
    select: { id: true, isActive: true, subscriptionStatus: true, isClaimed: true },
  });

  return NextResponse.json({ data: updated });
}
