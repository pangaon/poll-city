import type { SourceValidationResult, SourceDiscoveryResult } from "./types";
import type { SourceType } from "@prisma/client";

const FEED_PATHS = [
  "/feed",
  "/rss",
  "/atom",
  "/feed.xml",
  "/rss.xml",
  "/atom.xml",
  "/feed/rss",
  "/news/feed",
  "/feeds/posts/default",
];

function parseXmlTitle(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/${tag}>`, "s"));
  return match?.[1]?.trim();
}

function parseRssItems(xml: string): { title: string; pubDate?: string }[] {
  const items: { title: string; pubDate?: string }[] = [];
  const itemMatches = Array.from(xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/g));
  for (const m of itemMatches) {
    const block = m[1];
    const title = parseXmlTitle(block, "title") ?? "";
    const pubDate = parseXmlTitle(block, "pubDate");
    items.push({ title, pubDate });
    if (items.length >= 5) break;
  }
  return items;
}

export async function validateSourceUrl(url: string): Promise<SourceValidationResult> {
  const result: SourceValidationResult = {
    isReachable: false,
    isFeedValid: false,
    isContentFresh: false,
    errors: [],
    suggestions: [],
  };

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    result.errors.push("Invalid URL format.");
    return result;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "PollCityBot/1.0 (source validator)" },
    });
    clearTimeout(timeoutId);

    result.httpStatus = res.status;
    result.latencyMs = Date.now() - start;
    result.isReachable = res.ok;

    if (!res.ok) {
      result.errors.push(`HTTP ${res.status} — source returned an error.`);
      return result;
    }

    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();

    const isXml = contentType.includes("xml") || body.trimStart().startsWith("<?xml") || body.includes("<rss") || body.includes("<feed");

    if (isXml) {
      result.isFeedValid = body.includes("<item") || body.includes("<entry");
      if (!result.isFeedValid) {
        result.errors.push("XML response found but no feed items detected.");
      }

      result.feedTitle = parseXmlTitle(body, "title");
      const items = parseRssItems(body);
      result.itemsFound = items.length;

      if (items.length > 0) {
        result.lastItemDate = items[0].pubDate;
        if (items[0].pubDate) {
          const age = Date.now() - new Date(items[0].pubDate).getTime();
          result.isContentFresh = age < 30 * 24 * 60 * 60 * 1000; // 30 days
          if (!result.isContentFresh) {
            result.suggestions.push("Most recent item is older than 30 days — source may be stale.");
          }
        } else {
          result.isContentFresh = true; // no date = assume fresh
        }
      }
    } else {
      // HTML page — reachable but not a feed
      result.isContentFresh = true;
      result.suggestions.push(
        "This URL returns an HTML page, not a feed. Consider using 'website_page' or 'newsroom_page' as the source type."
      );
      // Check for feed autodiscovery links
      const feedLinks = Array.from(body.matchAll(/rel=["']alternate["'][^>]+type=["']application\/(rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/gi));
      for (const fl of feedLinks) {
        const href = fl[2];
        const resolved = href.startsWith("http") ? href : `${parsedUrl.origin}${href}`;
        result.suggestions.push(`Feed autodiscovery link found: ${resolved}`);
      }
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      result.errors.push("Request timed out after 12 seconds.");
    } else {
      result.errors.push(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

export async function discoverFeedsFromUrl(baseUrl: string): Promise<SourceDiscoveryResult> {
  const result: SourceDiscoveryResult = {
    foundFeeds: [],
    foundSitemap: null,
    suggestedType: null,
    notes: [],
  };

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    result.notes.push("Invalid URL — cannot discover feeds.");
    return result;
  }

  const origin = `${parsed.protocol}//${parsed.host}`;

  // Check common feed paths in parallel (max 5s each)
  const feedChecks = FEED_PATHS.map(async (path) => {
    const url = `${origin}${path}`;
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "PollCityBot/1.0 (feed discovery)" },
      });
      if (!res.ok) return null;
      const body = await res.text();
      if (body.includes("<rss") || body.includes("<feed") || body.includes("<channel")) {
        const type = body.includes("<feed") ? "atom" : "rss";
        const title = parseXmlTitle(body, "title");
        return { url, type, title };
      }
      return null;
    } catch {
      return null;
    }
  });

  // Check sitemap.xml
  const sitemapCheck = (async () => {
    const url = `${origin}/sitemap.xml`;
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "PollCityBot/1.0" },
      });
      if (res.ok) {
        const body = await res.text();
        if (body.includes("<urlset") || body.includes("<sitemapindex")) return url;
      }
      return null;
    } catch {
      return null;
    }
  })();

  // Check homepage for <link rel="alternate"> tags
  const homepageCheck = (async () => {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(baseUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "PollCityBot/1.0" },
      });
      if (!res.ok) return [];
      const body = await res.text();
      const matches = Array.from(body.matchAll(/<link[^>]+rel=["']alternate["'][^>]+>/gi));
      const feeds: { url: string; type: string; title?: string }[] = [];
      for (const m of matches) {
        const tag = m[0];
        const typeMatch = tag.match(/type=["'](application\/(rss|atom)\+xml)["']/i);
        const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
        const titleMatch = tag.match(/title=["']([^"']+)["']/i);
        if (typeMatch && hrefMatch) {
          const href = hrefMatch[1];
          const resolved = href.startsWith("http") ? href : `${origin}${href}`;
          feeds.push({
            url: resolved,
            type: typeMatch[2] ?? "rss",
            title: titleMatch?.[1],
          });
        }
      }
      return feeds;
    } catch {
      return [];
    }
  })();

  const [feedResults, sitemap, homepageFeeds] = await Promise.all([
    Promise.all(feedChecks),
    sitemapCheck,
    homepageCheck,
  ]);

  for (const f of feedResults) {
    if (f) result.foundFeeds.push(f);
  }
  for (const f of homepageFeeds) {
    if (!result.foundFeeds.some((x) => x.url === f.url)) {
      result.foundFeeds.push(f);
    }
  }
  if (sitemap) result.foundSitemap = sitemap;

  if (result.foundFeeds.length > 0) {
    const firstFeed = result.foundFeeds[0];
    result.suggestedType = (firstFeed.type === "atom" ? "atom_feed" : "rss_feed") as SourceType;
    result.notes.push(`Found ${result.foundFeeds.length} feed(s). Recommended: use '${result.suggestedType}'.`);
  } else {
    result.notes.push("No RSS/Atom feeds discovered. Consider 'website_page' or 'newsroom_page' as source type.");
    result.suggestedType = "website_page";
  }

  return result;
}
