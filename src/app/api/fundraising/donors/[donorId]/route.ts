import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";

const updateSchema = z.object({
  donorStatus: z.enum(["prospect", "first_time", "repeat", "lapsed", "major", "recurring", "champion"]).optional(),
  donorTier: z.enum(["general", "silver", "gold", "platinum", "major"]).optional(),
  notes: z.string().optional(),
  riskFlagsJson: z.array(z.record(z.unknown())).nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ donorId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { donorId } = await params;
  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    include: {
      contact: {
        select: {
          id: true, firstName: true, lastName: true, email: true,
          phone: true, ward: true, address1: true, city: true, province: true,
          postalCode: true, deletedAt: true, supportLevel: true, funnelStage: true,
          lastContactedAt: true,
        },
      },
    },
  });
  if (!donor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, donor.campaignId);
  if (forbidden) return forbidden;

  // Full donation history
  const [donations, pledges, recurrencePlans] = await Promise.all([
    prisma.donation.findMany({
      where: { contactId: donor.contactId, campaignId: donor.campaignId, deletedAt: null },
      include: {
        source: { select: { id: true, name: true } },
        fundraisingCampaign: { select: { id: true, name: true } },
        receipt: { select: { id: true, receiptNumber: true, receiptStatus: true } },
      },
      orderBy: { donationDate: "desc" },
    }),
    prisma.pledge.findMany({
      where: { contactId: donor.contactId, campaignId: donor.campaignId },
      orderBy: { pledgeDate: "desc" },
    }),
    prisma.recurrencePlan.findMany({
      where: { contactId: donor.contactId, campaignId: donor.campaignId },
      orderBy: { startDate: "desc" },
    }),
  ]);

  // Audit log for this donor's contact
  const auditLog = await prisma.donorAuditLog.findMany({
    where: {
      campaignId: donor.campaignId,
      OR: [
        { entityType: "DonorProfile", entityId: donorId },
        { entityType: "Donation", entityId: { in: donations.map((d) => d.id) } },
      ],
    },
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    data: {
      ...donor,
      donations,
      pledges,
      recurrencePlans,
      auditLog,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ donorId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { donorId } = await params;
  const donor = await prisma.donorProfile.findUnique({ where: { id: donorId }, select: { campaignId: true } });
  if (!donor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, donor.campaignId);
  if (forbidden) return forbidden;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const updated = await prisma.donorProfile.update({
    where: { id: donorId },
    data: parsed.data as never,
  });

  // Audit the manual override
  await prisma.donorAuditLog.create({
    data: {
      campaignId: donor.campaignId,
      entityType: "DonorProfile",
      entityId: donorId,
      action: "profile_updated",
      newValueJson: parsed.data as never,
      actorUserId: session!.user.id,
    },
  });

  return NextResponse.json({ data: updated });
}
