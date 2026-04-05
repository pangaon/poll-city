import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { addSentimentSignal, type SignalType } from "@/lib/sentiment/approval-engine";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  type: z.enum(["poll_vote", "support_signal", "question_sentiment", "follow", "unfollow", "interaction"]),
  value: z.number().min(-1).max(1),
  source: z.string().min(1).max(50),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/officials/[id]/sentiment — receives a signal and triggers recalculation.
 * Rate-limited to prevent vote-stuffing (form tier: 5/hour/IP).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = rateLimit(req, "form");
  if (limited) return limited;

  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    await addSentimentSignal(
      params.id,
      parsed.data.type as SignalType,
      parsed.data.value,
      parsed.data.source,
      parsed.data.metadata
    );
    return NextResponse.json({ data: { recorded: true } });
  } catch (e) {
    console.error("[sentiment/post]", e);
    return NextResponse.json({ error: "Failed to record signal" }, { status: 500 });
  }
}
