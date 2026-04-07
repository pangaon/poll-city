import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { enforceLimit } from "@/lib/rate-limit-redis";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limit: public form tier
  const limited = await enforceLimit(request, "publicForm");
  if (limited) return limited;

  const body = await request.json().catch(() => null);

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // Verify poll exists
  const poll = await prisma.poll.findUnique({ where: { id: params.id } });
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  const subscriber = await prisma.pollSubscriber.create({
    data: {
      pollId: params.id,
      email: parsed.data.email.trim(),
      phone: parsed.data.phone?.trim() || null,
    },
  });

  return NextResponse.json({ data: subscriber }, { status: 201 });
}
