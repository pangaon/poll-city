import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const bulkTagSchema = z.object({
  contactIds: z.array(z.string().min(1)).min(1).max(5000),
  tagIds: z.array(z.string().min(1)).min(1).max(50),
  campaignId: z.string().min(1, "campaignId is required"),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = bulkTagSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const { contactIds, tagIds, campaignId } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tagAssignments = contactIds.flatMap((contactId) =>
    tagIds.map((tagId) => ({ contactId, tagId })),
  );

  await prisma.contactTag.createMany({ data: tagAssignments, skipDuplicates: true });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "bulk_tag",
      entityType: "contact",
      entityId: campaignId,
      details: { contactCount: contactIds.length, tagCount: tagIds.length },
    },
  });

  return NextResponse.json({ data: { tagged: contactIds.length } });
}