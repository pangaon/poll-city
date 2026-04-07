import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const agmVoteSchema = z.object({
  resolutionId: z.string().min(1, "resolutionId is required"),
  vote: z.enum(["for", "against", "abstain"]),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = agmVoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const resolution = await prisma.partyResolution.findFirst({
    where: { id: parsed.data.resolutionId, agmId: params.id },
  });

  if (!resolution) {
    return NextResponse.json({ error: "Resolution not found in this AGM" }, { status: 404 });
  }

  if (resolution.status !== "pending") {
    return NextResponse.json({ error: "Resolution is no longer open for voting" }, { status: 400 });
  }

  const field = parsed.data.vote === "for" ? "votesFor" : parsed.data.vote === "against" ? "votesAgainst" : "votesAbstain";

  const updated = await prisma.partyResolution.update({
    where: { id: parsed.data.resolutionId },
    data: { [field]: { increment: 1 } },
  });

  return NextResponse.json({ resolution: updated });
}
