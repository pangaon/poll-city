import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

// ── Constants ─────────────────────────────────────────────────────────────────

const BINARY_VALUES = new Set(["yes", "no"]);
const SWIPE_VALUES = new Set(["left", "right", "up", "skip"]);
const SLIDER_MIN = 0;
const SLIDER_MAX = 100;


// ── P2002 handler ─────────────────────────────────────────────────────────────
// Wraps Prisma writes to catch unique constraint violations (duplicate votes)
// and return 409 instead of 500.
async function runWithDuplicateProtection(
  fn: () => Promise<void>
): Promise<NextResponse | null> {
  try {
    await fn();
    return null; // no error
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "You have already voted on this poll" },
        { status: 409 }
      );
    }
    throw e; // re-throw anything else — Next.js catches and returns 500
  }
}

// ── IP hashing ────────────────────────────────────────────────────────────────
// Used for anonymous rate limiting only. Never for identification.
// If IP_HASH_SALT is unset: anonymous duplicate prevention is disabled.
// Authenticated users are protected by DB partial unique indexes (see prisma/setup-indexes.sql).

function hashIp(ip: string): string | null {
  const salt = process.env.IP_HASH_SALT;
  if (!salt || ip === "unknown") return null;
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 32);
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ── Visibility guard ─────────────────────────────────────────────────────────

async function enforceVisibility(
  poll: { visibility: string; campaignId: string | null },
  req: NextRequest
): Promise<NextResponse | null> {
  if (poll.visibility !== "campaign_only" || !poll.campaignId) return null;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required for this poll" }, { status: 401 });
  }
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId: poll.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

// ── POST /api/polls/[id]/respond ──────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Request body size guard — prevent large payload DoS
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 64_000) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Load poll + valid option IDs in one query
  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    include: { options: { select: { id: true } } },
  });

  if (!poll || !poll.isActive) {
    return NextResponse.json({ error: "Poll not found or closed" }, { status: 404 });
  }
  if (poll.endsAt && poll.endsAt < new Date()) {
    return NextResponse.json({ error: "Poll has ended" }, { status: 410 });
  }

  // Visibility enforcement
  const visibilityError = await enforceVisibility(poll, req);
  if (visibilityError) return visibilityError;

  const session = await getServerSession(authOptions);
  const sessionUserId = session?.user?.id ?? null;
  const ipHash = hashIp(getIp(req));
  const validOptionIds = new Set(poll.options.map((o) => o.id));

  // Geo fields — sanitized, not trusted for anything security-sensitive
  const postalCode = typeof body.postalCode === "string" ? body.postalCode.slice(0, 10) : null;
  const ward = typeof body.ward === "string" ? body.ward.slice(0, 100) : null;
  const riding = typeof body.riding === "string" ? body.riding.slice(0, 100) : null;

  // ── SWIPE / IMAGE_SWIPE ───────────────────────────────────────────────────
  if (poll.type === "swipe" || poll.type === "image_swipe") {
    const rawSwipe = Array.isArray(body.swipeResponses) ? body.swipeResponses : null;
    if (!rawSwipe || rawSwipe.length === 0) {
      return NextResponse.json({ error: "swipeResponses array required for swipe polls" }, { status: 422 });
    }

    // Validate each swipe entry strictly
    const validSwipes = rawSwipe.filter(
      (r): r is { optionId: string; direction: string } =>
        !!r &&
        typeof r === "object" &&
        typeof (r as any).optionId === "string" &&
        validOptionIds.has((r as any).optionId) && // must belong to this poll
        typeof (r as any).direction === "string" &&
        SWIPE_VALUES.has((r as any).direction) // only allowed directions
    );

    if (validSwipes.length === 0) {
      return NextResponse.json({ error: "No valid swipe responses (check optionId and direction values)" }, { status: 422 });
    }

    // Duplicate check: has this user/IP already responded to this poll?
    if (sessionUserId) {
      const existing = await prisma.pollResponse.findFirst({
        where: { pollId: params.id, userId: sessionUserId },
        select: { id: true },
      });
      if (existing) return NextResponse.json({ error: "You have already responded to this poll" }, { status: 409 });
    } else if (ipHash) {
      const existing = await prisma.pollResponse.findFirst({
        where: { pollId: params.id, ipHash },
        select: { id: true },
      });
      if (existing) return NextResponse.json({ error: "A response from this device/network was already recorded" }, { status: 409 });
    }

    // skipDuplicates: true is meaningful here for authenticated users:
    // The partial DB index "poll_responses_swipe_vote_uniq" (see prisma/setup-indexes.sql)
    // prevents duplicate (pollId, userId, optionId) rows. skipDuplicates silently ignores
    // any row that would violate it, rather than throwing. For anonymous users, it is inert.
    const swipeDupError = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.createMany({
          data: validSwipes.map((r) => ({
            pollId: params.id,
            userId: sessionUserId,
            optionId: r.optionId,
            value: r.direction,
            postalCode,
            ward,
            riding,
            ipHash,
          })),
          skipDuplicates: true,
        }),
        prisma.poll.update({
          where: { id: params.id },
          data: { totalResponses: { increment: 1 } },
        }),
      ]);
    });
    if (swipeDupError) return swipeDupError;

    return NextResponse.json({ data: { recorded: validSwipes.length } }, { status: 201 });
  }

  // ── RANKED ────────────────────────────────────────────────────────────────
  if (poll.type === "ranked") {
    const rawRanked = Array.isArray(body.rankedResponses) ? body.rankedResponses : null;
    if (!rawRanked || rawRanked.length === 0) {
      return NextResponse.json({ error: "rankedResponses array required for ranked polls" }, { status: 422 });
    }

    const validRanked = rawRanked.filter(
      (r): r is { optionId: string; rank: number } =>
        !!r &&
        typeof r === "object" &&
        typeof (r as any).optionId === "string" &&
        validOptionIds.has((r as any).optionId) &&
        typeof (r as any).rank === "number" &&
        Number.isInteger((r as any).rank) &&
        (r as any).rank >= 1 &&
        (r as any).rank <= validOptionIds.size // rank cannot exceed number of options
    );

    if (validRanked.length === 0) {
      return NextResponse.json({ error: "No valid ranked responses (check optionId and rank values)" }, { status: 422 });
    }

    if (sessionUserId) {
      const existing = await prisma.pollResponse.findFirst({
        where: { pollId: params.id, userId: sessionUserId },
        select: { id: true },
      });
      if (existing) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });
    } else if (ipHash) {
      const existing = await prisma.pollResponse.findFirst({
        where: { pollId: params.id, ipHash },
        select: { id: true },
      });
      if (existing) return NextResponse.json({ error: "A response from this device/network was already recorded" }, { status: 409 });
    }

    const rankedDupError = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.createMany({
          data: validRanked.map((r) => ({
            pollId: params.id,
            userId: sessionUserId,
            optionId: r.optionId,
            rank: r.rank,
            postalCode,
            ward,
            riding,
            ipHash,
          })),
          skipDuplicates: true, // DB partial index poll_responses_swipe_vote_uniq enforces uniqueness
        }),
        prisma.poll.update({
          where: { id: params.id },
          data: { totalResponses: { increment: 1 } },
        }),
      ]);
    });
    if (rankedDupError) return rankedDupError;

    return NextResponse.json({ data: { recorded: validRanked.length } }, { status: 201 });
  }

  // ── BINARY ────────────────────────────────────────────────────────────────
  if (poll.type === "binary") {
    const value = typeof body.value === "string" ? body.value.toLowerCase() : null;
    if (!value || !BINARY_VALUES.has(value)) {
      return NextResponse.json({ error: `value must be one of: ${[...BINARY_VALUES].join(", ")}` }, { status: 422 });
    }

    if (sessionUserId) {
      const existing = await prisma.pollResponse.findFirst({
        where: { pollId: params.id, userId: sessionUserId },
        select: { id: true },
      });
      if (existing) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });
    } else if (ipHash) {
      const existing = await prisma.pollResponse.findFirst({
        where: { pollId: params.id, ipHash },
        select: { id: true },
      });
      if (existing) return NextResponse.json({ error: "A response from this device/network was already recorded" }, { status: 409 });
    }

    const binaryDupError = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.create({
          data: { pollId: params.id, userId: sessionUserId, value, postalCode, ward, riding, ipHash },
        }),
        prisma.poll.update({ where: { id: params.id }, data: { totalResponses: { increment: 1 } } }),
      ]);
    });
    if (binaryDupError) return binaryDupError;

    return NextResponse.json({ data: { recorded: 1 } }, { status: 201 });
  }

  // ── MULTIPLE CHOICE ───────────────────────────────────────────────────────
  if (poll.type === "multiple_choice") {
    const optionId = typeof body.optionId === "string" ? body.optionId : null;
    if (!optionId) {
      return NextResponse.json({ error: "optionId required for multiple_choice polls" }, { status: 422 });
    }
    if (!validOptionIds.has(optionId)) {
      return NextResponse.json({ error: "optionId does not belong to this poll" }, { status: 422 });
    }

    if (sessionUserId) {
      const existing = await prisma.pollResponse.findFirst({
        where: { pollId: params.id, userId: sessionUserId },
        select: { id: true },
      });
      if (existing) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });
    } else if (ipHash) {
      const existing = await prisma.pollResponse.findFirst({
        where: { pollId: params.id, ipHash },
        select: { id: true },
      });
      if (existing) return NextResponse.json({ error: "A response from this device/network was already recorded" }, { status: 409 });
    }

    const mcDupError = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.create({
          data: { pollId: params.id, userId: sessionUserId, optionId, postalCode, ward, riding, ipHash },
        }),
        prisma.poll.update({ where: { id: params.id }, data: { totalResponses: { increment: 1 } } }),
      ]);
    });
    if (mcDupError) return mcDupError;

    return NextResponse.json({ data: { recorded: 1 } }, { status: 201 });
  }

  // ── SLIDER ────────────────────────────────────────────────────────────────
  if (poll.type === "slider") {
    const rawValue = body.value;
    const numericValue = typeof rawValue === "number"
      ? rawValue
      : typeof rawValue === "string"
      ? parseFloat(rawValue)
      : NaN;

    if (isNaN(numericValue) || numericValue < SLIDER_MIN || numericValue > SLIDER_MAX) {
      return NextResponse.json({
        error: `Slider value must be a number between ${SLIDER_MIN} and ${SLIDER_MAX}`,
      }, { status: 422 });
    }

    const value = String(Math.round(numericValue)); // store as integer string

    if (sessionUserId) {
      const existing = await prisma.pollResponse.findFirst({
        where: { pollId: params.id, userId: sessionUserId },
        select: { id: true },
      });
      if (existing) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });
    } else if (ipHash) {
      const existing = await prisma.pollResponse.findFirst({
        where: { pollId: params.id, ipHash },
        select: { id: true },
      });
      if (existing) return NextResponse.json({ error: "A response from this device/network was already recorded" }, { status: 409 });
    }

    const sliderDupError = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.create({
          data: { pollId: params.id, userId: sessionUserId, value, postalCode, ward, riding, ipHash },
        }),
        prisma.poll.update({ where: { id: params.id }, data: { totalResponses: { increment: 1 } } }),
      ]);
    });
    if (sliderDupError) return sliderDupError;

    return NextResponse.json({ data: { recorded: 1 } }, { status: 201 });
  }

  // Unknown poll type
  return NextResponse.json({ error: `Poll type "${poll.type}" does not support voting via this endpoint` }, { status: 422 });
}

// ── GET /api/polls/[id]/respond — results ─────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    include: {
      options: {
        include: { _count: { select: { responses: true } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const visibilityError = await enforceVisibility(poll, req);
  if (visibilityError) return visibilityError;

  if (poll.type === "binary") {
    const results = await prisma.pollResponse.groupBy({
      by: ["value"],
      where: { pollId: poll.id },
      _count: true,
    });
    return NextResponse.json({ data: { poll, results, type: "binary" } });
  }

  if (poll.type === "swipe" || poll.type === "image_swipe") {
    const results = await Promise.all(
      poll.options.map(async (opt) => {
        const breakdown = await prisma.pollResponse.groupBy({
          by: ["value"],
          where: { pollId: poll.id, optionId: opt.id },
          _count: true,
        });
        return { id: opt.id, text: (opt as any).text, order: (opt as any).order, breakdown };
      })
    );
    return NextResponse.json({ data: { poll, results, type: poll.type } });
  }

  if (poll.type === "multiple_choice") {
    const results = poll.options.map((o) => ({ ...o, count: o._count.responses }));
    return NextResponse.json({ data: { poll, results, type: "multiple_choice" } });
  }

  if (poll.type === "ranked") {
    const results = await Promise.all(
      poll.options.map(async (opt) => {
        const rows = await prisma.pollResponse.findMany({
          where: { pollId: poll.id, optionId: opt.id },
          select: { rank: true },
        });
        const validRanks = rows.map((r) => r.rank).filter((r): r is number => r !== null);
        const avgRank = validRanks.length > 0
          ? validRanks.reduce((a, b) => a + b, 0) / validRanks.length
          : null;
        return { id: opt.id, text: (opt as any).text, count: rows.length, avgRank };
      })
    );
    results.sort((a, b) => (a.avgRank ?? 999) - (b.avgRank ?? 999));
    return NextResponse.json({ data: { poll, results, type: "ranked" } });
  }

  if (poll.type === "slider") {
    const responses = await prisma.pollResponse.findMany({
      where: { pollId: poll.id },
      select: { value: true },
    });
    const values = responses
      .map((r) => parseFloat(r.value ?? ""))
      .filter((v) => !isNaN(v));
    const avg = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null;
    return NextResponse.json({
      data: { poll, results: { average: avg, count: values.length }, type: "slider" },
    });
  }

  return NextResponse.json({ data: { poll, results: [], type: poll.type } });
}

/*
 * RACE CONDITION — DOCUMENTED LIMITATION
 *
 * For authenticated users: application-layer findFirst + write is race-prone.
 * Two concurrent requests from the same session can both pass the duplicate check
 * before either commits. The partial unique indexes in prisma/setup-indexes.sql
 * provide a DB-level backstop:
 *   - poll_responses_single_vote_uniq: prevents duplicate (pollId, userId) where optionId IS NULL
 *   - poll_responses_swipe_vote_uniq:  prevents duplicate (pollId, userId, optionId) where both NOT NULL
 * If setup-indexes.sql has not been run, only app-layer protection exists.
 * George: run `npm run db:indexes` after `npx prisma db push`.
 *
 * For anonymous users: no DB backstop. ipHash check is app-layer only.
 * VPN users can bypass it. This is a known, accepted limitation.
 *
 * UNLISTED POLLS
 * Visibility "unlisted" = accessible to anyone with the poll ID.
 * There is no token or secret on the ID. It is not a private poll.
 * Only "campaign_only" provides access control.
 * Do not describe unlisted polls as private in any public-facing UI.
 */
