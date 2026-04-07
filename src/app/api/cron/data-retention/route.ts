import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * PIPEDA data retention cron.
 * Anonymizes contacts for campaigns whose election date has passed
 * beyond the campaign's configured dataRetentionDays.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // Find campaigns past their retention window
  // dataRetentionDays is a new schema field — cast to access it before prisma generate
  const campaigns = await prisma.campaign.findMany({
    where: {
      electionDate: { not: null },
    },
    select: {
      id: true,
      name: true,
      electionDate: true,
    },
  });

  let totalAnonymized = 0;
  const processed: { campaignId: string; campaignName: string; anonymized: number }[] = [];

  for (const campaign of campaigns) {
    if (!campaign.electionDate) continue;

    // dataRetentionDays defaults to 365 in schema; cast until prisma generate
    const retentionDays = ((campaign as Record<string, unknown>).dataRetentionDays as number) ?? 365;
    const retentionExpiry = new Date(campaign.electionDate);
    retentionExpiry.setDate(retentionExpiry.getDate() + retentionDays);

    if (now < retentionExpiry) continue;

    // Find contacts that haven't already been anonymized
    const contacts = await prisma.contact.findMany({
      where: {
        campaignId: campaign.id,
        firstName: { not: { startsWith: "REDACTED-" } },
      },
      select: { id: true },
    });

    if (contacts.length === 0) continue;

    // Anonymize in batches
    for (const contact of contacts) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          firstName: `REDACTED-${contact.id}`,
          lastName: `REDACTED-${contact.id}`,
          middleName: null,
          email: `REDACTED-${contact.id}@redacted.local`,
          phone: null,
          phone2: null,
          address1: null,
          address2: null,
          postalCode: null,
        },
      });
    }

    // Audit log
    await prisma.activityLog.create({
      data: {
        campaignId: campaign.id,
        userId: "system",
        action: "data_retention.anonymize",
        entityId: campaign.id,
        entityType: "Campaign",
        details: {
          contactsAnonymized: contacts.length,
          retentionDays: retentionDays,
          electionDate: campaign.electionDate.toISOString(),
        } as object,
      },
    });

    totalAnonymized += contacts.length;
    processed.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      anonymized: contacts.length,
    });
  }

  return NextResponse.json({
    success: true,
    totalAnonymized,
    campaignsProcessed: processed.length,
    details: processed,
  });
}
