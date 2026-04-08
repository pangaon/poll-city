import prisma from "@/lib/db/prisma";
import { extractPollFromContent } from "./content-extractor";

export interface MonitorResult {
  sourceId: string;
  newItems: number;
  errors: string[];
}

export async function checkSource(sourceId: string): Promise<MonitorResult> {
  const source = await prisma.autonomousSource.findUnique({ where: { id: sourceId } });
  if (!source || !source.isActive) return { sourceId, newItems: 0, errors: [] };

  const errors: string[] = [];
  let newItems = 0;

  try {
    let items: Array<{ url: string; headline: string; content: string }> = [];

    if (source.type === "rss") {
      items = await fetchRss(source.url);
    } else if (source.type === "open_north") {
      items = await fetchOpenNorth(source.url, source.config as Record<string, unknown> | null);
    } else if (source.type === "gc_api") {
      items = await fetchGcApi(source.url, source.config as Record<string, unknown> | null);
    }

    for (const item of items.slice(0, 10)) {
      // Check for duplicate
      const existing = await prisma.autonomousContent.findUnique({
        where: { sourceId_sourceUrl: { sourceId, sourceUrl: item.url } },
        select: { id: true },
      });
      if (existing) continue;

      // Extract poll from content
      const extracted = await extractPollFromContent(
        item.headline,
        item.content,
        source.geography ?? "national",
        source.topics
      );

      if (!extracted) continue; // below relevance threshold

      await prisma.autonomousContent.create({
        data: {
          sourceId,
          sourceUrl: item.url,
          headline: item.headline,
          rawContent: item.content.slice(0, 5000),
          extractedPoll: extracted as object,
          status: "pending",
        },
      });
      newItems++;
    }

    await prisma.autonomousSource.update({
      where: { id: sourceId },
      data: { lastCheckedAt: new Date(), lastError: null },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(msg);
    await prisma.autonomousSource.update({
      where: { id: sourceId },
      data: { lastError: msg.slice(0, 500) },
    }).catch(() => {});
  }

  return { sourceId, newItems, errors };
}

async function fetchRss(url: string): Promise<Array<{ url: string; headline: string; content: string }>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "PollCity/1.0 (pollcity.ca)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const text = await res.text();

    const items: Array<{ url: string; headline: string; content: string }> = [];

    const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const block = match[1];
      const title = stripCdata(extractTag(block, "title") ?? "");
      const link = extractTag(block, "link") ?? extractAttr(block, "link", "href") ?? "";
      const description = stripCdata(
        extractTag(block, "description") ??
        extractTag(block, "summary") ??
        extractTag(block, "content") ??
        ""
      );
      const cleanContent = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (title && link) {
        items.push({ url: link.trim(), headline: title.trim(), content: cleanContent.slice(0, 2000) });
      }
    }
    return items;
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

function extractTag(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  return match?.[1] ?? null;
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const match = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i").exec(xml);
  return match?.[1] ?? null;
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

async function fetchOpenNorth(
  url: string,
  _config: Record<string, unknown> | null
): Promise<Array<{ url: string; headline: string; content: string }>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "PollCity/1.0 (pollcity.ca)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json() as Record<string, unknown>;
    const objects = (data.objects as Array<Record<string, unknown>>) ?? [];
    return objects.slice(0, 10).map((obj) => ({
      url: String(obj.url ?? obj.id ?? ""),
      headline: String(obj.name ?? obj.title ?? ""),
      content: String(obj.description ?? obj.other ?? "").slice(0, 2000),
    })).filter((i) => i.url && i.headline);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

async function fetchGcApi(
  url: string,
  _config: Record<string, unknown> | null
): Promise<Array<{ url: string; headline: string; content: string }>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "PollCity/1.0 (pollcity.ca)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json() as Record<string, unknown>;
    const feedData = data.feed as Record<string, unknown> | undefined;
    const rawItems = (feedData?.entry ?? data.items ?? data.results ?? []) as Array<Record<string, unknown>>;
    return rawItems.slice(0, 10).map((item) => {
      const linkObj = item.link as Record<string, unknown> | undefined;
      const titleObj = item.title as Record<string, unknown> | undefined;
      const summaryObj = item.summary as Record<string, unknown> | undefined;
      return {
        url: String(linkObj?.href ?? item.url ?? item.id ?? ""),
        headline: String(titleObj?.["$t"] ?? item.title ?? item.name ?? ""),
        content: String(summaryObj?.["$t"] ?? item.description ?? item.content ?? "")
          .replace(/<[^>]+>/g, " ")
          .trim()
          .slice(0, 2000),
      };
    }).filter((i) => i.url && i.headline);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}
