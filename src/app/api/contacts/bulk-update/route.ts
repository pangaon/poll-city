import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  contactIds: z.array(z.string().min(1)).min(1, "At least one contact required").max(5000, "Maximum 5000 contacts per batch"),
  supportLevel: z.enum(["strong_support", "leaning_support", "undecided", "leaning_opposition", "strong_opposition", "unknown"]),
  campaignId: z.string().min(1, "campaignId is required"),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "contacts:write");
  if (permError) return permError;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = bulkUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const { contactIds, supportLevel, campaignId } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await prisma.contact.updateMany({
    where: { id: { in: contactIds }, campaignId },
    data: { supportLevel: supportLevel as any },
  });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "bulk_update",
      entityType: "contact",
      entityId: campaignId,
      details: { count: result.count, field: "supportLevel", value: supportLevel },
    },
  });

  return NextResponse.json({ data: { updated: result.count } });
}