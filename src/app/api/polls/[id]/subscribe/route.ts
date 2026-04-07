import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => null) as {
    email?: string; pushToken?: string; phone?: string;
  } | null;

  if (!body?.email && !body?.pushToken && !body?.phone) {
    return NextResponse.json({ error: "email, pushToken, or phone required" }, { status: 400 });
  }

  // Verify poll exists
  const poll = await prisma.poll.findUnique({ where: { id: params.id } });
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  const subscriber = await prisma.pollSubscriber.create({
    data: {
      pollId: params.id,
      email: body.email?.trim() || null,
      pushToken: body.pushToken || null,
      phone: body.phone?.trim() || null,
    },
  });

  return NextResponse.json({ data: subscriber }, { status: 201 });
}
