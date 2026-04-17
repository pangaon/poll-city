import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { buildOutreachEmail } from "@/lib/fuel/outreach-sequences";
import { sendOutreachEmail } from "@/lib/fuel/email-transport";

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  campaignId: z.string().min(1),
  vendorId: z.string().min(1),
  step: z.enum(["initial", "follow_up_1", "follow_up_2"]),
  notes: z.string().max(2000).nullish(),
});

const updateStatusSchema = z.object({
  campaignId: z.string().min(1),
  logId: z.string().min(1),
  status: z.enum(["replied", "bounced", "not_interested", "opened", "clicked"]),
  notes: z.string().max(2000).nullish(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status");
  const vendorId = req.nextUrl.searchParams.get("vendorId");

  const logs = await prisma.vendorOutreachLog.findMany({
    where: {
      campaignId,
      ...(status ? { status: status as never } : {}),
      ...(vendorId ? { vendorId } : {}),
    },
    include: {
      vendor: { select: { id: true, name: true, email: true, city: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ data: logs });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);

  // Determine action type
  if (raw?.action === "update_status") {
    const parsed = updateStatusSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const body = parsed.data;

    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tsField: Record<string, string> = {
      replied: "repliedAt",
      bounced: "bouncedAt",
      opened: "openedAt",
      clicked: "clickedAt",
    };

    const updated = await prisma.vendorOutreachLog.update({
      where: { id: body.logId },
      data: {
        status: body.status,
        notes: body.notes ?? undefined,
        ...(tsField[body.status] ? { [tsField[body.status]]: new Date() } : {}),
      },
    });

    return NextResponse.json({ data: updated });
  }

  // Default: send a sequence step
  const parsed = sendSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  const [membership, vendor, campaign] = await Promise.all([
    prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } } }),
    prisma.foodVendor.findFirst({ where: { id: body.vendorId, deletedAt: null } }),
    prisma.campaign.findUnique({ where: { id: body.campaignId }, select: { name: true } }),
  ]);

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { subject, html } = buildOutreachEmail(body.step, {
    vendorName: vendor.name,
    campaignName: campaign?.name ?? "Campaign",
    contactName: vendor.contactName,
  });

  let messageId: string | null = null;
  let status: "sent" | "pending" = "pending";

  if (vendor.email) {
    try {
      const result = await sendOutreachEmail({
        to: vendor.email,
        vendorName: vendor.name,
        campaignName: campaign?.name ?? "Campaign",
        subject,
        html,
      });
      messageId = result.messageId;
      status = "sent";
    } catch (e) {
      console.error("[FuelOps/outreach] Email send failed:", e);
    }
  }

  const log = await prisma.vendorOutreachLog.create({
    data: {
      vendorId: body.vendorId,
      campaignId: body.campaignId,
      step: body.step,
      status,
      subject,
      bodyPreview: html.replace(/<[^>]+>/g, "").slice(0, 200),
      sentAt: status === "sent" ? new Date() : null,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json({ data: log, messageId }, { status: 201 });
}
