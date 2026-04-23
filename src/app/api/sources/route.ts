import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { z } from "zod";
import { listSources, createSource, getSourceStats } from "@/lib/sources/source-service";
import type { SourceType, SourceIngestionMethod, SourceAlertThreshold } from "@prisma/client";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null) {
  if (!session) return false;
  const user = session.user as typeof session.user & { role?: string };
  return user?.role === "SUPER_ADMIN";
}

function getUserId(session: import("next-auth").Session) {
  return (session.user as { id?: string }).id ?? "unknown";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const p = req.nextUrl.searchParams;
  const statsOnly = p.get("stats") === "true";

  if (statsOnly) {
    const stats = await getSourceStats();
    return NextResponse.json(stats);
  }

  const result = await listSources({
    sourceType: (p.get("sourceType") as SourceType) || undefined,
    sourceStatus: (p.get("sourceStatus") as Parameters<typeof listSources>[0]["sourceStatus"]) || undefined,
    verificationStatus: (p.get("verificationStatus") as Parameters<typeof listSources>[0]["verificationStatus"]) || undefined,
    ownershipType: (p.get("ownershipType") as Parameters<typeof listSources>[0]["ownershipType"]) || undefined,
    municipality: p.get("municipality") || undefined,
    province: p.get("province") || undefined,
    isRecommended: p.get("isRecommended") === "true" ? true : p.get("isRecommended") === "false" ? false : undefined,
    isFeatured: p.get("isFeatured") === "true" ? true : undefined,
    isActive: p.get("isActive") === "false" ? false : true,
    search: p.get("search") || undefined,
    page: Math.max(1, parseInt(p.get("page") ?? "1", 10)),
    limit: Math.min(100, parseInt(p.get("limit") ?? "50", 10)),
  });

  return NextResponse.json(result);
}

const CreateSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
  sourceType: z.enum([
    "rss_feed", "atom_feed", "website_page", "newsroom_page", "press_release_page",
    "sitemap_news", "sitemap_general", "search_query", "google_news_query",
    "youtube_channel", "youtube_search", "reddit_query", "facebook_page",
    "x_profile", "instagram_profile", "pdf_notice_page", "agenda_minutes_page",
    "candidate_site", "competitor_site", "government_page", "election_office_page",
    "community_group_page", "custom_url_monitor",
  ]),
  ingestionMethod: z.enum([
    "feed_poller", "html_scraper", "structured_parser", "sitemap_scanner",
    "search_ingestor", "manual_review_only", "webhook_ingest", "future_api_connector",
  ]).optional(),
  platform: z.string().optional(),
  canonicalUrl: z.string().url().optional().or(z.literal("")),
  feedUrl: z.string().url().optional().or(z.literal("")),
  baseUrl: z.string().url().optional().or(z.literal("")),
  language: z.string().default("en"),
  country: z.string().default("CA"),
  province: z.string().optional(),
  region: z.string().optional(),
  municipality: z.string().optional(),
  topicTagsJson: z.array(z.string()).optional(),
  credibilityScore: z.number().min(0).max(10).default(5.0),
  priorityScore: z.number().int().min(0).max(100).default(50),
  defaultAlertThreshold: z.enum(["all_alerts", "important_only", "critical_only", "digest_only", "muted"]).optional(),
  ownershipType: z.enum(["global", "tenant_private"]).optional(),
  visibilityScope: z.string().default("global"),
  pollingCadenceMinutes: z.number().int().min(5).max(1440).default(60),
  isRecommended: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  notesInternal: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { topicTagsJson, ...rest } = parsed.data;

  try {
    const source = await createSource({
      ...rest,
      sourceType: rest.sourceType as SourceType,
      ingestionMethod: rest.ingestionMethod as SourceIngestionMethod | undefined,
      defaultAlertThreshold: rest.defaultAlertThreshold as SourceAlertThreshold | undefined,
      topicTagsJson: topicTagsJson ?? [],
      createdByUserId: getUserId(session!),
    });
    return NextResponse.json({ source }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create source";
    if (msg.includes("Unique constraint") || msg.includes("slug")) {
      return NextResponse.json({ error: "A source with this slug already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
