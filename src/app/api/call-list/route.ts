import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
    const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;
  // Auto-generate call list from: donation pledges, volunteer interests, sign requests, follow-ups
  const [followUps, volunteers, donations] = await Promise.all([
    prisma.contact.findMany({ where: { campaignId: campaignId!, followUpNeeded: true, phone: { not: null }, isDeceased: false }, take: 30, select: { id: true, firstName: true, lastName: true, phone: true, address1: true, notes: true, supportLevel: true } }),
    prisma.contact.findMany({ where: { campaignId: campaignId!, volunteerInterest: true, phone: { not: null }, isDeceased: false }, take: 20, select: { id: true, firstName: true, lastName: true, phone: true, address1: true, notes: true, supportLevel: true } }),
    prisma.donation.findMany({ where: { campaignId: campaignId!, status: "pledged" }, take: 20, include: { contact: { select: { id: true, firstName: true, lastName: true, phone: true, address1: true, supportLevel: true } } } }),
  ]);
  const calls = [
    ...followUps.map(c => ({ id: `fu-${c.id}`, contactId: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone!, address: c.address1 ?? "", reason: "follow_up_needed", reasonNote: c.notes ?? "", priority: "high" as const, staffNote: c.notes ?? "", supportLevel: c.supportLevel, status: "pending" as const })),
    ...volunteers.map(c => ({ id: `vol-${c.id}`, contactId: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone!, address: c.address1 ?? "", reason: "volunteer_interest", reasonNote: "Interested in volunteering", priority: "normal" as const, staffNote: "", supportLevel: c.supportLevel, status: "pending" as const })),
    ...donations.filter(d => d.contact).map(d => ({ id: `don-${d.id}`, contactId: d.contact!.id, firstName: d.contact!.firstName, lastName: d.contact!.lastName, phone: d.contact!.phone ?? "", address: d.contact!.address1 ?? "", reason: "donation_pledge", reasonNote: `$${d.amount} pledge via ${d.method ?? "unknown"}`, priority: "urgent" as const, staffNote: d.notes ?? "", supportLevel: d.contact!.supportLevel, status: "pending" as const })),
  ];
  return NextResponse.json({ data: calls });
}
