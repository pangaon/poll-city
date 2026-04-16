/**
 * POST /api/briefing/adoni-summary
 *
 * Generates Adoni's morning narrative for the daily briefing.
 * Accepts pre-fetched briefing data in the body so this endpoint
 * doesn't double-query the DB — the briefing page already has the data.
 *
 * Returns: { summary: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { enforceLimit } from "@/lib/rate-limit-redis";
import { sanitizePrompt } from "@/lib/ai/sanitize-prompt";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface BriefingSnapshot {
  campaignName: string;
  candidateName: string | null;
  daysToElection: number | null;
  phase: string;
  doorsKnockedYesterday: number;
  newSupportersYesterday: number;
  donationsYesterday: number;
  donationAmountYesterday: number;
  doorsThisWeek: number;
  doorsWoWChange: number;
  supportRate: number;
  totalContacts: number;
  totalSupporters: number;
  volunteers: { active: number; quiet: number; newThisWeek: number };
  overdueTasks: number;
  redFlags: string[];
  priorities: { priority: number; action: string; why: string }[];
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: { campaignId?: string; snapshot?: BriefingSnapshot };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { campaignId, snapshot } = body;
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "analytics:read");
  if (forbidden) return forbidden;

  const limited = await enforceLimit(req, "adoni", session!.user.id);
  if (limited) return limited;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful fallback without AI
    return NextResponse.json({
      summary: buildFallbackSummary(snapshot),
      stubbed: true,
    });
  }

  const prompt = buildPrompt(snapshot);
  const sanitized = sanitizePrompt(prompt, 3000);
  if (!sanitized) {
    return NextResponse.json({ error: "Invalid prompt content" }, { status: 422 });
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
        max_tokens: 300,
        messages: [{ role: "user", content: sanitized }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[briefing/adoni-summary] anthropic error:", text);
      return NextResponse.json({ summary: buildFallbackSummary(snapshot), stubbed: true });
    }

    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const summary = data.content?.[0]?.text?.trim() ?? buildFallbackSummary(snapshot);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error("[briefing/adoni-summary] failed:", e);
    return NextResponse.json({ summary: buildFallbackSummary(snapshot), stubbed: true });
  }
}

function buildPrompt(s: BriefingSnapshot | undefined): string {
  if (!s) {
    return "You are Adoni, a senior campaign manager. Write one warm, direct paragraph (3-5 sentences, no bullet points, no markdown, no headers) giving a general morning briefing: the team is working hard, stay focused on the door-knock, and keep the donors warm.";
  }

  const phaseLabel =
    s.phase === "GOTV_FINAL" ? "final GOTV push"
    : s.phase === "GOTV_EARLY" ? "early GOTV phase"
    : s.phase === "MOMENTUM" ? "momentum-building phase"
    : s.phase === "ELECTION_DAY" ? "Election Day"
    : s.phase === "POST_ELECTION" ? "post-election period"
    : "early foundation phase";

  const lines: string[] = [
    `Campaign: ${s.campaignName}`,
    s.candidateName ? `Candidate: ${s.candidateName}` : "",
    s.daysToElection !== null ? `Days to election: ${s.daysToElection}` : "",
    `Campaign phase: ${phaseLabel}`,
    "",
    "Yesterday's activity:",
    `  Doors knocked: ${s.doorsKnockedYesterday}`,
    `  New supporters: ${s.newSupportersYesterday}`,
    `  Donations: ${s.donationsYesterday} ($${s.donationAmountYesterday.toLocaleString()})`,
    "",
    "This week:",
    `  Doors knocked: ${s.doorsThisWeek} (${s.doorsWoWChange >= 0 ? "+" : ""}${s.doorsWoWChange}% vs last week)`,
    `  Support rate: ${s.supportRate}%`,
    `  Total contacts in database: ${s.totalContacts}`,
    `  Confirmed supporters: ${s.totalSupporters}`,
    "",
    `Team: ${s.volunteers.active} active volunteers${s.volunteers.quiet > 0 ? `, ${s.volunteers.quiet} gone quiet` : ""}${s.volunteers.newThisWeek > 0 ? `, ${s.volunteers.newThisWeek} new this week` : ""}`,
    s.overdueTasks > 0 ? `Overdue tasks: ${s.overdueTasks}` : "No overdue tasks",
    s.redFlags.length > 0 ? `Red flags: ${s.redFlags.join("; ")}` : "",
    s.priorities.length > 0
      ? `Today's top priorities: ${s.priorities.map((p) => p.action).join("; ")}`
      : "",
  ].filter(Boolean);

  return [
    "You are Adoni, a senior Canadian campaign manager. Based on this morning briefing data, write one warm, direct, professional paragraph (3-5 sentences maximum). No bullet points. No markdown. No headers. No emojis. Canadian English (colour, neighbour, programme). Address the candidate directly as \"you.\" Be honest about what needs attention without being alarmist. End with one specific action to focus on today.",
    "",
    lines.join("\n"),
  ].join("\n");
}

function buildFallbackSummary(s: BriefingSnapshot | undefined): string {
  if (!s) {
    return "Your campaign team is working hard this morning. Stay focused on the doors and keep the volunteer energy high — that is where elections are won.";
  }

  const parts: string[] = [];

  if (s.daysToElection !== null && s.daysToElection > 0) {
    parts.push(`With ${s.daysToElection} days to election, every hour counts.`);
  }

  if (s.doorsKnockedYesterday > 0) {
    parts.push(`Yesterday the team knocked ${s.doorsKnockedYesterday} doors and brought in ${s.newSupportersYesterday} new supporters — solid work.`);
  }

  if (s.doorsWoWChange < -10) {
    parts.push("Door-knock pace is down from last week, so the team needs to step it up today.");
  } else if (s.doorsWoWChange >= 10) {
    parts.push("Canvassing is up compared to last week — keep that momentum going.");
  }

  if (s.redFlags.length > 0) {
    parts.push(`Watch closely: ${s.redFlags[0].toLowerCase()}`);
  }

  if (s.priorities.length > 0) {
    parts.push(`Your top priority today: ${s.priorities[0].action.toLowerCase()}`);
  }

  return parts.join(" ") || "Your campaign is on track. Keep pushing the doors and the phones — that is where this race is won.";
}
