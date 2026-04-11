import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { isBrandKitComplete, loadBrandKit, type BrandKit } from "@/lib/brand/brand-kit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:read");
  if (forbidden) return forbidden;

  const brand = await loadBrandKit(campaignId!);
  return NextResponse.json({ brand, complete: isBrandKitComplete(brand) });
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const campaignId2 = typeof body.campaignId === "string" ? body.campaignId : null;
  const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, campaignId2, "settings:write");
  if (forbidden2) return forbidden2;
  const campaignId = campaignId2!;

  const patch: Record<string, unknown> = {};
  const strField = (key: string, max = 200) => {
    const v = body[key];
    if (typeof v === "string") patch[key] = v.slice(0, max) || null;
  };
  const colorField = (key: string) => {
    const v = body[key];
    if (typeof v === "string" && HEX.test(v)) patch[key] = v;
  };

  colorField("primaryColor");
  colorField("secondaryColor");
  colorField("accentColor");
  strField("candidateName", 100);
  strField("logoUrl", 500);
  strField("fontPrimary", 30);
  strField("tagline", 80);
  strField("websiteUrl", 300);
  strField("twitterHandle", 30);
  strField("facebookUrl", 300);
  strField("instagramHandle", 30);

  // Compute completeness
  const after = { ...body } as Partial<BrandKit>;
  patch.brandKitComplete =
    Boolean(after.primaryColor || body.primaryColor) &&
    Boolean(after.tagline || body.tagline);

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: patch,
    select: {
      candidateName: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      logoUrl: true,
      fontPrimary: true,
      tagline: true,
      websiteUrl: true,
      twitterHandle: true,
      facebookUrl: true,
      instagramHandle: true,
      brandKitComplete: true,
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "brand_updated",
      entityType: "Campaign",
      entityId: campaignId,
      details: patch as object,
    },
  });

  return NextResponse.json({ brand: updated });
}
