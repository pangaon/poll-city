/**
 * Candidate Intelligence Engine — News Pipeline
 *
 * Orchestrates: fetch → deduplicate → detect → score → resolve → persist.
 * Called by the cron job (/api/cron/intel-ingest).
 * Supports RSS and news_api source types.
 */

import crypto from "crypto";
import prisma from "@/lib/db/prisma";
import { detectCandidateSignals, ArticleInput } from "./detector";
import { resolveCandidate } from "./resolver";
import { decideVerification } from "./verifier";
import { normalizeOffice } from "./phrases";

export interface PipelineResult {
  dataSourceId: string;
  articlesIngested: number;
  signalsDetected: number;
  leadsCreated: number;
  leadsUpdated: number;
  errors: string[];
}

interface RawArticle {
  title: string;
  url: string;
  snippet: string | null;
  body: string | null;
  publishedAt: Date | null;
  author: string | null;
}

const FETCH_TIMEOUT = 10000;

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function fetchRssArticles(rssUrl: string): Promise<RawArticle[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(rssUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "PollCity/1.0 (+https://pollcity.ca)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const text = await res.text();

    const articles: RawArticle[] = [];
    const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(text)) !== null) {
      const block = match[1];
      const title = stripCdata(extractTag(block, "title") ?? "").trim();
      const link = (extractTag(block, "link") ?? extractAttr(block, "link", "href") ?? "").trim();
      const description = stripCdata(
        extractTag(block, "description") ??
        extractTag(block, "summary") ??
        extractTag(block, "content") ??
        ""
      );
      const pubDateRaw = extractTag(block, "pubDate") ?? extractTag(block, "published") ?? null;
      const pubDate = pubDateRaw ? new Date(pubDateRaw) : null;
      const author = extractTag(block, "author") ?? extractTag(block, "dc:creator") ?? null;
      const snippet = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);

      if (title && link) {
        articles.push({ title, url: link, snippet: snippet || null, body: null, publishedAt: pubDate, author });
      }
    }
    return articles.slice(0, 20);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

async function fetchNewsApiArticles(baseUrl: string, apiKey: string, query: string): Promise<RawArticle[]> {
  const url = new URL("/v2/everything", baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "20");
  url.searchParams.set("apiKey", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json() as { articles?: Array<Record<string, unknown>> };
    return (data.articles ?? []).map((a) => ({
      title: String(a["title"] ?? ""),
      url: String(a["url"] ?? ""),
      snippet: String(a["description"] ?? "").slice(0, 500) || null,
      body: String(a["content"] ?? "").slice(0, 2000) || null,
      publishedAt: a["publishedAt"] ? new Date(String(a["publishedAt"])) : null,
      author: String(a["author"] ?? "") || null,
    })).filter((a) => a.title && a.url);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

function extractTag(xml: string, tag: string): string | null {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  return m?.[1] ?? null;
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const m = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i").exec(xml);
  return m?.[1] ?? null;
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

/**
 * Process one DataSource. Fetches articles, runs detection, persists results.
 */
export async function processDataSource(dataSourceId: string): Promise<PipelineResult> {
  const result: PipelineResult = {
    dataSourceId,
    articlesIngested: 0,
    signalsDetected: 0,
    leadsCreated: 0,
    leadsUpdated: 0,
    errors: [],
  };

  const source = await prisma.dataSource.findUnique({
    where: { id: dataSourceId },
    select: {
      id: true,
      name: true,
      sourceType: true,
      baseUrl: true,
      rssUrl: true,
      authorityScore: true,
      candidateDetectionEnabled: true,
      isActive: true,
    },
  });

  if (!source || !source.isActive || !source.candidateDetectionEnabled) return result;

  const startedAt = new Date();

  // Record a health check start
  const healthRecord = await prisma.intelSourceHealth.create({
    data: { dataSourceId, status: "unknown", checkedAt: startedAt },
    select: { id: true },
  });

  try {
    let rawArticles: RawArticle[] = [];

    if (source.sourceType === "rss" && source.rssUrl) {
      rawArticles = await fetchRssArticles(source.rssUrl);
    } else if (source.sourceType === "news_api") {
      const apiKey = process.env.NEWS_API_KEY;
      if (!apiKey) {
        result.errors.push("NEWS_API_KEY not configured");
      } else {
        rawArticles = await fetchNewsApiArticles(source.baseUrl, apiKey, "candidate election councillor mayor running");
      }
    }
    // Other source types (official_list, csv_download) are handled by separate import jobs

    for (const raw of rawArticles) {
      if (!raw.title || !raw.url) continue;

      const contentHash = sha256(`${raw.title}|${raw.snippet ?? ""}`);

      // Deduplicate by URL within this source
      const existing = await prisma.newsArticle.findUnique({
        where: { dataSourceId_url: { dataSourceId: source.id, url: raw.url } },
        select: { id: true },
      });
      if (existing) continue;

      // Persist article
      const article = await prisma.newsArticle.create({
        data: {
          dataSourceId: source.id,
          title: raw.title,
          snippet: raw.snippet,
          body: raw.body,
          url: raw.url,
          publishedAt: raw.publishedAt,
          author: raw.author,
          contentHash,
          parserVersion: "1.0",
        },
        select: { id: true },
      });
      result.articlesIngested++;

      // Run candidate detection
      const articleInput: ArticleInput = {
        title: raw.title,
        snippet: raw.snippet,
        body: raw.body,
        publishedAt: raw.publishedAt,
        sourceAuthorityScore: source.authorityScore,
        sourceType: source.sourceType,
      };

      const signals = detectCandidateSignals(articleInput);

      for (const signal of signals) {
        // Persist the signal
        const newsSignal = await prisma.newsSignal.create({
          data: {
            newsArticleId: article.id,
            candidateNameRaw: signal.candidateNameRaw,
            officeRaw: signal.officeRaw,
            jurisdictionRaw: signal.jurisdictionRaw,
            wardOrRidingRaw: signal.wardOrRidingRaw,
            partyRaw: signal.partyRaw,
            signalType: signal.signalType,
            confidenceScore: signal.confidenceScore,
            phraseMatched: signal.phraseMatched,
            reviewStatus: "unreviewed",
          },
          select: { id: true },
        });
        result.signalsDetected++;

        // Entity resolution — check for duplicate lead
        const resolved = await resolveCandidate({
          detectedNameRaw: signal.candidateNameRaw,
          officeRaw: signal.officeRaw,
          jurisdictionRaw: signal.jurisdictionRaw,
          wardOrRidingRaw: signal.wardOrRidingRaw,
        });

        if (resolved.isDuplicate && resolved.duplicateLeadId) {
          // Update existing lead's confidence if new score is higher
          const existing = await prisma.candidateLead.findUnique({
            where: { id: resolved.duplicateLeadId },
            select: { confidenceScore: true },
          });
          if (existing && signal.confidenceScore > existing.confidenceScore) {
            await prisma.candidateLead.update({
              where: { id: resolved.duplicateLeadId },
              data: { confidenceScore: signal.confidenceScore },
            });
            result.leadsUpdated++;
          }
          // Link signal to the duplicate lead
          await prisma.newsSignal.update({
            where: { id: newsSignal.id },
            data: { candidateLeadId: resolved.duplicateLeadId, reviewStatus: "accepted" },
          });
        } else {
          // Create a new lead
          const verification = decideVerification({
            confidenceScore: signal.confidenceScore,
            hasCandidateName: signal.candidateNameRaw !== "Unknown",
            hasOffice: signal.officeRaw !== "unknown",
            hasJurisdiction: signal.jurisdictionRaw !== "unknown",
          });

          const lead = await prisma.candidateLead.create({
            data: {
              detectedNameRaw: signal.candidateNameRaw,
              officeRaw: signal.officeRaw,
              officeNormalized: normalizeOffice(signal.officeRaw),
              jurisdictionRaw: signal.jurisdictionRaw,
              jurisdictionNormalized: signal.jurisdictionRaw.toLowerCase().trim(),
              wardOrRidingRaw: signal.wardOrRidingRaw,
              partyRaw: signal.partyRaw,
              sourceType: source.sourceType,
              dataSourceId: source.id,
              sourceUrl: raw.url,
              confidenceScore: signal.confidenceScore,
              verificationStatus: verification.status,
              reviewStatus: verification.status === "pending" ? "unreviewed" : "reviewed",
            },
            select: { id: true },
          });
          result.leadsCreated++;

          // Link signal to new lead
          await prisma.newsSignal.update({
            where: { id: newsSignal.id },
            data: { candidateLeadId: lead.id, reviewStatus: "accepted" },
          });

          // Auto-create profile for verified leads
          if (verification.status === "auto_verified") {
            await prisma.candidateProfile.upsert({
              where: { candidateLeadId: lead.id },
              update: {
                lastDetectedAt: new Date(),
                campaignStatus: "announced",
              },
              create: {
                candidateLeadId: lead.id,
                fullName: signal.candidateNameRaw,
                office: normalizeOffice(signal.officeRaw),
                jurisdictionRef: signal.jurisdictionRaw,
                wardOrRiding: signal.wardOrRidingRaw,
                party: signal.partyRaw,
                campaignStatus: "announced",
                firstDetectedAt: new Date(),
                lastDetectedAt: new Date(),
                provenance: { sources: [{ id: source.id, name: source.name, url: raw.url, detectedAt: new Date() }] },
              },
            });
          }
        }
      }
    }

    const durationMs = Date.now() - startedAt.getTime();
    await prisma.intelSourceHealth.update({
      where: { id: healthRecord.id },
      data: {
        status: "healthy",
        httpStatus: 200,
        responseMs: durationMs,
        itemsFound: rawArticles.length,
      },
    });

    await prisma.dataSource.update({
      where: { id: dataSourceId },
      data: { lastCheckedAt: new Date() },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(msg);
    await prisma.intelSourceHealth.update({
      where: { id: healthRecord.id },
      data: { status: "down", errorMessage: msg.slice(0, 500) },
    }).catch(() => {});
  }

  return result;
}
