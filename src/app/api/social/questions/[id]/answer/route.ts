import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const AnswerSchema = z.object({
  answer: z.string().min(1).max(5000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const activeCampaignId = session!.user.activeCampaignId as string | null;
  if (!activeCampaignId) {
    return NextResponse.json({ error: "No active campaign" }, { status: 403 });
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  // Load the question
  const question = await prisma.publicQuestion.findUnique({
    where: { id: params.id },
    select: { id: true, officialId: true, userId: true, answer: true },
  });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Verify the active campaign is linked to this question's official
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: activeCampaignId,
      officialId: question.officialId,
      isActive: true,
      memberships: { some: { userId: session!.user.id } },
    },
    select: { id: true, candidateName: true, name: true },
  });

  if (!campaign) {
    return NextResponse.json(
      { error: "Your active campaign is not linked to this official" },
      { status: 403 }
    );
  }

  // Write the answer and send notification in one transaction
  const [updated] = await prisma.$transaction([
    prisma.publicQuestion.update({
      where: { id: params.id },
      data: { answer: parsed.data.answer, answeredAt: new Date() },
      select: {
        id: true,
        question: true,
        answer: true,
        answeredAt: true,
        officialId: true,
        userId: true,
      },
    }),
    prisma.socialNotification.create({
      data: {
        userId: question.userId,
        officialId: question.officialId,
        type: "qa_answered",
        title: "Your question was answered",
        body: `${campaign.candidateName ?? campaign.name} answered your question.`,
      },
    }),
  ]);

  return NextResponse.json({ data: updated }, { status: 200 });
}
