import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { enforceLimit } from "@/lib/rate-limit-redis";
import { buildAdoniSystemPrompt } from "@/lib/adoni/knowledge-base";
import { ADONI_TOOLS, executeAction, checkSuspiciousActivity, type ActionContext } from "@/lib/adoni/actions";
import { loadMemory, updateMemory } from "@/lib/adoni/memory";
import { detectPromptInjection, logSecurityThreat } from "@/lib/security/monitor";
import { resolvePermissions } from "@/lib/permissions/engine";

type ChatMessage = { role: "user" | "assistant"; content: string | ContentBlock[] };
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

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

// Agentic loop: send messages → if Anthropic returns tool_use, execute tools,
// feed results back, and let Anthropic summarise. Max 5 tool rounds.
async function completeWithAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  actionCtx: ActionContext | null,
): Promise<string> {
  const MAX_ROUNDS = 5;
  // Build wire-format messages (Anthropic expects content blocks for tool results)
  const wireMessages: Array<{ role: string; content: string | ContentBlock[] }> = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: wireMessages,
        ...(actionCtx ? { tools: ADONI_TOOLS } : {}),
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`Anthropic API error: ${response.status} ${details}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
      stop_reason?: string;
    };

    const blocks = data.content ?? [];

    // If no tool_use blocks, extract text and return
    const toolCalls = blocks.filter((b) => b.type === "tool_use");
    if (toolCalls.length === 0 || !actionCtx) {
      const text = blocks
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
        .trim();
      return text || "I could not generate a response. Please try again.";
    }

    // Execute each tool call against the real database
    wireMessages.push({ role: "assistant", content: blocks as ContentBlock[] });

    const toolResults: ContentBlock[] = [];
    for (const call of toolCalls) {
      if (!call.id || !call.name) continue;
      const result = await executeAction(call.name, call.input ?? {}, actionCtx);
      toolResults.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: result.message,
      });
    }
    wireMessages.push({ role: "user", content: toolResults });
  }

  return "I ran into a loop trying to complete your request. Could you try rephrasing?";
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

  // Resolve enterprise permissions early (used in system prompt + action context)
  const resolved = cid ? await resolvePermissions(session!.user.id, cid) : null;

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
    permissions: resolved?.permissions,
    trustLevel: resolved?.trustLevel,
    roleName: resolved?.roleName,
  });

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  // Prompt injection guard — deflect naturally, log silently
  if (typeof lastUser === "string" && detectPromptInjection(lastUser)) {
    await logSecurityThreat({
      type: "prompt_injection",
      severity: "high",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
      userAgent: req.headers.get("user-agent"),
      userId: session!.user.id,
      route: "/api/adoni/chat",
      details: { snippet: lastUser.slice(0, 100) },
    });
    const deflection = streamText("I'm here to help with your campaign! What can we work on together?");
    return new Response(deflection, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  // Load user memory for personalisation
  const memory = activeCampaignId
    ? await loadMemory(session!.user.id, activeCampaignId)
    : null;

  // Inject memory context into system prompt if available
  const memoryContext = memory
    ? [
        memory.prefersBrief ? "\nUSER PREFERENCE: keep responses under 100 words unless asked for detail." : "",
        memory.openItems.length > 0 ? `\nOPEN ITEMS FROM LAST CONVERSATION: ${memory.openItems.slice(-3).join("; ")}` : "",
        memory.decisions.length > 0 ? `\nCAMPAIGN DECISIONS TO REMEMBER: ${memory.decisions.slice(-5).join("; ")}` : "",
        memory.facts.length > 0 ? `\nCAMPAIGN FACTS: ${memory.facts.slice(-5).join("; ")}` : "",
      ].filter(Boolean).join("")
    : "";
  const fullSystemPrompt = systemPrompt + memoryContext;

  try {
    let assistantText = "";

    if (!process.env.ANTHROPIC_API_KEY) {
      assistantText =
        "Adoni is ready, but ANTHROPIC_API_KEY is not configured yet. Add it in Vercel environment variables to enable live strategy responses.";
    } else {
      // Suspicious activity check for low-permission roles
      let userRole = "VOLUNTEER";
      let autoExecuteEnabled = true; // default on — campaign can disable
      if (activeCampaignId) {
        const [membership, campaignSettings] = await Promise.all([
          prisma.membership.findUnique({
            where: { userId_campaignId: { userId: session!.user.id, campaignId: activeCampaignId } },
            select: { role: true },
          }),
          prisma.campaign.findUnique({
            where: { id: activeCampaignId },
            select: { customization: true },
          }),
        ]);
        userRole = membership?.role ?? "VOLUNTEER";
        const custom = campaignSettings?.customization as Record<string, unknown> | null;
        if (custom && typeof custom.adoniAutoExecute === "boolean") {
          autoExecuteEnabled = custom.adoniAutoExecute;
        }

        // Suspicious activity detection for canvassers/volunteers
        const plainMessages = messages
          .filter((m) => typeof m.content === "string")
          .map((m) => ({ role: String(m.role), content: String(m.content) }));
        await checkSuspiciousActivity(session!.user.id, activeCampaignId, userRole, plainMessages);
      }
      const actionCtx: ActionContext | null = activeCampaignId
        ? { userId: session!.user.id, campaignId: activeCampaignId, userName: session?.user?.name ?? "Team Member", userRole, permissions: resolved?.permissions ?? [], trustLevel: resolved?.trustLevel ?? 2, autoExecuteEnabled }
        : null;
      assistantText = await completeWithAnthropic(process.env.ANTHROPIC_API_KEY, fullSystemPrompt, messages, actionCtx);

      // Update user memory from this conversation turn
      if (activeCampaignId && memory && typeof lastUser === "string") {
        updateMemory(session!.user.id, activeCampaignId, lastUser, memory).catch(() => {});
      }
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
