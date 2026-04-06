import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { isBrandKitComplete, loadBrandKit, type BrandKit } from "@/lib/brand/brand-kit";

export const dynamic = "force-dynamic";

async function verifyAccess(userId: string, campaignId: string) {
  const m = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId } },
  });
  return m && ["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(m.role);
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "settings:read");
  if (permError) return permError;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const m = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!m) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const brand = await loadBrandKit(campaignId);
  return NextResponse.json({ brand, complete: isBrandKitComplete(brand) });
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError2 = requirePermission(session!.user.role as string, "settings:write");
  if (permError2) return permError2;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  if (!(await verifyAccess(session!.user.id, campaignId))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

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
