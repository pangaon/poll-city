import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { applyBrand, loadBrandKit, getDefaultBrand } from "@/lib/brand/brand-kit";

export const dynamic = "force-dynamic";

// GET /api/print/download/[slug]?campaignId=...
// Returns print-ready HTML with the campaign's brand kit applied.
// HTML is rendered by the browser's print-to-PDF flow for now; true 300dpi
// CMYK PDF generation will follow once puppeteer is wired server-side.
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "signs:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const template = await prisma.printTemplate.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, htmlTemplate: true, width: true, height: true, isActive: true },
  });
  if (!template || !template.isActive) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  let brand = getDefaultBrand();
  if (campaignId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    brand = await loadBrandKit(campaignId);
  }

  const html = applyBrand(template.htmlTemplate, brand);
  const filename = `${template.name.toLowerCase().replace(/\s+/g, "-")}.html`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
