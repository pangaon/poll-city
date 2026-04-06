/**
 * GET /api/newsletters/subscribers — List subscribers for active campaign.
 * POST /api/newsletters/subscribers — Bulk import subscribers.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "email:read");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status") ?? "active";

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { campaignId, status },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const total = await prisma.newsletterSubscriber.count({ where: { campaignId } });
  const active = await prisma.newsletterSubscriber.count({ where: { campaignId, status: "active" } });

  return NextResponse.json({ subscribers, total, active });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "contacts:import");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const { subscribers } = await req.json();
  if (!Array.isArray(subscribers)) return NextResponse.json({ error: "subscribers array required" }, { status: 400 });

  let imported = 0;
  let skipped = 0;

  for (const sub of subscribers.slice(0, 5000)) {
    if (!sub.email?.trim()) { skipped++; continue; }
    try {
      await prisma.newsletterSubscriber.create({
        data: {
          campaignId,
          email: sub.email.trim().toLowerCase(),
          firstName: sub.firstName?.trim() || null,
          lastName: sub.lastName?.trim() || null,
          postalCode: sub.postalCode?.trim() || null,
          source: "import",
          consentGiven: true,
        },
      });
      imported++;
    } catch {
      skipped++; // duplicate
    }
  }

  return NextResponse.json({ imported, skipped, total: subscribers.length });
}
