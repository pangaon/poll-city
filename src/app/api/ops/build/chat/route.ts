import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = { role: "user" | "assistant"; content: string | ContentBlock[] };
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

// ─── System prompt ────────────────────────────────────────────────────────────

const BUILD_SYSTEM_PROMPT = `You are the Poll City Build Console — George Hatzis's private developer AI, embedded directly into the platform.

ABOUT GEORGE: Founder of Poll City. 35 years in Canadian politics. Builds fast, thinks in systems. He trusts you — don't abuse it.

ABOUT THIS PLATFORM:
Poll City is a full-stack political campaign platform for Canadian candidates and parties.
Stack: Next.js 14 App Router + TypeScript strict + Prisma + PostgreSQL (Railway) + Vercel.
Three products in one monolith:
- Campaign App (app.poll.city) — CRM, canvassing, GOTV, donations, comms
- Poll City Social (social.poll.city) — civic engagement for the public
- Intelligence Engine — approval ratings, AI content, analytics

ARCHITECTURE NON-NEGOTIABLES:
1. Single monolith. One Next.js app. One Vercel project. One Railway PostgreSQL.
2. Multi-tenant always. Every DB query on campaign data must be scoped by campaignId. Leaking one campaign's data to another is catastrophic.
3. Dynamic route naming is a contract. /api/events/[eventId] vs /api/polls/[id] use different slug names at the same level. Mismatched slugs crash the build.
4. Prisma schema changes require a migration. Always: npx prisma migrate dev --name <desc> --skip-seed. Never use db push in production.
5. Soft deletes everywhere. Contact, Task, Sign, Volunteer, Donation, Event have deletedAt. Always filter deletedAt: null.
6. Auth: API routes use apiAuth(req) from @/lib/auth/helpers. Server components use getServerSession(authOptions). Using the wrong one silently fails.

SECURITY RULES:
- Every API route authenticates before doing anything.
- Campaign data always scoped by campaignId + membership verified.
- Never log or return raw error objects to the client. Use @/lib/api/errors.ts.
- User input going to Claude must pass through sanitizePrompt() from @/lib/ai/sanitize-prompt.ts.
- Rate limiting: public endpoints use rateLimit(req, "api"), forms use rateLimit(req, "form").
- SUPER_ADMIN routes check session.user.role === "SUPER_ADMIN" explicitly. Never rely on middleware alone.

BUILD RULES:
- npm run build must exit 0 before any git push. Zero exceptions.
- npx tsc --noEmit must also exit 0.
- A passing tsc with a failing build is a lie.
- "It's live" means Vercel deployment is green, not just "I pushed the code."

ANTI-HALLUCINATION:
- Never claim a file exists without verifying it.
- Never claim a function exists without grepping for it.
- Never claim a Prisma field exists without reading the schema.
- Never write an import without confirming the export exists.
- If uncertain: say "I haven't verified this — let me check."

CODE STANDARDS:
- TypeScript strict. No any.
- Read files before editing them.
- No gold-plating. Build exactly what was asked.
- framer-motion for all animations. Spring physics: { type: "spring", stiffness: 300, damping: 30 }.
- Palette: Navy #0A2342, Green #1D9E75, Amber #EF9F27, Red #E24B4A.
- Mobile-first. Every component must work at 390px.

ADONI LAWS (never break these):
- No bullet points, headers, or markdown in Adoni responses.
- Max 8 sentences per response.
- Canadian English.
- Warm, direct, professional tone.

YOUR ROLE IN THIS CONSOLE:
You are George's technical partner. You:
- Answer questions about the codebase precisely (always cite file:line)
- Audit code for security, correctness, and connection completeness
- Trace connection chains — what is connected, what should be connected
- Check deployment status and platform health using your tools
- Review files George drops into the chat
- Help plan features and trace their full impact before building
- Never guess — verify before stating

COMMUNICATION STYLE:
- Lead with the result, not the reasoning
- Every code reference includes file path and line number
- Risks go first, not last
- Be concise — George reads diffs
- Use markdown — this is a dev console, not Adoni
- One recommendation, not options`;

// ─── Tool definitions ─────────────────────────────────────────────────────────

const BUILD_TOOLS = [
  {
    name: "check_recent_deployments",
    description:
      "Check recent Vercel deployment notifications logged by the webhook. Shows success/failure status and timestamps.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of recent deployments to return (default 10, max 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "check_ops_alerts",
    description: "Check active ops alerts and recent platform alerts ordered by severity.",
    input_schema: {
      type: "object",
      properties: {
        includeResolved: {
          type: "boolean",
          description: "Include already-resolved alerts (default false)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_platform_stats",
    description:
      "Get platform-wide statistics: campaign count, user count, active contacts, memberships.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "check_env_status",
    description:
      "Check which critical environment variables are configured. Returns boolean presence only — never exposes values.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

async function executeBuildTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "check_recent_deployments": {
      const limit =
        typeof input.limit === "number" ? Math.min(Math.max(1, input.limit), 20) : 10;
      const notifs = await prisma.operatorNotification.findMany({
        where: { type: { in: ["deploy_success", "deploy_failure"] } },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      if (notifs.length === 0) {
        return "No deployment notifications in the log. Either the Vercel webhook is not configured or no deploys have fired since it was set up.";
      }
      return notifs
        .map(
          (n) =>
            `[${n.type === "deploy_failure" ? "FAIL" : "OK  "}] ${n.title} — ${n.body} (${n.createdAt.toISOString()})`
        )
        .join("\n");
    }

    case "check_ops_alerts": {
      const includeResolved = input.includeResolved === true;
      const alerts = await prisma.opsAlert.findMany({
        where: includeResolved ? {} : { read: false },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: 20,
      });
      if (alerts.length === 0) {
        return includeResolved ? "No ops alerts in the system." : "No active ops alerts. All clear.";
      }
      return alerts
        .map(
          (a) =>
            `[${a.severity.toUpperCase().padEnd(8)}] ${a.title}: ${a.body} (${a.read ? "resolved" : "ACTIVE"}, ${a.createdAt.toISOString()})`
        )
        .join("\n");
    }

    case "get_platform_stats": {
      const [campaignCount, userCount, contactCount, memberCount, volunteerCount] =
        await Promise.all([
          prisma.campaign.count(),
          prisma.user.count(),
          prisma.contact.count({ where: { deletedAt: null } }),
          prisma.membership.count(),
          prisma.volunteerProfile.count(),
        ]);
      return [
        `Platform statistics (live):`,
        `  Campaigns:    ${campaignCount}`,
        `  Users:        ${userCount}`,
        `  Contacts:     ${contactCount} (soft-delete filtered)`,
        `  Memberships:  ${memberCount}`,
        `  Volunteers:   ${volunteerCount}`,
      ].join("\n");
    }

    case "check_env_status": {
      const criticalVars = [
        "ANTHROPIC_API_KEY",
        "DATABASE_URL",
        "NEXTAUTH_SECRET",
        "NEXTAUTH_URL",
        "VERCEL_WEBHOOK_SECRET",
        "CRON_SECRET",
        "IP_HASH_SALT",
        "POLL_ANONYMITY_SALT",
        "GUEST_TOKEN_SECRET",
        "VAPID_PUBLIC_KEY",
        "VAPID_PRIVATE_KEY",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
      ];
      const lines = criticalVars.map(
        (v) => `  ${process.env[v] ? "✓" : "✗"} ${v}`
      );
      return `Environment variable status:\n${lines.join("\n")}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ─── Streaming helpers ────────────────────────────────────────────────────────

function streamText(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
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
        await new Promise<void>((resolve) => setTimeout(resolve, 8));
      }
      controller.close();
    },
  });
}

// ─── Agentic loop ─────────────────────────────────────────────────────────────

async function completeWithAnthropic(
  apiKey: string,
  messages: ChatMessage[]
): Promise<string> {
  const MAX_ROUNDS = 4;
  const wireMessages: Array<{ role: string; content: string | ContentBlock[] }> =
    messages.map((m) => ({ role: m.role, content: m.content }));

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
        max_tokens: 4096,
        system: BUILD_SYSTEM_PROMPT,
        messages: wireMessages,
        tools: BUILD_TOOLS,
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`Anthropic API error: ${response.status} ${details}`);
    }

    const data = (await response.json()) as {
      content?: Array<{
        type: string;
        text?: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
      }>;
      stop_reason?: string;
    };

    const blocks = data.content ?? [];
    const toolCalls = blocks.filter((b) => b.type === "tool_use");

    if (toolCalls.length === 0) {
      const text = blocks
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("")
        .trim();
      return text || "No response generated. Please try again.";
    }

    wireMessages.push({ role: "assistant", content: blocks as ContentBlock[] });

    const toolResults: ContentBlock[] = [];
    for (const call of toolCalls) {
      if (!call.id || !call.name) continue;
      const result = await executeBuildTool(call.name, call.input ?? {});
      toolResults.push({ type: "tool_result", tool_use_id: call.id, content: result });
    }
    wireMessages.push({ role: "user", content: toolResults });
  }

  return "Reached the tool call limit. Please rephrase your request.";
}

// ─── Route handler ────────────────────────────────────────────────────────────

type RequestBody = {
  messages?: unknown;
  fileContent?: unknown;
  fileName?: unknown;
};

export async function POST(req: NextRequest) {
  const { error } = await apiAuth(req, [Role.SUPER_ADMIN]);
  if (error) return error;

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMessage[] = rawMessages.reduce<ChatMessage[]>((acc, item) => {
    if (!item || typeof (item as Record<string, unknown>).content !== "string") return acc;
    const raw = item as Record<string, unknown>;
    const role =
      raw.role === "assistant" ? "assistant" : raw.role === "user" ? "user" : null;
    if (!role) return acc;
    acc.push({ role, content: raw.content as string });
    return acc;
  }, []);

  if (messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  // Prepend file content to last user message if attached
  const fileContent = typeof body.fileContent === "string" ? body.fileContent : null;
  const fileName = typeof body.fileName === "string" ? body.fileName : null;
  if (fileContent && fileName) {
    const lastIdx = messages.length - 1;
    const last = messages[lastIdx];
    if (last.role === "user" && typeof last.content === "string") {
      // Truncate at 50k chars — Anthropic context limit safety valve
      const truncated =
        fileContent.length > 50000
          ? fileContent.slice(0, 50000) + "\n\n[... file truncated at 50,000 chars ...]"
          : fileContent;
      messages[lastIdx] = {
        role: "user",
        content: `${last.content}\n\n--- Attached file: ${fileName} ---\n\`\`\`\n${truncated}\n\`\`\``,
      };
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      streamText(
        "ANTHROPIC_API_KEY is not configured. Add it to your Vercel environment variables to enable the Build Console."
      ),
      { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } }
    );
  }

  try {
    const text = await completeWithAnthropic(apiKey, messages);
    return new Response(streamTextChunks(text), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[ops/build/chat]", e);
    return NextResponse.json({ error: "Build console request failed" }, { status: 500 });
  }
}
