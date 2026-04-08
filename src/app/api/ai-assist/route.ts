import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { aiAssist } from "@/lib/ai";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizePrompt } from "@/lib/ai/sanitize-prompt";
import { anomaly } from "@/lib/security/anomaly";

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  // Anomaly: track AI request burst per user
  anomaly.aiRequestBurst(session!.user.id);

  let body: { action: string; campaignId: string; contactId?: string; prompt?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { action, campaignId, contactId } = body;
  if (!action || !campaignId) return NextResponse.json({ error: "action and campaignId are required" }, { status: 400 });

  // Sanitize the prompt field before it reaches the AI
  let cleanPrompt: string | undefined;
  if (body.prompt !== undefined) {
    const sanitized = sanitizePrompt(body.prompt, 2000);
    if (sanitized === null) {
      return NextResponse.json({ error: "Invalid prompt content" }, { status: 422 });
    }
    cleanPrompt = sanitized;
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    let result;

    if (action === "summarize_voter" && contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, campaignId },
        include: {
          interactions: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { type: true, notes: true, createdAt: true },
          },
        },
      });
      if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

      result = await aiAssist.summarizeVoterNotes(
        `${contact.firstName} ${contact.lastName}`,
        contact.notes ?? "",
        contact.interactions.map((i) => ({
          type: i.type,
          notes: i.notes ?? "",
          createdAt: i.createdAt.toISOString().split("T")[0],
        }))
      );
    } else if (action === "generate_script" && contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, campaignId },
        select: { firstName: true, lastName: true, issues: true, supportLevel: true },
      });
      if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

      result = await aiAssist.generateScript(
        `${contact.firstName} ${contact.lastName}`,
        contact.issues,
        contact.supportLevel
      );
    } else if (action === "chat" && cleanPrompt) {
      result = await aiAssist.complete({
        messages: [{ role: "user", content: cleanPrompt }],
      });
    } else {
      return NextResponse.json({ error: "Invalid action or missing required fields" }, { status: 400 });
    }

    return NextResponse.json({ data: result });
  } catch (e) {
    console.error("AI Assist error:", e);
    return NextResponse.json({ error: "AI request failed", details: (e as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;
  return NextResponse.json({ isMock: aiAssist.isMockMode() });
}
