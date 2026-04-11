import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const household = await prisma.household.findUnique({
    where: { id: params.id },
    select: { id: true, campaignId: true, visited: true },
  });

  if (!household) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, household.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  let body: { visited?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.visited !== "boolean") {
    return NextResponse.json({ error: "visited boolean is required" }, { status: 422 });
  }

  const updated = await prisma.household.update({
    where: { id: params.id },
    data: {
      visited: body.visited,
      visitedAt: body.visited ? new Date() : null,
    },
    select: { id: true, visited: true, visitedAt: true },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: household.campaignId,
      userId: session!.user.id,
      action: "updated_household_visit_status",
      entityType: "household",
      entityId: household.id,
      details: {
        from: household.visited,
        to: updated.visited,
      },
    },
  });

  return NextResponse.json({ data: updated });
}
