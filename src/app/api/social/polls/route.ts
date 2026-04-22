import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const CreateCommunityPollSchema = z.object({
  question: z.string().min(5).max(500),
  type: z.enum(["binary", "multiple_choice"]),
  options: z.array(z.string().min(1).max(200)).min(2).max(6).optional(),
  targetRegion: z.string().max(100).optional().nullable(),
  durationDays: z.number().int().min(1).max(30).optional().default(7),
});

/**
 * POST /api/social/polls
 * Creates a community poll on behalf of the signed-in voter.
 */
export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to create polls" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateCommunityPollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  if (data.type === "multiple_choice" && (!data.options || data.options.length < 2)) {
    return NextResponse.json(
      { error: "Multiple choice polls require at least 2 options" },
      { status: 422 }
    );
  }

  // Auto-resolve targetRegion from CivicProfile if caller did not provide one
  let targetRegion = data.targetRegion ?? null;
  if (!targetRegion) {
    const profile = await prisma.civicProfile.findUnique({
      where: { userId: session.user.id },
      select: { municipality: true },
    });
    targetRegion = profile?.municipality ?? null;
  }

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + (data.durationDays ?? 7));

  const poll = await prisma.poll.create({
    data: {
      question: data.question,
      type: data.type as "binary" | "multiple_choice",
      visibility: "public",
      createdByUserId: session.user.id,
      targetRegion,
      endsAt,
      isActive: true,
      ...(data.type === "multiple_choice" && data.options
        ? {
            options: {
              create: data.options.map((text, idx) => ({ text: text.trim(), order: idx })),
            },
          }
        : {}),
    },
    include: { options: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ data: poll }, { status: 201 });
}
