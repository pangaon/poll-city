import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Global search API — searches across contacts, volunteers, officials, polls, turfs
 * within the user's active campaign (tenant-isolated).
 *
 * Officials are public (not campaign-scoped).
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "contacts:read");
  if (permError) return permError;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Get user's active campaign — verify current membership regardless of session state
  // (session token may be stale if user was removed from a campaign)
  const user = session!.user as { id: string; activeCampaignId?: string };
  const activeCampaignId = user.activeCampaignId;

  let campaignId: string | null = null;
  if (activeCampaignId) {
    // Confirm the user is still a member — do not trust session alone
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId: activeCampaignId } },
      select: { campaignId: true },
    });
    campaignId = membership?.campaignId ?? null;
  }

  if (!campaignId) {
    const firstMembership = await prisma.membership.findFirst({
      where: { userId: session!.user.id },
      select: { campaignId: true },
    });
    campaignId = firstMembership?.campaignId ?? null;
  }

  const limit = 5;

  // Run searches in parallel
  const [contacts, officials, polls, turfs] = await Promise.all([
    campaignId
      ? prisma.contact.findMany({
          where: {
            campaignId,
            deletedAt: null,
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { address1: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, firstName: true, lastName: true, phone: true, email: true, address1: true, supportLevel: true },
          take: limit,
          orderBy: [{ lastName: "asc" }],
        })
      : Promise.resolve([]),
    prisma.official.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { district: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, district: true, title: true, province: true },
      take: limit,
      orderBy: [{ name: "asc" }],
    }),
    campaignId
      ? prisma.poll.findMany({
          where: {
            campaignId,
            question: { contains: q, mode: "insensitive" },
          },
          select: { id: true, question: true, isActive: true },
          take: limit,
          orderBy: [{ createdAt: "desc" }],
        })
      : Promise.resolve([]),
    campaignId
      ? prisma.turf.findMany({
          where: {
            campaignId,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { ward: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, ward: true },
          take: limit,
          orderBy: [{ name: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const results: Array<{ id: string; type: string; title: string; subtitle?: string; href: string }> = [];

  for (const c of contacts) {
    results.push({
      id: `contact-${c.id}`,
      type: "contact",
      title: `${c.firstName} ${c.lastName}`.trim(),
      subtitle: [c.phone, c.email, c.address1].filter(Boolean).join(" · ").slice(0, 80),
      href: `/contacts/${c.id}`,
    });
  }

  for (const o of officials) {
    results.push({
      id: `official-${o.id}`,
      type: "official",
      title: o.name,
      subtitle: `${o.title ?? ""} · ${o.district ?? ""}${o.province ? ` (${o.province})` : ""}`.trim(),
      href: `/officials/${o.id}`,
    });
  }

  for (const p of polls) {
    results.push({
      id: `poll-${p.id}`,
      type: "poll",
      title: p.question,
      subtitle: p.isActive ? "Active" : "Closed",
      href: `/polls`,
    });
  }

  for (const t of turfs) {
    results.push({
      id: `turf-${t.id}`,
      type: "turf",
      title: t.name,
      subtitle: t.ward ?? undefined,
      href: `/canvassing/turf-builder`,
    });
  }

  return NextResponse.json({ results });
}
