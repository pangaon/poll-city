import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { enforceLimit } from "@/lib/rate-limit-redis";
import { loadBrandKit } from "@/lib/brand/brand-kit";
import { sanitizePrompt } from "@/lib/ai/sanitize-prompt";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type GenKind =
  | "press-release"
  | "canvass-script"
  | "social-post"
  | "fundraising-email"
  | "video-script"
  | "pamphlet-copy"
  | "social-calendar";

const PROMPTS: Record<GenKind, (brief: string, ctx: string) => string> = {
  "press-release": (brief, ctx) =>
    `Write a professional Canadian election campaign press release.\n${ctx}\nTopic / announcement: ${brief}\n\nFormat:\nFOR IMMEDIATE RELEASE\nHeadline\nSub-head\nDate, City — lead paragraph\nBody with 2 supporting paragraphs\nOne pull-quote from the candidate\nCall to action\n-30-\nMedia contact line.`,
  "canvass-script": (brief, ctx) =>
    `Write a door-knock canvassing script for a Canadian campaign.\n${ctx}\nScenario: ${brief}\n\nStructure:\n1) Greeting and identification (1 sentence)\n2) Question to engage the voter (1 sentence)\n3) Short pitch on the candidate's top issue (2 sentences max)\n4) Ask for support and commitment to vote (1 sentence)\n5) Fallback for undecided or opposition.\nKeep every line under 20 words. Warm, direct, Canadian tone.`,
  "social-post": (brief, ctx) =>
    `Write 3 social media post variants for a Canadian candidate.\n${ctx}\nTopic: ${brief}\n\nReturn three separate posts:\n- Version A (Twitter/X, max 280 chars, 2 hashtags)\n- Version B (Facebook, 2-3 sentences, warm tone, one CTA)\n- Version C (Instagram caption, 4-6 short lines, 3 hashtags)\nLabel each clearly. No emojis unless natural.`,
  "fundraising-email": (brief, ctx) =>
    `Write a campaign fundraising email.\n${ctx}\nPurpose: ${brief}\n\nInclude:\n- Subject line\n- Personal salutation placeholder {{FIRST_NAME}}\n- Opening hook (1-2 sentences)\n- Specific ask with donation amount suggestion\n- Impact statement (what the money does)\n- Clear CTA with link\n- Sign-off with candidate name\nCanadian tone. Urgent but not panicked. Max 200 words total.`,
  "video-script": (brief, ctx) =>
    `Write a 60-second campaign video script.\n${ctx}\nTopic: ${brief}\n\nFormat as a shot list:\n[SCENE 1 — 0:00-0:10] visual + voiceover\n[SCENE 2 — 0:10-0:20] visual + voiceover\n(continue to 0:60)\nEnd with a strong CTA and candidate name/office overlay.`,
  "pamphlet-copy": (brief, ctx) =>
    `Write pamphlet copy for a printed campaign flyer.\n${ctx}\nAngle: ${brief}\n\nSections:\n- Front headline (max 8 words)\n- Sub-head (1 sentence)\n- 3 bullet-point issues with 1-sentence explanations\n- Call-out quote from candidate\n- Back panel: bio paragraph (80 words) + contact info placeholder`,
  "social-calendar": (brief, ctx) =>
    `Produce a 2-week social content calendar for a Canadian campaign.\n${ctx}\nCurrent focus: ${brief}\n\nReturn as a markdown table with columns: Day | Platform | Post | Asset needed | CTA. 14 rows. Mix door-knock updates, issue pieces, volunteer asks, testimonials, event promos.`,
};

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const limited = await enforceLimit(req, "adoni", session!.user.id);
  if (limited) return limited;

  let body: { kind?: string; brief?: string; campaignId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const kind = body.kind as GenKind;
  const rawBrief = (body.brief ?? "").toString().trim();
  const campaignId = body.campaignId;

  if (!PROMPTS[kind]) {
    return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  }
  if (!rawBrief) {
    return NextResponse.json({ error: "Brief is required" }, { status: 400 });
  }

  // Sanitize brief before building the AI prompt
  const brief = sanitizePrompt(rawBrief, 1000);
  if (brief === null) {
    return NextResponse.json({ error: "Invalid prompt content" }, { status: 422 });
  }

  // Build campaign context
  let ctxLine = "";
  if (campaignId) {
    const m = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    });
    if (m) {
      const brand = await loadBrandKit(campaignId);
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { electionDate: true, jurisdiction: true, candidateTitle: true },
      });
      const days = campaign?.electionDate
        ? Math.max(0, Math.ceil((campaign.electionDate.getTime() - Date.now()) / 86400000))
        : null;
      ctxLine = [
        `Candidate: ${brand.candidateName ?? brand.campaignName}`,
        campaign?.candidateTitle ? `Running for: ${campaign.candidateTitle}` : "",
        campaign?.jurisdiction ? `Riding/ward: ${campaign.jurisdiction}` : "",
        days !== null ? `Days to election: ${days}` : "",
        brand.tagline ? `Tagline: ${brand.tagline}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
  }

  const prompt = PROMPTS[kind](brief, ctxLine ? `Campaign context:\n${ctxLine}` : "");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful fallback — return a templated stub
    return NextResponse.json({
      text: `[Anthropic key not configured — returning outline]\n\n${prompt}`,
      stubbed: true,
    });
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[adoni/generate] anthropic error:", text);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = data.content?.[0]?.text ?? "";
    return NextResponse.json({ text });
  } catch (e) {
    console.error("[adoni/generate] failed:", e);
    return NextResponse.json({ error: "AI service unreachable" }, { status: 502 });
  }
}
