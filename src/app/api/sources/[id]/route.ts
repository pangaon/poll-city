import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { z } from "zod";
import { getSourceById, updateSource, archiveSource } from "@/lib/sources/source-service";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null) {
  if (!session) return false;
  const user = session.user as typeof session.user & { role?: string };
  return user?.role === "SUPER_ADMIN";
}

function getUserId(session: import("next-auth").Session) {
  return (session.user as { id?: string }).id ?? "unknown";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const source = await getSourceById(params.id);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Also fetch tenants actively using this source
  const tenantsUsing = await prisma.campaignSourceActivation.findMany({
    where: { sourceId: params.id, status: "active" },
    include: { campaign: { select: { id: true, name: true, slug: true } } },
    take: 20,
  });

  return NextResponse.json({ source, tenantsUsing });
}

const UpdateSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  sourceType: z.enum([
    "rss_feed", "atom_feed", "website_page", "newsroom_page", "press_release_page",
    "sitemap_news", "sitemap_general", "search_query", "google_news_query",
    "youtube_channel", "youtube_search", "reddit_query", "facebook_page",
    "x_profile", "instagram_profile", "pdf_notice_page", "agenda_minutes_page",
    "candidate_site", "competitor_site", "government_page", "election_office_page",
    "community_group_page", "custom_url_monitor",
  ]).optional(),
  ingestionMethod: z.enum([
    "feed_poller", "html_scraper", "structured_parser", "sitemap_scanner",
    "search_ingestor", "manual_review_only", "webhook_ingest", "future_api_connector",
  ]).optional(),
  platform: z.string().optional(),
  canonicalUrl: z.string().url().optional().or(z.literal("")),
  feedUrl: z.string().url().optional().or(z.literal("")),
  baseUrl: z.string().url().optional().or(z.literal("")),
  language: z.string().optional(),
  province: z.string().optional(),
  region: z.string().optional(),
  municipality: z.string().optional(),
  credibilityScore: z.number().min(0).max(10).optional(),
  priorityScore: z.number().int().min(0).max(100).optional(),
  defaultAlertThreshold: z.enum(["all_alerts", "important_only", "critical_only", "digest_only", "muted"]).optional(),
  verificationStatus: z.enum(["unverified", "verified", "needs_review", "rejected"]).optional(),
  sourceStatus: z.enum(["draft", "active", "paused", "broken", "archived", "restricted"]).optional(),
  ownershipType: z.enum(["global", "tenant_private"]).optional(),
  visibilityScope: z.string().optional(),
  pollingCadenceMinutes: z.number().int().min(5).max(1440).optional(),
  isRecommended: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notesInternal: z.string().optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.platformSource.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = getUserId(session!);

  // Log the change
  await prisma.sourceAuditLog.create({
    data: {
      sourceId: params.id,
      action: "updated",
      actorId: userId,
      before: existing as unknown as import("@prisma/client").Prisma.InputJsonValue,
      after: parsed.data as unknown as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  const source = await updateSource(params.id, { ...(parsed.data as Parameters<typeof updateSource>[1]), updatedByUserId: userId });
  return NextResponse.json({ source });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.platformSource.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await archiveSource(params.id, getUserId(session!));
  return NextResponse.json({ success: true });
}
