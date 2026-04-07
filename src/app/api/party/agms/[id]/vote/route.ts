import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();

  if (!body.resolutionId || !body.vote) {
    return NextResponse.json({ error: "resolutionId and vote (for|against|abstain) are required" }, { status: 400 });
  }

  if (!["for", "against", "abstain"].includes(body.vote)) {
    return NextResponse.json({ error: "vote must be for, against, or abstain" }, { status: 400 });
  }

  const resolution = await prisma.partyResolution.findFirst({
    where: { id: body.resolutionId, agmId: params.id },
  });

  if (!resolution) {
    return NextResponse.json({ error: "Resolution not found in this AGM" }, { status: 404 });
  }

  if (resolution.status !== "pending") {
    return NextResponse.json({ error: "Resolution is no longer open for voting" }, { status: 400 });
  }

  const field = body.vote === "for" ? "votesFor" : body.vote === "against" ? "votesAgainst" : "votesAbstain";

  const updated = await prisma.partyResolution.update({
    where: { id: body.resolutionId },
    data: { [field]: { increment: 1 } },
  });

  return NextResponse.json({ resolution: updated });
}
