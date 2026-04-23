/**
 * POST /api/ops/adoni-wisdom/extract
 * Takes a raw transcript (Otter, voice memo, notes) and extracts
 * structured FounderWisdom entries using Claude.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

const CATEGORIES = ["canvassing", "signs", "gotv", "fundraising", "volunteers", "platform", "general"];

const EXTRACT_SYSTEM = `You are extracting campaign wisdom from a founder's raw transcript or notes.
Extract every distinct tactical insight as a separate entry.
Return a JSON array of objects with these fields:
  category: one of ${CATEGORIES.join(", ")}
  title: short title (max 10 words, plain text)
  content: the full tactical insight in plain prose (no bullet points, no markdown)
  tags: array of 2-5 keyword strings

Rules:
- Only extract concrete, actionable campaign tactics. Discard small talk and filler.
- Preserve the founder's voice and specific language.
- Each entry should stand alone as a useful piece of advice.
- Return only the JSON array, nothing else.`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) return NextResponse.json({ error: "transcript is required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: EXTRACT_SYSTEM,
      messages: [{ role: "user", content: `Extract wisdom from this transcript:\n\n${transcript.slice(0, 8000)}` }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "AI extraction failed" }, { status: 502 });
  }

  const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((b) => b.type === "text")?.text ?? "[]";

  let entries: unknown[] = [];
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    entries = jsonMatch ? JSON.parse(jsonMatch[0]) as unknown[] : [];
  } catch {
    return NextResponse.json({ error: "Could not parse AI response", raw: text }, { status: 422 });
  }

  return NextResponse.json({ entries, count: entries.length });
}
