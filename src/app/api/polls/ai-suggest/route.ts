/**
 * POST /api/polls/ai-suggest
 *
 * Fetches recent Canadian news headlines from public RSS feeds, then calls
 * Claude (or mock if no API key) to generate 5 civic poll suggestions.
 *
 * Optional body:
 *   { topic?: string, region?: string, rssUrl?: string }
 *
 * Returns:
 *   { data: PollSuggestion[], source: string, isMock: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { aiAssist } from "@/lib/ai";
import { sanitizePrompt } from "@/lib/ai/sanitize-prompt";
import { rateLimit } from "@/lib/rate-limit";

interface PollSuggestion {
  question: string;
  description: string;
  type: "binary" | "multiple_choice" | "slider" | "ranked";
  options?: string[];
  tags: string[];
}

// Curated list of Canadian civic/political RSS feeds (no-auth, public)
const DEFAULT_RSS_FEEDS = [
  "https://www.cbc.ca/cmlink/rss-topstories",
  "https://www.cbc.ca/cmlink/rss-canada-toronto",
  "https://www.thestar.com/search/?q=&contenttype=article&daterange=last7days&orderby=newest&rss=1",
];

async function fetchHeadlines(feedUrl: string, maxItems = 8): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "PollCity/1.0 (civic-data; contact@poll.city)" },
    });
    clearTimeout(timer);

    if (!res.ok) return [];

    const xml = await res.text();
    // Simple regex parse — no new dependencies
    const titles: string[] = [];
    const titleRegex = /<item[^>]*>[\s\S]*?<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/gi;
    let match: RegExpExecArray | null;
    while ((match = titleRegex.exec(xml)) !== null && titles.length < maxItems) {
      const title = match[1]?.trim()
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#8211;/g, "–");
      if (title && title.length > 10 && title.length < 200) {
        titles.push(title);
      }
    }
    return titles;
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body = fine */ }

  const rawTopic = typeof body.topic === "string" ? body.topic : null;
  const region = typeof body.region === "string" ? body.region.slice(0, 100) : "Toronto";
  const customRss = typeof body.rssUrl === "string" ? body.rssUrl : null;

  // Sanitize user-supplied topic
  const topic = rawTopic ? sanitizePrompt(rawTopic, 200) : null;
  if (rawTopic && !topic) {
    return NextResponse.json({ error: "Invalid topic text" }, { status: 422 });
  }

  // Fetch headlines from RSS
  const feedsToTry = customRss ? [customRss] : DEFAULT_RSS_FEEDS;
  const allHeadlines: string[] = [];

  await Promise.allSettled(
    feedsToTry.slice(0, 2).map(async (url) => {
      const h = await fetchHeadlines(url, 6);
      allHeadlines.push(...h);
    })
  );

  // Deduplicate and limit
  const uniqueHeadlines = Array.from(new Set(allHeadlines)).slice(0, 12);

  // Build prompt
  const headlineContext = uniqueHeadlines.length > 0
    ? `Recent Canadian news headlines:\n${uniqueHeadlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}`
    : "No live headlines available — use your knowledge of current Canadian municipal politics.";

  const topicContext = topic ? `\nFocus on this topic: ${topic}` : "";
  const regionContext = `Target region: ${region}`;

  const promptText = `${headlineContext}${topicContext}\n${regionContext}

Generate exactly 5 civic engagement poll suggestions for Canadian municipal politics. Mix poll types for variety.

Return a JSON array of exactly 5 objects with this structure:
[
  {
    "question": "...",
    "description": "One sentence of context for voters.",
    "type": "binary" | "multiple_choice" | "slider" | "ranked",
    "options": ["...", "..."],  // required for multiple_choice and ranked (3-5 options), omit for binary and slider
    "tags": ["tag1", "tag2"]  // 2-4 lowercase tags
  }
]

Rules:
- Questions must be specific to real Canadian municipal issues (housing, transit, budget, parks, safety)
- No placeholders. Real policy questions only.
- binary: simple yes/no questions
- multiple_choice: 4-5 distinct policy options
- slider: "Rate your satisfaction with X on a scale of 0-100"
- ranked: 4-5 priorities to rank in order of importance
- Descriptions must provide factual context (cost, scale, real tradeoffs)
- Return only the JSON array, no other text.`;

  let suggestions: PollSuggestion[] = [];
  let isMock = false;
  let sourceLabel = "AI + Canadian news";

  try {
    const result = await aiAssist.complete({
      messages: [{ role: "user", content: promptText }],
      systemPrompt: "You are a civic engagement specialist for Canadian municipal politics. You generate factual, unbiased poll questions to help candidates understand voter priorities. Always return valid JSON.",
      maxTokens: 1500,
      temperature: 0.7,
    });

    isMock = result.isMock;
    if (result.isMock) {
      sourceLabel = "Mock AI (add ANTHROPIC_API_KEY to enable live AI)";
    }

    // Parse JSON from response
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as unknown[];
      suggestions = parsed
        .filter((item): item is PollSuggestion => {
          if (!item || typeof item !== "object") return false;
          const s = item as Record<string, unknown>;
          return (
            typeof s.question === "string" &&
            typeof s.description === "string" &&
            typeof s.type === "string" &&
            ["binary", "multiple_choice", "slider", "ranked"].includes(s.type) &&
            Array.isArray(s.tags)
          );
        })
        .slice(0, 5);
    }
  } catch {
    // If AI fails, return hardcoded Canadian municipal suggestions
    isMock = true;
    sourceLabel = "Fallback suggestions";
  }

  // Fallback if AI returned nothing parseable
  if (suggestions.length === 0) {
    suggestions = [
      {
        question: "Should the city require all new residential developments over 10 units to include a minimum of 10% affordable housing units?",
        description: "Inclusionary zoning policies exist in several Ontario municipalities. Developers often argue this raises costs for market-rate buyers.",
        type: "binary",
        tags: ["housing", "affordability", "zoning"],
      },
      {
        question: "How should the city prioritize its capital budget over the next 4 years?",
        description: "The city faces competing demands across multiple service areas with limited borrowing room.",
        type: "ranked",
        options: ["Transit infrastructure & buses", "Affordable housing investment", "Roads, sidewalks & cycling", "Parks & recreation facilities", "Climate resilience & green infrastructure"],
        tags: ["budget", "priorities", "municipal"],
      },
      {
        question: "What best describes your position on e-scooters and e-bikes sharing city roads and bike lanes?",
        description: "Several Canadian cities have piloted shared e-scooter programs with mixed results for safety and accessibility.",
        type: "multiple_choice",
        options: ["Support — they reduce car trips and emissions", "Support with better enforcement of rules", "Neutral — need more data", "Oppose — safety risk to cyclists and pedestrians", "Oppose — infrastructure isn't ready"],
        tags: ["transit", "micromobility", "safety"],
      },
      {
        question: "How satisfied are you with the city's response to the current affordable housing shortage?",
        description: "Rate the city's performance on a scale from 0 (not at all satisfied) to 100 (very satisfied).",
        type: "slider",
        tags: ["housing", "satisfaction", "municipal"],
      },
      {
        question: "Should Toronto eliminate minimum parking requirements for new apartment buildings located within 600 metres of a subway or LRT station?",
        description: "Parking minimums increase construction costs by an estimated $50,000–$80,000 per space and reduce housing density near transit.",
        type: "binary",
        tags: ["transit", "parking", "housing", "zoning"],
      },
    ];
    sourceLabel = "Fallback suggestions";
  }

  return NextResponse.json({
    data: suggestions,
    source: sourceLabel,
    isMock,
    headlinesUsed: uniqueHeadlines.length,
  });
}
