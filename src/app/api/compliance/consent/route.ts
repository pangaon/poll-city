import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  contactId: z.string().min(1),
  campaignId: z.string().min(1),
  consentType: z.enum(["explicit", "implied", "express_withdrawal"]),
  channel: z.enum(["email", "sms", "push"]),
  source: z.enum(["import", "form", "qr", "manual", "social_follow", "donation", "event_signup"]),
  collectedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  ipAddress: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// POST /api/compliance/consent — record a consent event
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { contactId, campaignId, consentType, channel, source, collectedAt, expiresAt, ipAddress, notes } = parsed.data;

  // Verify membership
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  // Verify contact belongs to campaign
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, campaignId: true },
  });
  if (!contact || contact.campaignId !== campaignId) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const record = await prisma.consentRecord.create({
    data: {
      contactId,
      campaignId,
      consentType,
      channel,
      source,
      collectedAt: collectedAt ? new Date(collectedAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      ipAddress: ipAddress ?? null,
      notes: notes ?? null,
      recordedById: session!.user.id,
    },
  });

  return NextResponse.json({ record }, { status: 201 });
}

// GET /api/compliance/consent?contactId=&campaignId= — fetch consent history
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  const campaignId = searchParams.get("campaignId");

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  // Verify membership
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const where = {
    campaignId,
    ...(contactId ? { contactId } : {}),
  };

  const records = await prisma.consentRecord.findMany({
    where,
    orderBy: { collectedAt: "desc" },
    take: 200,
    select: {
      id: true,
      contactId: true,
      consentType: true,
      channel: true,
      source: true,
      collectedAt: true,
      expiresAt: true,
      ipAddress: true,
      notes: true,
      createdAt: true,
      recordedBy: { select: { id: true, name: true } },
      contact: contactId ? undefined : { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Compute active consent summary per channel when fetching by contactId
  let summary: Record<string, { hasConsent: boolean; activeType: string | null; expiresAt: string | null }> | null = null;
  if (contactId) {
    const now = new Date();
    const channels = ["email", "sms", "push"] as const;
    summary = {};
    for (const ch of channels) {
      const channelRecords = records.filter((r) => r.channel === ch);
      // Check for express_withdrawal first
      const withdrawal = channelRecords.find((r) => r.consentType === "express_withdrawal");
      if (withdrawal) {
        summary[ch] = { hasConsent: false, activeType: "express_withdrawal", expiresAt: null };
        continue;
      }
      // Check for valid (non-expired) consent
      const valid = channelRecords.find(
        (r) =>
          (r.consentType === "explicit" || r.consentType === "implied") &&
          (r.expiresAt === null || r.expiresAt > now),
      );
      if (valid) {
        summary[ch] = {
          hasConsent: true,
          activeType: valid.consentType,
          expiresAt: valid.expiresAt?.toISOString() ?? null,
        };
      } else {
        summary[ch] = { hasConsent: false, activeType: null, expiresAt: null };
      }
    }
  }

  return NextResponse.json({
    records: records.map((r) => ({
      ...r,
      collectedAt: r.collectedAt.toISOString(),
      expiresAt: r.expiresAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    ...(summary ? { summary } : {}),
  });
}
