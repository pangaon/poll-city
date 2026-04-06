/**
 * GET /api/admin/fix-slugs — One-time fix: set slugs on campaigns that have none.
 * Only SUPER_ADMIN can run this. Safe to call multiple times (idempotent).
 *
 * After running, visit /settings/public-page to confirm:
 * /candidates/[slug] shows the correct URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "SUPER_ADMIN only" }, { status: 403 });
  }

  // Find campaigns with null or empty slugs
  const campaigns = await prisma.campaign.findMany({
    where: { OR: [{ slug: "" }, { slug: null as any }] },
    select: { id: true, name: true, slug: true },
  });

  if (campaigns.length === 0) {
    // Also check for campaigns where the slug column might just be empty string
    const allCampaigns = await prisma.campaign.findMany({
      select: { id: true, name: true, slug: true },
    });
    const needsFix = allCampaigns.filter((c) => !c.slug || c.slug.trim() === "");

    if (needsFix.length === 0) {
      return NextResponse.json({
        message: "All campaigns already have slugs",
        campaigns: allCampaigns.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
      });
    }

    // Fix them
    const fixed = [];
    for (const campaign of needsFix) {
      const baseSlug = slugify(campaign.name);
      let slug = baseSlug || "campaign";
      let suffix = 1;
      while (await prisma.campaign.findFirst({ where: { slug, id: { not: campaign.id } } })) {
        slug = `${baseSlug}-${suffix++}`;
      }
      await prisma.campaign.update({ where: { id: campaign.id }, data: { slug } });
      fixed.push({ id: campaign.id, name: campaign.name, oldSlug: campaign.slug, newSlug: slug });
    }

    return NextResponse.json({ message: `Fixed ${fixed.length} campaigns`, fixed });
  }

  // Fix them
  const fixed = [];
  for (const campaign of campaigns) {
    const baseSlug = slugify(campaign.name);
    let slug = baseSlug || "campaign";
    let suffix = 1;
    while (await prisma.campaign.findFirst({ where: { slug, id: { not: campaign.id } } })) {
      slug = `${baseSlug}-${suffix++}`;
    }
    await prisma.campaign.update({ where: { id: campaign.id }, data: { slug } });
    fixed.push({ id: campaign.id, name: campaign.name, oldSlug: campaign.slug, newSlug: slug });
  }

  return NextResponse.json({ message: `Fixed ${fixed.length} campaigns`, fixed });
}
