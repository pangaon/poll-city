import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { mergeAlertsIntoIssue } from "@/lib/reputation/issue-engine";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string(),
  alertIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { campaignId, alertIds } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  await mergeAlertsIntoIssue(params.id, campaignId, alertIds);
  return NextResponse.json({ ok: true });
}
