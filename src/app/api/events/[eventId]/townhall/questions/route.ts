import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    select: { isTownhall: true },
  });
  if (!event || !event.isTownhall) {
    return NextResponse.json({ error: "Event not found or not a townhall" }, { status: 404 });
  }

  const questions = await prisma.townhallQuestion.findMany({
    where: { eventId: params.eventId, isHidden: false },
    orderBy: [{ isAnswered: "asc" }, { upvotes: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ data: questions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    select: { isTownhall: true, maxQuestions: true, townhallStatus: true },
  });

  if (!event || !event.isTownhall) {
    return NextResponse.json({ error: "Event not found or not a townhall" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    text?: string;
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const name = body.name?.trim();
  const text = body.text?.trim();
  const email = body.email?.trim() || null;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Question text is required" }, { status: 400 });
  if (text.length > 280)
    return NextResponse.json({ error: "Question must be 280 characters or fewer" }, { status: 400 });

  if (event.maxQuestions) {
    const count = await prisma.townhallQuestion.count({
      where: { eventId: params.eventId, isHidden: false },
    });
    if (count >= event.maxQuestions) {
      return NextResponse.json({ error: "Question limit reached" }, { status: 429 });
    }
  }

  const question = await prisma.townhallQuestion.create({
    data: {
      eventId: params.eventId,
      askedByName: name,
      askedByEmail: email,
      text,
    },
  });

  return NextResponse.json({ data: question }, { status: 201 });
}
