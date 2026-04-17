import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string(),
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  trigger: z.enum(["contact_created", "tag_added", "segment_joined", "donation_made", "event_rsvped", "form_submitted", "manual"]),
  triggerFilter: z.record(z.unknown()).optional(),
  enrollOnce: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const rules = await prisma.automationRule.findMany({
    where: { campaignId: campaignId! },
    include: {
      steps: { orderBy: { stepOrder: "asc" } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { campaignId, triggerFilter, ...rest } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:write");
  if (forbidden) return forbidden;

  const rule = await prisma.automationRule.create({
    data: {
      campaignId,
      createdByUserId: session!.user.id,
      triggerFilter: (triggerFilter ?? {}) as object,
      ...rest,
    },
    include: { steps: true },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
