/**
 * Civic Poll Content Extractor
 *
 * Uses the same Anthropic fetch pattern as src/lib/ai/index.ts
 * Direct fetch to https://api.anthropic.com/v1/messages — no SDK dependency.
 */

export interface ExtractedPoll {
  question: string;
  pollType: string;
  options?: string[];
  officialName?: string | null;
  targetRegion: string;
  relevanceScore: number;
  topicTags: string[];
  requiresReview: boolean;
}

const EXTRACTION_SYSTEM_PROMPT = `You are a civic poll extraction engine. Given a news headline and content, extract ONE clear civic poll question that Canadian citizens could meaningfully vote on.

Return ONLY valid JSON matching this schema:
{
  "question": "string — clear, neutral, one sentence, ends with ?",
  "pollType": "binary | multiple_choice | nps | slider",
  "options": ["array of strings, only if multiple_choice, 2-5 options"],
  "officialName": "string or null — if the story is about a specific elected official",
  "targetRegion": "national | provincial:[AB|BC|MB|NB|NL|NS|ON|PE|QC|SK] | municipal:[city_name]",
  "relevanceScore": 0.0,
  "topicTags": ["from: housing, transit, budget, safety, environment, education, healthcare, labour, zoning, infrastructure, arts, immigration"],
  "requiresReview": false
}

Rules:
- question must be neutral and non-partisan
- relevanceScore: 0.0 = not civic, 1.0 = directly about government/policy
- requiresReview: true if politically charged, about a specific candidate/party, or relevanceScore < 0.8
- Return null JSON fields for unknown values, not omitted fields
- If content is not about civic/government matters, set relevanceScore to 0.1`;

export async function extractPollFromContent(
  headline: string,
  content: string,
  geography: string,
  topics: string[]
): Promise<ExtractedPoll | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No API key — skip extraction
    return null;
  }

  const userMessage = `Geography context: ${geography}
Topic hints: ${topics.length > 0 ? topics.join(", ") : "general civic"}

Headline: ${headline}

Content: ${content.slice(0, 1500)}

Extract a civic poll question from this content.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 512,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json() as { content: Array<{ text: string }> };
    const rawText = data.content[0]?.text ?? "";

    // Extract JSON from the response (may have leading/trailing text)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    // Validate required fields
    if (
      typeof parsed.question !== "string" ||
      typeof parsed.pollType !== "string" ||
      typeof parsed.relevanceScore !== "number"
    ) {
      return null;
    }

    // Drop below threshold
    if (parsed.relevanceScore < 0.6) return null;

    const extracted: ExtractedPoll = {
      question: parsed.question,
      pollType: parsed.pollType,
      options: Array.isArray(parsed.options) ? (parsed.options as string[]) : undefined,
      officialName: typeof parsed.officialName === "string" ? parsed.officialName : null,
      targetRegion: typeof parsed.targetRegion === "string" ? parsed.targetRegion : geography,
      relevanceScore: parsed.relevanceScore,
      topicTags: Array.isArray(parsed.topicTags) ? (parsed.topicTags as string[]) : [],
      requiresReview: parsed.requiresReview === true || parsed.relevanceScore < 0.8,
    };

    return extracted;
  } catch {
    // Extraction failure — return null so source monitor skips this item
    return null;
  }
}
