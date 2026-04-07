/**
 * Opponent tracking — know what your competition is doing.
 *
 * GET — List opponents for a campaign
 * POST — Add an opponent
 *
 * From the Bible: "The opponent is also using software.
 * Speed matters. Every second of friction we remove
 * is a competitive advantage for our campaigns."
 *
 * Tracks: name, sign count, endorsements, estimated support,
 * strengths, weaknesses, key issues, social media presence.
 * All entered by the campaign team from field intelligence.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { z } from "zod";

const createOpponentSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(200),
  party: z.string().max(100).nullish(),
  signCount: z.number().int().min(0).default(0),
  estimatedSupport: z.number().min(0).max(100).nullish(),
  endorsements: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  keyIssues: z.array(z.string()).default([]),
  website: z.string().url().nullish(),
  twitter: z.string().max(100).nullish(),
  facebook: z.string().max(200).nullish(),
  notes: z.string().max(5000).nullish(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "intelligence:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const opponents = await prisma.opponentIntel.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ opponents });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "intelligence:write");
  if (permError) return permError;

  const body = await req.json();
  const parsed = createOpponentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const { campaignId, ...data } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const opponent = await prisma.opponentIntel.create({
    data: {
      campaignId,
      type: "note",
      title: data.name,
      details: JSON.stringify({
        party: data.party, signCount: data.signCount, estimatedSupport: data.estimatedSupport,
        endorsements: data.endorsements, strengths: data.strengths, weaknesses: data.weaknesses,
        keyIssues: data.keyIssues, website: data.website, twitter: data.twitter,
        facebook: data.facebook, notes: data.notes,
      }),
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "opponent_added",
      entityType: "OpponentIntel",
      entityId: opponent.id,
      details: { name: data.name },
    },
  });

  return NextResponse.json({ opponent }, { status: 201 });
}
