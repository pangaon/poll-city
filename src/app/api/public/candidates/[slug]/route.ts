import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      slug: true,
      candidateName: true,
      candidateTitle: true,
      candidateBio: true,
      jurisdiction: true,
      electionType: true,
      logoUrl: true,
      primaryColor: true,
      isPublic: true,
      polls: {
        where: { isActive: true, visibility: "public" },
        select: {
          id: true,
          question: true,
          options: { select: { id: true, text: true } },
          responses: { select: { optionId: true } },
        },
      },
      _count: {
        select: {
          contacts: { where: { supportLevel: "strong_support" } },
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!campaign.isPublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const polls = campaign.polls.map((poll) => ({
    id: poll.id,
    question: poll.question,
    options: poll.options.map((option) => ({
      id: option.id,
      text: option.text,
      count: poll.responses.filter((r) => r.optionId === option.id).length,
      percentage:
        poll.responses.length > 0
          ? Math.round(
              (poll.responses.filter((r) => r.optionId === option.id).length /
                poll.responses.length) *
                100
            )
          : 0,
    })),
  }));

  return NextResponse.json({
    id: campaign.id,
    slug: campaign.slug,
    candidateName: campaign.candidateName,
    candidateTitle: campaign.candidateTitle,
    candidateBio: campaign.candidateBio,
    jurisdiction: campaign.jurisdiction,
    electionType: campaign.electionType,
    logoUrl: campaign.logoUrl,
    primaryColor: campaign.primaryColor,
    supporterCount: campaign._count.contacts,
    polls,
  });
}
