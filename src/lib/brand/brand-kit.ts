// Brand Kit — campaign identity applied to every generated asset.
// Loaded once from the Campaign row, then injected into templates.

import prisma from "@/lib/db/prisma";

export interface BrandKit {
  campaignName: string;
  candidateName: string | null;
  tagline: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  fontPrimary: string;
  websiteUrl: string | null;
  phone: string | null;
  email: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
}

const DEFAULT_BRAND: BrandKit = {
  campaignName: "Your Campaign",
  candidateName: null,
  tagline: null,
  primaryColor: "#1a4782",
  secondaryColor: "#d71920",
  accentColor: "#f5a623",
  logoUrl: null,
  fontPrimary: "inter",
  websiteUrl: null,
  phone: null,
  email: null,
  twitter: null,
  facebook: null,
  instagram: null,
};

export const AVAILABLE_FONTS = [
  { slug: "inter", label: "Inter", css: "'Inter', system-ui, sans-serif" },
  { slug: "merriweather", label: "Merriweather", css: "'Merriweather', Georgia, serif" },
  { slug: "playfair", label: "Playfair Display", css: "'Playfair Display', Georgia, serif" },
  { slug: "montserrat", label: "Montserrat", css: "'Montserrat', system-ui, sans-serif" },
  { slug: "lato", label: "Lato", css: "'Lato', system-ui, sans-serif" },
  { slug: "opensans", label: "Open Sans", css: "'Open Sans', system-ui, sans-serif" },
  { slug: "raleway", label: "Raleway", css: "'Raleway', system-ui, sans-serif" },
] as const;

export function fontCss(slug: string): string {
  return AVAILABLE_FONTS.find((f) => f.slug === slug)?.css ?? AVAILABLE_FONTS[0].css;
}

export const PARTY_PRESETS: Record<string, { primary: string; secondary: string; label: string }> = {
  liberal: { primary: "#D71920", secondary: "#FFFFFF", label: "Liberal" },
  conservative: { primary: "#1A4782", secondary: "#FFFFFF", label: "Conservative" },
  ndp: { primary: "#F58220", secondary: "#FFFFFF", label: "NDP" },
  green: { primary: "#2E7D32", secondary: "#FFFFFF", label: "Green" },
  bloc: { primary: "#00AEEF", secondary: "#FFFFFF", label: "Bloc Québécois" },
  independent: { primary: "#1E293B", secondary: "#FFFFFF", label: "Independent" },
};

export async function loadBrandKit(campaignId: string): Promise<BrandKit> {
  const c = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      name: true,
      candidateName: true,
      candidatePhone: true,
      candidateEmail: true,
      websiteUrl: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      fontPrimary: true,
      tagline: true,
      twitterHandle: true,
      facebookUrl: true,
      instagramHandle: true,
    },
  });
  if (!c) return DEFAULT_BRAND;
  return {
    campaignName: c.name,
    candidateName: c.candidateName,
    tagline: c.tagline,
    primaryColor: c.primaryColor ?? DEFAULT_BRAND.primaryColor,
    secondaryColor: c.secondaryColor ?? DEFAULT_BRAND.secondaryColor,
    accentColor: c.accentColor ?? DEFAULT_BRAND.accentColor,
    logoUrl: c.logoUrl,
    fontPrimary: c.fontPrimary ?? "inter",
    websiteUrl: c.websiteUrl,
    phone: c.candidatePhone,
    email: c.candidateEmail,
    twitter: c.twitterHandle,
    facebook: c.facebookUrl,
    instagram: c.instagramHandle,
  };
}

export function getDefaultBrand(overrides: Partial<BrandKit> = {}): BrandKit {
  return { ...DEFAULT_BRAND, ...overrides };
}

// Convert brand kit to template variables (for {{VAR}} substitution).
export function brandToVars(brand: BrandKit): Record<string, string> {
  return {
    CAMPAIGN_NAME: brand.campaignName,
    CANDIDATE_NAME: brand.candidateName ?? brand.campaignName,
    TAGLINE: brand.tagline ?? "",
    PRIMARY_COLOR: brand.primaryColor,
    SECONDARY_COLOR: brand.secondaryColor,
    ACCENT_COLOR: brand.accentColor,
    LOGO_URL: brand.logoUrl ?? "",
    LOGO_HTML: brand.logoUrl
      ? `<img src="${brand.logoUrl}" alt="${brand.campaignName}" style="max-height:80px;width:auto;" />`
      : "",
    FONT_CSS: fontCss(brand.fontPrimary),
    WEBSITE: brand.websiteUrl ?? "",
    PHONE: brand.phone ?? "",
    EMAIL: brand.email ?? "",
    TWITTER: brand.twitter ? `@${brand.twitter.replace(/^@/, "")}` : "",
    FACEBOOK: brand.facebook ?? "",
    INSTAGRAM: brand.instagram ? `@${brand.instagram.replace(/^@/, "")}` : "",
  };
}

// Simple {{VAR}} substitution.
export function applyBrand(template: string, brand: BrandKit): string {
  const vars = brandToVars(brand);
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, name: string) => vars[name] ?? "");
}

// Is the kit complete enough to mark brandKitComplete=true?
export function isBrandKitComplete(b: BrandKit): boolean {
  return Boolean(
    b.primaryColor && b.secondaryColor && b.campaignName && (b.tagline || b.candidateName),
  );
}
