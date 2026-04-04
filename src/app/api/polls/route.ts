import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const createPollSchema = z.object({
  question: z.string().min(5).max(500),
  description: z.string().max(1000).optional(),
  type: z.enum(["binary", "multiple_choice", "ranked", "slider", "swipe", "image_swipe", "emoji_react", "priority_rank"]),
  visibility: z.enum(["public", "campaign_only", "unlisted"]).default("public"),
  targetRegion: z.string().optional(),
  targetPostalPrefixes: z.array(z.string()).optional(),
  campaignId: z.string().cuid().optional(),
  officialId: z.string().optional(),
  options: z.array(z.string()).optional(),
  endsAt: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

/** GET /api/polls?postalCode=M4C1A1&featured=true&campaignId=xxx */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const postalCode = sp.get("postalCode");
  const featured = sp.get("featured") === "true";
  const campaignId = sp.get("campaignId");

  // Campaign-specific polls require auth + membership
  if (campaignId) {
    const { session, error } = await apiAuth(req);
    if (error) return error;
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where: Record<string, unknown> = { isActive: true };
  if (featured) where.isFeatured = true;
  if (campaignId) {
    where.campaignId = campaignId;
  } else {
    // Public listing only shows public polls
    where.visibility = "public";
  }

  if (postalCode) {
    const prefix = postalCode.replace(/\s/g, "").slice(0, 3).toUpperCase();
    where.OR = [
      { targetPostalPrefixes: { has: prefix } },
      { targetPostalPrefixes: { isEmpty: true } },
    ];
  }

  const polls = await prisma.poll.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 20,
    include: {
      options: { orderBy: { order: "asc" } },
      _count: { select: { responses: true } },
    },
  });

  return NextResponse.json({ data: polls });
}

/** POST /api/polls — create a poll (auth required) */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createPollSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  // If tied to a campaign, verify membership
  if (parsed.data.campaignId) {
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId: parsed.data.campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden — not a member of this campaign" }, { status: 403 });
    // Campaign polls default to campaign_only visibility
    if (parsed.data.visibility === "public" && membership.role === "VOLUNTEER") {
      return NextResponse.json({ error: "Volunteers cannot create public polls" }, { status: 403 });
    }
  }

  const { options, endsAt, ...pollData } = parsed.data;

  const poll = await prisma.poll.create({
    data: {
      ...pollData,
      createdByUserId: session!.user.id,
      endsAt: endsAt ? new Date(endsAt) : null,
      options: options?.length ? {
        create: options.map((text, i) => ({ text, order: i })),
      } : undefined,
    },
    include: { options: true },
  });

  return NextResponse.json({ data: poll }, { status: 201 });
}
