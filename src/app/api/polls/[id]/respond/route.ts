import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { rateLimit } from "@/lib/rate-limit";
import { anomaly } from "@/lib/security/anomaly";

// ── Constants ─────────────────────────────────────────────────────────────────

const BINARY_VALUES = new Set(["yes", "no"]);
const SWIPE_VALUES = new Set(["left", "right", "up", "skip"]);
const SLIDER_MIN = 0;
const SLIDER_MAX = 100;
const CREDITS_FOR_POLL_VOTE = 10;

// ── Civic credit award ────────────────────────────────────────────────────────
// Called after every successful vote for authenticated users.
// Fire-and-forget: failure here does NOT fail the vote response.
async function awardPollCredits(userId: string, pollId: string): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.voterPassport.upsert({
        where:  { userId },
        create: {
          userId,
          credits:          CREDITS_FOR_POLL_VOTE,
          pollsParticipated: 1,
          badges:           [],
        },
        update: {
          credits:          { increment: CREDITS_FOR_POLL_VOTE },
          pollsParticipated: { increment: 1 },
        },
      }),
      prisma.civicCredit.create({
        data: {
          userId,
          action:      "poll_voted",
          credits:     CREDITS_FOR_POLL_VOTE,
          description: `Voted on poll: ${pollId}`,
        },
      }),
    ]);
  } catch {
    // Non-fatal — vote already recorded, credits will be missing but that's recoverable
  }
}


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

// ── Anonymous polling helpers ─────────────────────────────────────────────────
// voteHash = SHA-256(pollId + identifier + POLL_ANONYMITY_SALT)
// This hash prevents double-voting without storing voter identity.
// It cannot be reversed to find the voter.

function generateVoteHash(pollId: string, identifier: string): string {
  const salt = process.env.POLL_ANONYMITY_SALT ?? process.env.NEXTAUTH_SECRET ?? "poll-city-anon";
  return createHash("sha256").update(`vote:${pollId}:${identifier}:${salt}`).digest("hex");
}

// receiptHash — given to voter so they can verify their vote was counted.
// SHA-256(pollId + random nonce). Nonce is shown to voter; hash is stored.
function generateReceipt(pollId: string): { receiptCode: string; receiptHash: string } {
  const nonce = createHash("sha256")
    .update(`${pollId}:${Date.now()}:${Math.random()}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  const receiptCode = `${nonce.slice(0, 4)}-${nonce.slice(4, 8)}-${nonce.slice(8, 12)}`;
  const receiptHash = createHash("sha256").update(`receipt:${receiptCode}`).digest("hex");
  return { receiptCode, receiptHash };
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

  const limited = await rateLimit(req, "form");
  if (limited) return limited;

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
  const ip = getIp(req);
  const ipHash = hashIp(ip);

  // Anomaly: track rapid voting from the same IP
  if (ip !== "unknown") anomaly.rapidPollVote(ip);

  // Anonymous vote hash: prevents double-voting without storing identity.
  // If we have neither a session userId nor a hashed IP, we cannot reliably
  // identify the voter — reject rather than issuing a timestamp-based identifier
  // that would allow the same browser to vote unlimited times.
  if (!sessionUserId && !ipHash) {
    return NextResponse.json(
      { error: "Unable to record vote: IP_HASH_SALT is not configured on this server." },
      { status: 503 }
    );
  }
  const voterIdentifier = sessionUserId ?? ipHash!;
  const voteHash = generateVoteHash(params.id, voterIdentifier);
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
      (r): r is { optionId: string; direction: string } => {
        if (!r || typeof r !== "object") return false;
        const entry = r as Record<string, unknown>;
        return (
          typeof entry.optionId === "string" &&
          validOptionIds.has(entry.optionId) &&
          typeof entry.direction === "string" &&
          SWIPE_VALUES.has(entry.direction)
        );
      }
    );

    if (validSwipes.length === 0) {
      return NextResponse.json({ error: "No valid swipe responses (check optionId and direction values)" }, { status: 422 });
    }

    // Anonymous duplicate check via one-way hash
    const existingVote = await prisma.pollResponse.findUnique({ where: { voteHash }, select: { id: true } });
    if (existingVote) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });

    const receipt = generateReceipt(params.id);

    const swipeDupError = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.createMany({
          data: validSwipes.map((r, idx) => ({
            pollId: params.id,
            optionId: r.optionId,
            value: r.direction,
            voteHash: idx === 0 ? voteHash : null,
            receiptHash: idx === 0 ? receipt.receiptHash : null,
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

    if (sessionUserId) void awardPollCredits(sessionUserId, params.id);
    return NextResponse.json({ data: { recorded: validSwipes.length, receipt: receipt.receiptCode } }, { status: 201 });
  }

  // ── RANKED ────────────────────────────────────────────────────────────────
  if (poll.type === "ranked") {
    const rawRanked = Array.isArray(body.rankedResponses) ? body.rankedResponses : null;
    if (!rawRanked || rawRanked.length === 0) {
      return NextResponse.json({ error: "rankedResponses array required for ranked polls" }, { status: 422 });
    }

    const validRanked = rawRanked.filter(
      (r): r is { optionId: string; rank: number } => {
        if (!r || typeof r !== "object") return false;
        const entry = r as Record<string, unknown>;
        return (
          typeof entry.optionId === "string" &&
          validOptionIds.has(entry.optionId) &&
          typeof entry.rank === "number" &&
          Number.isInteger(entry.rank) &&
          entry.rank >= 1 &&
          entry.rank <= validOptionIds.size
        );
      }
    );

    if (validRanked.length === 0) {
      return NextResponse.json({ error: "No valid ranked responses (check optionId and rank values)" }, { status: 422 });
    }

    // Anonymous duplicate check via one-way hash
    const existingVote = await prisma.pollResponse.findUnique({ where: { voteHash }, select: { id: true } });
    if (existingVote) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });

    const receipt = generateReceipt(params.id);

    const rankedDupError = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.createMany({
          data: validRanked.map((r, idx) => ({
            pollId: params.id,
            optionId: r.optionId,
            rank: r.rank,
            voteHash: idx === 0 ? voteHash : null,
            receiptHash: idx === 0 ? receipt.receiptHash : null,
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
    if (rankedDupError) return rankedDupError;

    if (sessionUserId) void awardPollCredits(sessionUserId, params.id);
    return NextResponse.json({ data: { recorded: validRanked.length, receipt: receipt.receiptCode } }, { status: 201 });
  }

  // ── BINARY ────────────────────────────────────────────────────────────────
  if (poll.type === "binary") {
    const value = typeof body.value === "string" ? body.value.toLowerCase() : null;
    if (!value || !BINARY_VALUES.has(value)) {
      return NextResponse.json({ error: `value must be one of: ${Array.from(BINARY_VALUES).join(", ")}` }, { status: 422 });
    }

    // Anonymous duplicate check via one-way hash
    const existingVote = await prisma.pollResponse.findUnique({ where: { voteHash }, select: { id: true } });
    if (existingVote) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });

    const receipt = generateReceipt(params.id);

    const binaryDupError = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.create({
          data: { pollId: params.id, voteHash, receiptHash: receipt.receiptHash, value, postalCode, ward, riding, ipHash },
        }),
        prisma.poll.update({ where: { id: params.id }, data: { totalResponses: { increment: 1 } } }),
      ]);
    });
    if (binaryDupError) return binaryDupError;

    if (sessionUserId) void awardPollCredits(sessionUserId, params.id);
    return NextResponse.json({ data: { recorded: 1, receipt: receipt.receiptCode } }, { status: 201 });
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

    // Anonymous duplicate check via one-way hash
    const existingVote = await prisma.pollResponse.findUnique({ where: { voteHash }, select: { id: true } });
    if (existingVote) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });

    const receipt = generateReceipt(params.id);

    const mcDupError = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.create({
          data: { pollId: params.id, voteHash, receiptHash: receipt.receiptHash, optionId, postalCode, ward, riding, ipHash },
        }),
        prisma.poll.update({ where: { id: params.id }, data: { totalResponses: { increment: 1 } } }),
      ]);
    });
    if (mcDupError) return mcDupError;

    if (sessionUserId) void awardPollCredits(sessionUserId, params.id);
    return NextResponse.json({ data: { recorded: 1, receipt: receipt.receiptCode } }, { status: 201 });
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

    // Anonymous duplicate check via one-way hash
    const existingVote = await prisma.pollResponse.findUnique({ where: { voteHash }, select: { id: true } });
    if (existingVote) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });

    const receipt = generateReceipt(params.id);

    const sliderDupError = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.create({
          data: { pollId: params.id, voteHash, receiptHash: receipt.receiptHash, value, postalCode, ward, riding, ipHash },
        }),
        prisma.poll.update({ where: { id: params.id }, data: { totalResponses: { increment: 1 } } }),
      ]);
    });
    if (sliderDupError) return sliderDupError;

    if (sessionUserId) void awardPollCredits(sessionUserId, params.id);
    return NextResponse.json({ data: { recorded: 1, receipt: receipt.receiptCode } }, { status: 201 });
  }

  // ── NPS ───────────────────────────────────────────────────────────────────
  if (poll.type === "nps") {
    const rawValue = body.value;
    const numericValue = typeof rawValue === "number" ? rawValue : typeof rawValue === "string" ? parseInt(rawValue, 10) : NaN;
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 10) {
      return NextResponse.json({ error: "NPS value must be an integer 0-10" }, { status: 422 });
    }
    const value = String(numericValue);
    const existingVote = await prisma.pollResponse.findUnique({ where: { voteHash }, select: { id: true } });
    if (existingVote) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });
    const receipt = generateReceipt(params.id);
    const err = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.create({
          data: { pollId: params.id, voteHash, receiptHash: receipt.receiptHash, value, postalCode, ward, riding, ipHash },
        }),
        prisma.poll.update({ where: { id: params.id }, data: { totalResponses: { increment: 1 } } }),
      ]);
    });
    if (err) return err;
    if (sessionUserId) void awardPollCredits(sessionUserId, params.id);
    return NextResponse.json({ data: { recorded: 1, receipt: receipt.receiptCode } }, { status: 201 });
  }

  // ── WORD CLOUD ────────────────────────────────────────────────────────────
  if (poll.type === "word_cloud") {
    const rawWords = Array.isArray(body.words) ? body.words : null;
    if (!rawWords || rawWords.length === 0) {
      return NextResponse.json({ error: "words array required for word_cloud polls" }, { status: 422 });
    }
    const cleaned = rawWords
      .filter((w): w is string => typeof w === "string")
      .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30))
      .filter((w) => w.length >= 2)
      .slice(0, 3);
    if (cleaned.length === 0) {
      return NextResponse.json({ error: "No valid words after sanitization" }, { status: 422 });
    }
    const existingVote = await prisma.pollResponse.findUnique({ where: { voteHash }, select: { id: true } });
    if (existingVote) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });
    const receipt = generateReceipt(params.id);
    const err = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.create({
          data: { pollId: params.id, voteHash, receiptHash: receipt.receiptHash, value: cleaned.join(","), postalCode, ward, riding, ipHash },
        }),
        prisma.poll.update({ where: { id: params.id }, data: { totalResponses: { increment: 1 } } }),
        ...cleaned.map((word) =>
          prisma.wordCloudEntry.upsert({
            where: { pollId_word: { pollId: params.id, word } },
            create: { pollId: params.id, word, count: 1 },
            update: { count: { increment: 1 } },
          })
        ),
      ]);
    });
    if (err) return err;
    if (sessionUserId) void awardPollCredits(sessionUserId, params.id);
    return NextResponse.json({ data: { recorded: cleaned.length, receipt: receipt.receiptCode } }, { status: 201 });
  }

  // ── TIMELINE / RADAR ──────────────────────────────────────────────────────
  if (poll.type === "timeline_radar") {
    const rawRatings = Array.isArray(body.ratings) ? body.ratings : null;
    if (!rawRatings || rawRatings.length === 0) {
      return NextResponse.json({ error: "ratings array required for timeline_radar polls" }, { status: 422 });
    }
    const validRatings = rawRatings.filter(
      (r): r is { optionId: string; value: number } => {
        if (!r || typeof r !== "object") return false;
        const e = r as Record<string, unknown>;
        return typeof e.optionId === "string" && validOptionIds.has(e.optionId) &&
          typeof e.value === "number" && e.value >= 0 && e.value <= 10;
      }
    );
    if (validRatings.length === 0) {
      return NextResponse.json({ error: "No valid ratings (check optionId and value 0-10)" }, { status: 422 });
    }
    const existingVote = await prisma.pollResponse.findUnique({ where: { voteHash }, select: { id: true } });
    if (existingVote) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });
    const receipt = generateReceipt(params.id);
    const err = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.createMany({
          data: validRatings.map((r, idx) => ({
            pollId: params.id,
            optionId: r.optionId,
            value: String(Math.round(r.value)),
            voteHash: idx === 0 ? voteHash : null,
            receiptHash: idx === 0 ? receipt.receiptHash : null,
            postalCode, ward, riding, ipHash,
          })),
          skipDuplicates: true,
        }),
        prisma.poll.update({ where: { id: params.id }, data: { totalResponses: { increment: 1 } } }),
      ]);
    });
    if (err) return err;
    if (sessionUserId) void awardPollCredits(sessionUserId, params.id);
    return NextResponse.json({ data: { recorded: validRatings.length, receipt: receipt.receiptCode } }, { status: 201 });
  }

  // ── EMOJI REACT (select one emoji option) ────────────────────────────────
  if (poll.type === "emoji_react") {
    const optionId = typeof body.optionId === "string" ? body.optionId : null;
    if (!optionId) {
      return NextResponse.json({ error: "optionId required for emoji_react polls" }, { status: 422 });
    }
    if (!validOptionIds.has(optionId)) {
      return NextResponse.json({ error: "optionId does not belong to this poll" }, { status: 422 });
    }
    const existingVote = await prisma.pollResponse.findUnique({ where: { voteHash }, select: { id: true } });
    if (existingVote) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });
    const receipt = generateReceipt(params.id);
    const err = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.create({
          data: { pollId: params.id, voteHash, receiptHash: receipt.receiptHash, optionId, postalCode, ward, riding, ipHash },
        }),
        prisma.poll.update({ where: { id: params.id }, data: { totalResponses: { increment: 1 } } }),
      ]);
    });
    if (err) return err;
    if (sessionUserId) void awardPollCredits(sessionUserId, params.id);
    return NextResponse.json({ data: { recorded: 1, receipt: receipt.receiptCode } }, { status: 201 });
  }

  // ── PRIORITY RANK (drag-to-order priority selection) ─────────────────────
  if (poll.type === "priority_rank") {
    const rawRanked = Array.isArray(body.rankedResponses) ? body.rankedResponses : null;
    if (!rawRanked || rawRanked.length === 0) {
      return NextResponse.json({ error: "rankedResponses array required for priority_rank polls" }, { status: 422 });
    }
    const validRanked = rawRanked.filter(
      (r): r is { optionId: string; rank: number } => {
        if (!r || typeof r !== "object") return false;
        const entry = r as Record<string, unknown>;
        return (
          typeof entry.optionId === "string" &&
          validOptionIds.has(entry.optionId) &&
          typeof entry.rank === "number" &&
          Number.isInteger(entry.rank) &&
          entry.rank >= 1 &&
          entry.rank <= validOptionIds.size
        );
      }
    );
    if (validRanked.length === 0) {
      return NextResponse.json({ error: "No valid ranked responses (check optionId and rank values)" }, { status: 422 });
    }
    const existingVote = await prisma.pollResponse.findUnique({ where: { voteHash }, select: { id: true } });
    if (existingVote) return NextResponse.json({ error: "You have already voted on this poll" }, { status: 409 });
    const receipt = generateReceipt(params.id);
    const err = await runWithDuplicateProtection(async () => {
      await prisma.$transaction([
        prisma.pollResponse.createMany({
          data: validRanked.map((r, idx) => ({
            pollId: params.id,
            optionId: r.optionId,
            rank: r.rank,
            voteHash: idx === 0 ? voteHash : null,
            receiptHash: idx === 0 ? receipt.receiptHash : null,
            postalCode, ward, riding, ipHash,
          })),
          skipDuplicates: true,
        }),
        prisma.poll.update({ where: { id: params.id }, data: { totalResponses: { increment: 1 } } }),
      ]);
    });
    if (err) return err;
    if (sessionUserId) void awardPollCredits(sessionUserId, params.id);
    return NextResponse.json({ data: { recorded: validRanked.length, receipt: receipt.receiptCode } }, { status: 201 });
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
        return { id: opt.id, text: opt.text, order: opt.order, breakdown };
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
        return { id: opt.id, text: opt.text, count: rows.length, avgRank };
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

  if (poll.type === "nps") {
    const rows = await prisma.pollResponse.findMany({
      where: { pollId: poll.id },
      select: { value: true },
    });
    const vals = rows.map((r) => parseInt(r.value ?? "0", 10)).filter((v) => !isNaN(v));
    const promoters = vals.filter((v) => v >= 9).length;
    const passives = vals.filter((v) => v >= 7 && v <= 8).length;
    const detractors = vals.filter((v) => v <= 6).length;
    const npsScore = vals.length > 0 ? Math.round(((promoters - detractors) / vals.length) * 100) : 0;
    return NextResponse.json({
      data: { poll, results: { promoters, passives, detractors, npsScore, total: vals.length }, type: "nps" },
    });
  }

  if (poll.type === "word_cloud") {
    const entries = await prisma.wordCloudEntry.findMany({
      where: { pollId: poll.id },
      orderBy: { count: "desc" },
      take: 50,
    });
    return NextResponse.json({ data: { poll, results: entries, type: "word_cloud" } });
  }

  if (poll.type === "emoji_react") {
    const results = poll.options.map((o) => ({ ...o, count: o._count.responses }));
    return NextResponse.json({ data: { poll, results, type: "emoji_react" } });
  }

  if (poll.type === "priority_rank") {
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
        return { id: opt.id, text: opt.text, count: rows.length, avgRank };
      })
    );
    results.sort((a, b) => (a.avgRank ?? 999) - (b.avgRank ?? 999));
    return NextResponse.json({ data: { poll, results, type: "priority_rank" } });
  }

  if (poll.type === "timeline_radar") {
    const results = await Promise.all(
      poll.options.map(async (opt) => {
        const rows = await prisma.pollResponse.findMany({
          where: { pollId: poll.id, optionId: opt.id },
          select: { value: true },
        });
        const vals = rows.map((r) => parseFloat(r.value ?? "")).filter((v) => !isNaN(v));
        const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        return { id: opt.id, text: opt.text, avgValue: avg, count: vals.length };
      })
    );
    return NextResponse.json({ data: { poll, results, type: "timeline_radar" } });
  }

  return NextResponse.json({ data: { poll, results: [], type: poll.type } });
}

/*
 * RACE CONDITION — DOCUMENTED LIMITATION
 *
 * Anonymous polling uses a voteHash (SHA-256 of pollId + voter identifier + salt)
 * stored in a unique column on PollResponse. This provides a DB-level backstop
 * against duplicate votes for both authenticated and anonymous users.
 *
 * The app-layer findUnique check before the write is still race-prone:
 * two concurrent requests can both pass the check before either commits.
 * The unique constraint on voteHash catches this at the DB level, and
 * runWithDuplicateProtection converts the P2002 error into a 409 response.
 *
 * For multi-row poll types (swipe, ranked), only the first row carries the
 * voteHash. This is sufficient because the duplicate check runs before the
 * transaction, and the unique constraint prevents a second batch from inserting
 * a row with the same voteHash.
 *
 * Voter receipts (receiptCode shown to user, receiptHash stored in DB) allow
 * voters to verify their vote was recorded without revealing their identity.
 *
 * UNLISTED POLLS
 * Visibility "unlisted" = accessible to anyone with the poll ID.
 * There is no token or secret on the ID. It is not a private poll.
 * Only "campaign_only" provides access control.
 * Do not describe unlisted polls as private in any public-facing UI.
 */
