import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { aiAssist } from "@/lib/ai";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: { action: string; campaignId: string; contactId?: string; prompt?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { action, campaignId, contactId, prompt } = body;
  if (!action || !campaignId) return NextResponse.json({ error: "action and campaignId are required" }, { status: 400 });

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
    } else if (action === "chat" && prompt) {
      result = await aiAssist.complete({
        messages: [{ role: "user", content: prompt.slice(0, 8000) }],
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
