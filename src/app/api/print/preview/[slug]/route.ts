import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { applyBrand, loadBrandKit, getDefaultBrand, type BrandKit } from "@/lib/brand/brand-kit";

export const dynamic = "force-dynamic";

// HTML-escape user-supplied values before injecting into templates.
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Validate hex colour: must be #RRGGBB or #RGB (allow URL-encoded #).
function safeColour(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.startsWith("%23") ? `#${raw.slice(3)}` : raw;
  return /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(s) ? s : null;
}

// Inline HTML preview (for iframe embedding in the design tool).
// Supports real-time override query params so the editor gets live preview.
// Override params: candidateName, tagline, primaryColor, secondaryColor, logoUrl, phone, website
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");

  const template = await prisma.printTemplate.findUnique({
    where: { slug: params.slug },
    select: { htmlTemplate: true, isActive: true },
  });
  if (!template || !template.isActive) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Load brand from campaign or use defaults
  let brand: BrandKit = getDefaultBrand();
  if (campaignId) {
    const m = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    });
    if (m) brand = await loadBrandKit(campaignId);
  }

  // Apply real-time overrides from query params — these win over the DB brand kit.
  // All text values are HTML-escaped before injection.
  const overrides: Partial<BrandKit> = {};
  const candidateName = sp.get("candidateName");
  if (candidateName) overrides.candidateName = esc(candidateName);
  const tagline = sp.get("tagline");
  if (tagline) overrides.tagline = esc(tagline);
  const phone = sp.get("phone");
  if (phone) overrides.phone = esc(phone);
  const website = sp.get("website");
  if (website) overrides.websiteUrl = esc(website);
  const primaryColor = safeColour(sp.get("primaryColor"));
  if (primaryColor) overrides.primaryColor = primaryColor;
  const secondaryColor = safeColour(sp.get("secondaryColor"));
  if (secondaryColor) overrides.secondaryColor = secondaryColor;
  const logoUrl = sp.get("logoUrl");
  // Only allow blob URLs from vercel blob domain or same-origin to prevent open redirect in logo injection
  if (logoUrl && (logoUrl.startsWith("https://") || logoUrl.startsWith("/"))) {
    overrides.logoUrl = logoUrl;
  }

  const mergedBrand: BrandKit = { ...brand, ...overrides };

  const html = applyBrand(template.htmlTemplate, mergedBrand);
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
