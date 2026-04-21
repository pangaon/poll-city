import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import type { RepAlertSeverity, RepAlertSentiment } from "@prisma/client";

const NEGATIVE_TERMS = [
  "scandal", "arrest", "arrested", "charged", "indicted", "corruption", "corrupt",
  "accused", "lawsuit", "sued", "suing", "fraud", "misconduct", "suspended",
  "fired", "resign", "resignation", "controversy", "controversial", "protest",
  "protests", "protesters", "criticized", "criticism", "slammed", "blasted",
  "outrage", "backlash", "exposed", "cover-up", "lies", "mislead", "misleading",
  "investigation", "investigated", "complaint", "complaints", "opposition",
  "reject", "rejected", "denied", "deny", "fight", "fights", "crisis", "fail",
  "failed", "failure", "cut", "cuts", "oppose", "opposed", "bad", "worst",
  "terrible", "horrible", "concern", "concerns", "alarming", "shocking",
];

const POSITIVE_TERMS = [
  "endorsed", "endorsement", "wins", "victory", "victorious", "elected",
  "appointed", "appointment", "praised", "praise", "commended", "commends",
  "support", "supporting", "supported", "celebrates", "celebrates", "welcome",
  "welcomes", "award", "awarded", "achieves", "achievement", "progress",
  "announces", "launches", "delivers", "pledges", "champions", "leads",
  "leadership", "investment", "invested", "approved", "approval", "partner",
  "partnership", "success", "successful", "excellent", "proud", "great", "best",
];

function classifySentiment(text: string): RepAlertSentiment {
  const lower = text.toLowerCase();
  const neg = NEGATIVE_TERMS.filter((w) => lower.includes(w)).length;
  const pos = POSITIVE_TERMS.filter((w) => lower.includes(w)).length;
  if (neg > 0 && pos > 0) return "mixed";
  if (neg > pos) return "negative";
  if (pos > neg) return "positive";
  return "neutral";
}

function computeVelocity(pubDate: string): number {
  const ageHours = (Date.now() - new Date(pubDate).getTime()) / 3_600_000;
  if (ageHours < 2) return parseFloat((8.5 + Math.random()).toFixed(1));
  if (ageHours < 6) return parseFloat((6.5 + Math.random()).toFixed(1));
  if (ageHours < 24) return parseFloat((4.5 + Math.random()).toFixed(1));
  if (ageHours < 72) return parseFloat((2.5 + Math.random()).toFixed(1));
  return parseFloat((1.0 + Math.random()).toFixed(1));
}

function deriveSeverity(sentiment: RepAlertSentiment, velocity: number): RepAlertSeverity {
  if (sentiment === "negative" && velocity >= 8) return "critical";
  if (sentiment === "negative" && velocity >= 5) return "high";
  if (sentiment === "negative") return "medium";
  if (sentiment === "mixed" && velocity >= 6) return "high";
  if (sentiment === "mixed") return "medium";
  return "low";
}

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  sourceName: string;
}

function extractCdata(tag: string, block: string): string {
  const cdataMatch = new RegExp(`<${tag}><\\!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`).exec(block);
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(block);
  return plainMatch?.[1]?.trim() ?? "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const rawTitle = extractCdata("title", block);
    // Google News titles: "Article Headline - Source Name"
    const dashIdx = rawTitle.lastIndexOf(" - ");
    const title = dashIdx > 0 ? rawTitle.slice(0, dashIdx).trim() : rawTitle;

    const link = extractCdata("link", block) || (/<link>([\s\S]*?)<\/link>/.exec(block)?.[1]?.trim() ?? "");
    const description = stripHtml(extractCdata("description", block)).slice(0, 600);
    const pubDate = extractCdata("pubDate", block);
    const sourceMatch = /<source[^>]*>([^<]*)<\/source>/.exec(block);
    const sourceName = sourceMatch?.[1]?.trim() ?? (dashIdx > 0 ? rawTitle.slice(dashIdx + 3).trim() : "News");

    if (title && link) {
      items.push({ title, link, description, pubDate, sourceName });
    }
  }
  return items;
}

export interface ScanResult {
  created: number;
  skipped: number;
  total: number;
  query: string;
}

export async function scanNewsForCampaign(
  campaignId: string,
  userId: string,
  query: string
): Promise<ScanResult> {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-CA&gl=CA&ceid=CA:en`;

  const res = await fetch(rssUrl, {
    headers: { "User-Agent": "PollCity/1.0 news monitor" },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`Google News RSS responded with HTTP ${res.status}`);

  const xml = await res.text();
  const items = parseRssItems(xml);

  if (items.length === 0) return { created: 0, skipped: 0, total: 0, query };

  // Deduplicate by sourceUrl against existing alerts
  const links = items.map((i) => i.link);
  const existing = await prisma.reputationAlert.findMany({
    where: { campaignId, sourceUrl: { in: links } },
    select: { sourceUrl: true },
  });
  const seen = new Set(existing.map((a) => a.sourceUrl));

  const fresh = items.filter((i) => !seen.has(i.link)).slice(0, 25);
  let created = 0;

  for (const item of fresh) {
    const text = `${item.title} ${item.description}`;
    const sentiment = classifySentiment(text);
    const velocity = computeVelocity(item.pubDate);
    const severity = deriveSeverity(sentiment, velocity);
    const detectedAt = item.pubDate ? new Date(item.pubDate) : new Date();

    const alert = await prisma.reputationAlert.create({
      data: {
        campaignId,
        title: item.title,
        description: item.description || null,
        sourceType: "news",
        sourceName: item.sourceName,
        sourceUrl: item.link,
        sentiment,
        severity,
        velocityScore: velocity,
        detectedAt,
        metadata: { query, sourceName: item.sourceName } as unknown as Prisma.InputJsonValue,
        status: "new",
      },
    });

    await audit(prisma, "reputation.alert.scanned", {
      campaignId,
      userId,
      entityId: alert.id,
      entityType: "ReputationAlert",
      after: { title: item.title, severity, sentiment, query },
    });

    created++;
  }

  return { created, skipped: items.length - fresh.length, total: items.length, query };
}
