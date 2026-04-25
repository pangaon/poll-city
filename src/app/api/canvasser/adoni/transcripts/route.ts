/**
 * POST /api/canvasser/adoni/transcripts
 * Stores a voice transcript from the canvasser and returns a transcript ID.
 * The transcript is stored as an AdoniConversation for audit purposes.
 *
 * Body: { campaignId: string, contactId?: string, stopId?: string, text: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";
import { sanitizePrompt } from "@/lib/ai/sanitize-prompt";

const schema = z.object({
  campaignId: z.string().min(1),
  contactId: z.string().optional(),
  stopId: z.string().optional(),
  text: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { campaignId, contactId, stopId, text } = parsed.data;

  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";
  const membership = isSuperAdmin
    ? null
    : await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: session!.user.id, campaignId } },
        select: { id: true },
      });

  if (!isSuperAdmin && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const safeText = sanitizePrompt(text);

  const conversation = await prisma.adoniConversation.create({
    data: {
      userId: session!.user.id,
      campaignId,
      page: "canvasser",
      messages: [
        {
          role: "user",
          content: safeText,
          meta: { contactId: contactId ?? null, stopId: stopId ?? null },
          ts: new Date().toISOString(),
        },
      ],
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json(
    {
      data: {
        transcriptId: conversation.id,
        text: safeText,
        createdAt: conversation.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
