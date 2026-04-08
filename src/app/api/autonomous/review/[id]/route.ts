import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { PollType } from "@prisma/client";

export const dynamic = "force-dynamic";

function mapPollType(rawType: string): PollType {
  const map: Record<string, PollType> = {
    binary: PollType.binary,
    multiple_choice: PollType.multiple_choice,
    nps: PollType.nps,
    slider: PollType.slider,
  };
  return map[rawType] ?? PollType.binary;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session.user as typeof session.user & { role?: string; id?: string };
  if (user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;
  const body = await req.json() as { action: "approve" | "reject"; notes?: string };
  const { action, notes } = body;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const content = await prisma.autonomousContent.findUnique({ where: { id } });
  if (!content) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (content.status !== "pending") {
    return NextResponse.json({ error: "Already reviewed" }, { status: 409 });
  }

  if (action === "reject") {
    await prisma.autonomousContent.update({
      where: { id },
      data: {
        status: "rejected",
        reviewNotes: notes ?? null,
        reviewedByUserId: user?.id ?? null,
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true, action: "rejected" });
  }

  // action === "approve"
  const extracted = content.extractedPoll as Record<string, unknown> | null;
  if (!extracted) {
    return NextResponse.json({ error: "No extracted poll data" }, { status: 422 });
  }

  const pollType = mapPollType(String(extracted.pollType ?? "binary"));
  const options = Array.isArray(extracted.options) ? (extracted.options as string[]) : [];
  const tags = Array.isArray(extracted.topicTags) ? (extracted.topicTags as string[]) : [];
  const targetRegion = typeof extracted.targetRegion === "string" ? extracted.targetRegion : null;

  // Create the Poll and options in a transaction
  const poll = await prisma.$transaction(async (tx) => {
    const newPoll = await tx.poll.create({
      data: {
        question: String(extracted.question ?? ""),
        type: pollType,
        visibility: "public",
        isActive: true,
        isFeatured: false,
        targetRegion: targetRegion,
        tags,
      },
    });

    if (pollType === PollType.multiple_choice && options.length > 0) {
      await tx.pollOption.createMany({
        data: options.map((text, index) => ({
          pollId: newPoll.id,
          text,
          order: index,
        })),
      });
    } else if (pollType === PollType.binary) {
      // Create default binary options
      await tx.pollOption.createMany({
        data: [
          { pollId: newPoll.id, text: "Yes", order: 0 },
          { pollId: newPoll.id, text: "No", order: 1 },
        ],
      });
    }

    return newPoll;
  });

  await prisma.autonomousContent.update({
    where: { id },
    data: {
      status: "published",
      pollId: poll.id,
      reviewNotes: notes ?? null,
      reviewedByUserId: user?.id ?? null,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, action: "approved", pollId: poll.id });
}
