/**
 * Candidate Intelligence Engine — Enricher
 *
 * Attempts to enrich a CandidateProfile with public data from their website.
 * Only runs if the source DataSource has crawlAllowed = true.
 * Safe by design: fetch only, no mutations to external systems.
 */

export interface EnrichmentInput {
  website: string | null;
  crawlAllowed: boolean;
}

export interface EnrichmentResult {
  email: string | null;
  phone: string | null;
  socials: {
    twitter: string | null;
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
  };
  enrichedAt: Date;
}

const FETCH_TIMEOUT_MS = 8000;

/** Extract first mailto: href from HTML */
function extractEmail(html: string): string | null {
  const m = /href=["']mailto:([^"'>\s]+)["']/i.exec(html);
  return m ? m[1].trim() : null;
}

/** Extract first tel: href from HTML */
function extractPhone(html: string): string | null {
  const m = /href=["']tel:([^"'>\s]+)["']/i.exec(html);
  return m ? m[1].replace(/\s+/g, "").trim() : null;
}

/** Extract social media links */
function extractSocials(html: string) {
  const get = (pattern: RegExp) => {
    const m = pattern.exec(html);
    return m ? m[0].trim() : null;
  };
  return {
    twitter: get(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]{1,50}/),
    facebook: get(/https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9.\-_]{1,100}/),
    instagram: get(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]{1,50}/),
    linkedin: get(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9\-]{1,100}/),
  };
}

export async function enrichFromWebsite(input: EnrichmentInput): Promise<EnrichmentResult | null> {
  if (!input.crawlAllowed || !input.website) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(input.website, {
      signal: controller.signal,
      headers: { "User-Agent": "PollCity/1.0 (+https://pollcity.ca)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();

    return {
      email: extractEmail(html),
      phone: extractPhone(html),
      socials: extractSocials(html),
      enrichedAt: new Date(),
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
