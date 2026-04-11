/**
 * POST /api/election-night/call-race — The campaign manager calls the race.
 *
 * This is the moment. Win or loss. The most emotional button in the platform.
 * After this, the entire UI transforms:
 * - Win: celebration mode, thank-you prompts, volunteer recognition
 * - Loss: graceful acknowledgment, lessons learned, financial filing reminder
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const { campaignId, result, finalVoteCount, opponentVoteCount, notes } = await req.json();
  if (!result) {
    return NextResponse.json({ error: "campaignId and result (won/lost) required" }, { status: 400 });
  }

  if (!["won", "lost"].includes(result)) {
    return NextResponse.json({ error: "result must be 'won' or 'lost'" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden) return forbidden;

  // Store the result in campaign customization
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      customization: {
        electionResult: result,
        calledAt: new Date().toISOString(),
        calledBy: session!.user.id,
        finalVoteCount: finalVoteCount ?? null,
        opponentVoteCount: opponentVoteCount ?? null,
        notes: notes ?? null,
      } as object,
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: result === "won" ? "election_won" : "election_lost",
      entityType: "Campaign",
      entityId: campaignId,
      details: {
        result,
        finalVoteCount,
        opponentVoteCount,
        notes,
        calledAt: new Date().toISOString(),
      },
    },
  });

  const message = result === "won"
    ? "Congratulations. You did it. Every door knocked, every call made, every volunteer shift — it all led to this moment. Time to celebrate and then serve your community."
    : "The campaign is over but the work is not wasted. Every conversation you had made your community more engaged. File your financial return, thank your volunteers personally, and know that running was an act of courage.";

  const nextSteps = result === "won"
    ? [
        "Send thank-you messages to every volunteer within 24 hours",
        "Send thank-you notes to every donor",
        "File your financial return (due within 90 days)",
        "Transition to your constituent CRM for casework",
      ]
    : [
        "Call your opponent and congratulate them gracefully",
        "Send personal thank-you messages to every volunteer",
        "Send thank-you notes to every donor",
        "File your financial return (due within 90 days)",
        "Take a week off. You earned it.",
      ];

  return NextResponse.json({
    ok: true,
    result,
    message,
    nextSteps,
  });
}
