import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { enforceLimit } from "@/lib/rate-limit-redis";
import { buildAdoniSystemPrompt } from "@/lib/adoni/knowledge-base";

type ChatMessage = { role: "user" | "assistant"; content: string };

function streamText(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function streamTextChunks(text: string): ReadableStream<Uint8Array> {
  const chunks = text.split(/(\s+)/).filter(Boolean);
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      controller.close();
    },
  });
}

async function completeWithAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Anthropic API error: ${response.status} ${details}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const fullText = (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .trim();

  return fullText || "I could not generate a response. Please try again.";
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const limited = await enforceLimit(req, "adoni", session?.user?.id);
  if (limited) return limited;

  let body: { page?: string; messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = (body.messages ?? []).filter((m) => m?.role && typeof m.content === "string");
  if (messages.length === 0) {
    return NextResponse.json({ error: "messages are required" }, { status: 400 });
  }

  const page = body.page ?? "unknown";

  const userRow = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { activeCampaignId: true },
  });
  const activeCampaignId = userRow?.activeCampaignId ?? null;

  const cid = activeCampaignId;
  const [campaign, contactCount, supporterCount, undecidedCount, volunteerCount, doorsKnocked, signsDeployed, donationsCount, donationsTotal] = await Promise.all([
    cid
      ? prisma.campaign.findUnique({
          where: { id: cid },
          select: { id: true, name: true, electionDate: true, electionType: true, jurisdiction: true },
        })
      : Promise.resolve(null),
    cid ? prisma.contact.count({ where: { campaignId: cid } }) : Promise.resolve(0),
    cid
      ? prisma.contact.count({
          where: { campaignId: cid, supportLevel: { in: ["strong_support", "leaning_support"] as never[] } },
        })
      : Promise.resolve(0),
    cid
      ? prisma.contact.count({
          where: { campaignId: cid, supportLevel: "undecided" as never },
        })
      : Promise.resolve(0),
    cid ? prisma.volunteerProfile.count({ where: { campaignId: cid } }) : Promise.resolve(0),
    cid
      ? prisma.interaction.count({ where: { contact: { campaignId: cid }, type: "door_knock" as never } })
      : Promise.resolve(0),
    cid
      ? prisma.sign.count({ where: { campaignId: cid } })
      : Promise.resolve(0),
    cid ? prisma.donation.count({ where: { campaignId: cid } }) : Promise.resolve(0),
    cid
      ? prisma.donation.aggregate({ where: { campaignId: cid }, _sum: { amount: true } }).then((r) => Number(r._sum.amount ?? 0))
      : Promise.resolve(0),
  ]);

  const daysToElection = campaign?.electionDate
    ? Math.ceil((campaign.electionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const systemPrompt = buildAdoniSystemPrompt({
    page,
    campaignName: campaign?.name ?? "No active campaign",
    daysToElection,
    contactCount,
    supporterCount,
    undecidedCount,
    volunteerCount,
    doorsKnocked,
    signsDeployed,
    donationsCount,
    donationsTotal: donationsTotal as number,
    electionType: campaign?.electionType ?? null,
    jurisdiction: campaign?.jurisdiction ?? null,
    province: null,
    userName: session?.user?.name ?? session?.user?.email ?? "Team Member",
  });

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  try {
    let assistantText = "";

    if (!process.env.ANTHROPIC_API_KEY) {
      assistantText =
        "Adoni is ready, but ANTHROPIC_API_KEY is not configured yet. Add it in Vercel environment variables to enable live strategy responses.";
    } else {
      assistantText = await completeWithAnthropic(process.env.ANTHROPIC_API_KEY, systemPrompt, messages);
    }

    const adoniConversation = (prisma as unknown as {
      adoniConversation: {
        create: (args: {
          data: {
            campaignId: string | null;
            userId: string;
            page: string;
            messages: Record<string, unknown>;
          };
        }) => Promise<unknown>;
      };
    }).adoniConversation;

    await adoniConversation.create({
      data: {
        campaignId: activeCampaignId,
        userId: session!.user.id,
        page,
        messages: {
          systemPrompt,
          user: lastUser,
          assistant: assistantText,
          createdAt: new Date().toISOString(),
        },
      },
    });

    const stream = process.env.ANTHROPIC_API_KEY ? streamTextChunks(assistantText) : streamText(assistantText);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[adoni/chat]", e);
    return NextResponse.json({ error: "Adoni chat failed" }, { status: 500 });
  }
}
