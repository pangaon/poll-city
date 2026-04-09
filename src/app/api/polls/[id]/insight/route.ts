/**
 * POST /api/polls/[id]/insight
 *
 * Generates an AI summary/insight for a poll based on current results.
 * Called after a user votes. Returns a one-paragraph plain-English analysis.
 * Returns empty insight if AI is unavailable or poll has < 5 responses.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { aiAssist } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

const MIN_RESPONSES = 5;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = await rateLimit(req, "read");
  if (limited) return limited;

  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    include: {
      options: {
        include: { _count: { select: { responses: true } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!poll) return NextResponse.json({ insight: null }, { status: 200 });
  if (poll.totalResponses < MIN_RESPONSES) {
    return NextResponse.json({ insight: null, reason: "Not enough responses yet" });
  }

  // Build result summary for the prompt
  let resultSummary = "";

  if (poll.type === "binary") {
    const responses = await prisma.pollResponse.groupBy({
      by: ["value"],
      where: { pollId: poll.id },
      _count: true,
    });
    const total = responses.reduce((s, r) => s + r._count, 0) || 1;
    const yes = responses.find((r) => r.value === "yes")?._count ?? 0;
    const no = responses.find((r) => r.value === "no")?._count ?? 0;
    resultSummary = `${Math.round((yes / total) * 100)}% Yes, ${Math.round((no / total) * 100)}% No (${total} total votes)`;
  } else if (poll.type === "multiple_choice") {
    const total = poll.options.reduce((s, o) => s + o._count.responses, 0) || 1;
    const sorted = [...poll.options].sort((a, b) => b._count.responses - a._count.responses);
    resultSummary = sorted
      .map((o) => `"${o.text}" — ${Math.round((o._count.responses / total) * 100)}%`)
      .join(", ");
  } else if (poll.type === "slider") {
    const responses = await prisma.pollResponse.findMany({
      where: { pollId: poll.id },
      select: { value: true },
    });
    const values = responses.map((r) => parseFloat(r.value ?? "")).filter((v) => !isNaN(v));
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    resultSummary = `Average score: ${avg.toFixed(1)}/100 (${values.length} responses)`;
  } else if (poll.type === "ranked") {
    const rankedData = await Promise.all(
      poll.options.map(async (opt) => {
        const rows = await prisma.pollResponse.findMany({
          where: { pollId: poll.id, optionId: opt.id },
          select: { rank: true },
        });
        const valid = rows.map((r) => r.rank).filter((r): r is number => r !== null);
        const avg = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 999;
        return { text: opt.text, avgRank: avg };
      })
    );
    rankedData.sort((a, b) => a.avgRank - b.avgRank);
    resultSummary = rankedData.map((r, i) => `${i + 1}. "${r.text}"`).join(", ");
  } else {
    return NextResponse.json({ insight: null });
  }

  const prompt = `Poll question: "${poll.question}"
${poll.description ? `Context: ${poll.description}` : ""}
Region: ${poll.targetRegion ?? "Canada"}
Total responses: ${poll.totalResponses}
Results: ${resultSummary}

Write a 2-3 sentence plain-English insight about what these poll results tell us about voter sentiment. Be specific about what the numbers mean. Do not use bullet points or markdown. Do not start with "Based on" or "The results show". Use a direct, campaign-manager voice.`;

  try {
    const result = await aiAssist.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: "You are a senior Canadian political analyst. You interpret poll results for campaign managers. Your insights are direct, factual, and actionable. Never hedge excessively. Never use bullet points or markdown headers.",
      maxTokens: 200,
      temperature: 0.5,
    });

    const insight = result.text.trim().slice(0, 400);
    return NextResponse.json({ insight, isMock: result.isMock });
  } catch {
    return NextResponse.json({ insight: null });
  }
}
