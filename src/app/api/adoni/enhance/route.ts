import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { enforceLimit } from "@/lib/rate-limit-redis";
import { sanitizePrompt } from "@/lib/ai/sanitize-prompt";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type EnhanceContext = "email-body" | "email-subject" | "sms" | "note" | "social-post" | "general";

const PROMPTS: Record<EnhanceContext, (text: string) => string> = {
  "email-body": (text) =>
    `You are a Canadian political campaign communications expert. Improve this campaign email body. Preserve all HTML tags exactly as-is. Improve clarity, warmth, and persuasiveness. Keep approximately the same length. Return only the improved HTML, nothing else.\n\n${text}`,
  "email-subject": (text) =>
    `You are a Canadian political campaign communications expert. Improve this email subject line. Make it more compelling and specific. Keep it under 70 characters. Return only the improved subject line, nothing else.\n\n${text}`,
  "sms": (text) =>
    `You are a Canadian political campaign communications expert. Improve this SMS message. Keep it concise — the body must stay under 120 characters to leave room for the compliance footer. Make it warm and action-oriented. Preserve any {{merge_tags}}. Return only the improved message, nothing else.\n\n${text}`,
  "note": (text) =>
    `You are a campaign manager's assistant. Improve this contact note for clarity and completeness. Keep it factual and professional. Preserve all specific names, addresses, and facts. Return only the improved note, nothing else.\n\n${text}`,
  "social-post": (text) =>
    `You are a Canadian political campaign social media strategist. Improve this social post. Make it more engaging and authentic. Keep the core message and any hashtags. Return only the improved post, nothing else.\n\n${text}`,
  "general": (text) =>
    `Improve the following text for clarity and professionalism. Return only the improved text, nothing else.\n\n${text}`,
};

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const limited = await enforceLimit(req, "adoni", session!.user.id);
  if (limited) return limited;

  let body: { text?: string; context?: string; campaignId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawText = (body.text ?? "").toString().trim();
  const context = ((body.context ?? "general") as EnhanceContext);

  if (!rawText) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (!PROMPTS[context]) {
    return NextResponse.json({ error: "Unknown context" }, { status: 400 });
  }

  const text = sanitizePrompt(rawText, 10_000);
  if (text === null) {
    return NextResponse.json({ error: "Invalid content" }, { status: 422 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ enhanced: text, stubbed: true });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: PROMPTS[context](text) }],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[adoni/enhance] anthropic error:", t);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const enhanced = data.content?.[0]?.text ?? text;
    return NextResponse.json({ enhanced });
  } catch (e) {
    console.error("[adoni/enhance] failed:", e);
    return NextResponse.json({ error: "AI service unreachable" }, { status: 502 });
  }
}
