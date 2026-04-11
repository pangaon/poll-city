import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:read");
  if (forbidden) return forbidden;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId! },
    select: {
      id: true,
      name: true,
      candidateName: true,
      candidateTitle: true,
      candidateBio: true,
      candidateEmail: true,
      candidatePhone: true,
      electionType: true,
      jurisdiction: true,
      electionDate: true,
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const campaignId = typeof body.campaignId === "string" ? body.campaignId : null;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden) return forbidden;

  const patch: Record<string, unknown> = {};

  const strField = (key: string, max = 200) => {
    const v = body[key];
    if (typeof v === "string") patch[key] = v.trim().slice(0, max) || null;
  };

  strField("name", 100);
  strField("candidateName", 100);
  strField("candidateTitle", 100);
  strField("candidateBio", 1000);
  strField("candidateEmail", 200);
  strField("candidatePhone", 30);
  strField("electionType", 50);
  strField("jurisdiction", 100);

  if (typeof body.electionDate === "string" && body.electionDate) {
    const d = new Date(body.electionDate);
    if (!isNaN(d.getTime())) patch.electionDate = d;
  } else if (body.electionDate === null || body.electionDate === "") {
    patch.electionDate = null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId! },
    data: patch,
    select: {
      id: true,
      name: true,
      candidateName: true,
      candidateTitle: true,
      candidateBio: true,
      candidateEmail: true,
      candidatePhone: true,
      electionType: true,
      jurisdiction: true,
      electionDate: true,
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: campaignId!,
      userId: session!.user.id,
      action: "campaign_profile_updated",
      entityType: "Campaign",
      entityId: campaignId!,
      details: patch as object,
    },
  });

  return NextResponse.json({ campaign: updated });
}
