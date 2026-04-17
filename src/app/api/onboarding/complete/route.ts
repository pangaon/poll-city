/**
 * POST /api/onboarding/complete
 *
 * Marks the campaign's onboarding wizard as complete.
 * Called when the user clicks "Go to Dashboard" on the final onboarding step.
 *
 * Guards: apiAuth + campaign membership.
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const NO_STORE = { "Cache-Control": "no-store" };

const bodySchema = z.object({
  campaignId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "campaignId is required" },
      { status: 422, headers: NO_STORE },
    );
  }

  const { campaignId } = parsed.data;

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { onboardingComplete: true },
  });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
