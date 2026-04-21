import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { Prisma } from "@prisma/client";

/** GET /api/campaigns/[id]/customization */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const { forbidden } = await guardCampaignRoute(session!.user.id, params.id, "settings:read");
  if (forbidden) return forbidden;

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      slug: true,
      candidateName: true,
      candidateTitle: true,
      candidateBio: true,
      tagline: true,
      websiteUrl: true,
      facebookUrl: true,
      instagramHandle: true,
      twitterHandle: true,
      primaryColor: true,
      logoUrl: true,
      pageViews: true,
      customization: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: campaign });
}

/** PATCH /api/campaigns/[id]/customization — save website content */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const { forbidden } = await guardCampaignRoute(session!.user.id, params.id, "settings:write");
  if (forbidden) return forbidden;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const str = (k: string, max = 500) => {
    const v = body[k];
    return typeof v === "string" ? v.trim().slice(0, max) || null : undefined;
  };

  const campaignPatch: Record<string, unknown> = {};
  const cn = str("candidateName", 100);      if (cn !== undefined) campaignPatch.candidateName = cn;
  const ct = str("candidateTitle", 100);     if (ct !== undefined) campaignPatch.candidateTitle = ct;
  const cb = str("candidateBio", 2000);      if (cb !== undefined) campaignPatch.candidateBio = cb;
  const tl = str("tagline", 200);            if (tl !== undefined) campaignPatch.tagline = tl;
  const wu = str("websiteUrl", 300);         if (wu !== undefined) campaignPatch.websiteUrl = wu;
  const fb = str("facebookUrl", 300);        if (fb !== undefined) campaignPatch.facebookUrl = fb;
  const ig = str("instagramHandle", 100);    if (ig !== undefined) campaignPatch.instagramHandle = ig;
  const tw = str("twitterHandle", 100);      if (tw !== undefined) campaignPatch.twitterHandle = tw;

  // Build customization patch — merge with existing
  const existing = await prisma.campaign.findUnique({
    where: { id: params.id },
    select: { customization: true },
  });
  const existingCx = (existing?.customization && typeof existing.customization === "object")
    ? existing.customization as Record<string, unknown>
    : {};

  const cxPatch: Record<string, unknown> = { ...existingCx };

  if (typeof body.candidatePhotoUrl === "string") cxPatch.candidatePhotoUrl = body.candidatePhotoUrl.trim() || null;
  if (typeof body.heroBannerUrl === "string") cxPatch.heroBannerUrl = body.heroBannerUrl.trim() || null;
  if (typeof body.yearsInCommunity === "number") cxPatch.yearsInCommunity = body.yearsInCommunity;
  if (typeof body.videoUrl === "string") cxPatch.videoUrl = body.videoUrl.trim() || null;
  if (Array.isArray(body.communityConnections)) {
    cxPatch.communityConnections = (body.communityConnections as unknown[])
      .filter((x): x is string => typeof x === "string")
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 10);
  }
  if (Array.isArray(body.platformItems)) {
    cxPatch.platformItems = (body.platformItems as unknown[])
      .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
      .slice(0, 10)
      .map((item, i) => ({
        id: typeof item.id === "string" ? item.id : `issue-${Date.now()}-${i}`,
        title: typeof item.title === "string" ? item.title.trim().slice(0, 100) : "",
        summary: typeof item.summary === "string" ? item.summary.trim().slice(0, 300) : "",
        details: typeof item.details === "string" ? item.details.trim().slice(0, 2000) : "",
        order: typeof item.order === "number" ? item.order : i,
      }))
      .filter(item => item.title);
  }
  if (Array.isArray(body.endorsements)) {
    cxPatch.endorsements = (body.endorsements as unknown[])
      .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
      .slice(0, 20)
      .map((item, i) => ({
        id: typeof item.id === "string" ? item.id : `endorsement-${Date.now()}-${i}`,
        name: typeof item.name === "string" ? item.name.trim().slice(0, 100) : "",
        role: typeof item.role === "string" ? item.role.trim().slice(0, 100) : "",
        quote: typeof item.quote === "string" ? item.quote.trim().slice(0, 500) : "",
        photoUrl: typeof item.photoUrl === "string" ? item.photoUrl.trim() : undefined,
      }))
      .filter(item => item.name);
  }
  if (Array.isArray(body.customFaq)) {
    cxPatch.customFaq = (body.customFaq as unknown[])
      .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
      .slice(0, 20)
      .map((item, i) => ({
        id: typeof item.id === "string" ? item.id : `faq-${Date.now()}-${i}`,
        q: typeof item.q === "string" ? item.q.trim().slice(0, 300) : "",
        a: typeof item.a === "string" ? item.a.trim().slice(0, 1000) : "",
      }))
      .filter(item => item.q && item.a);
  }

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data: {
      ...campaignPatch,
      customization: cxPatch as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      slug: true,
      candidateName: true,
      candidateTitle: true,
      candidateBio: true,
      tagline: true,
      customization: true,
    },
  });

  return NextResponse.json({ data: updated });
}

/** POST /api/campaigns/[id]/customization — increment page view (public) */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.campaign.update({
      where: { id: params.id },
      data: { pageViews: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
