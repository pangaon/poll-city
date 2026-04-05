import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { applyBrand, loadBrandKit, getDefaultBrand } from "@/lib/brand/brand-kit";

export const dynamic = "force-dynamic";

// Inline HTML preview (for iframe embedding in the design tool).
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const template = await prisma.printTemplate.findUnique({
    where: { slug: params.slug },
    select: { htmlTemplate: true, isActive: true },
  });
  if (!template || !template.isActive) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  let brand = getDefaultBrand();
  if (campaignId) {
    const m = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    });
    if (m) brand = await loadBrandKit(campaignId);
  }

  const html = applyBrand(template.htmlTemplate, brand);
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
