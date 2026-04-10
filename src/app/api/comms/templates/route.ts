import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"] as const;

function extractTokens(text: string): string[] {
  const matches = text.match(/\{\{[a-zA-Z]+\}\}/g) ?? [];
  return Array.from(new Set(matches));
}

// ─── GET /api/comms/templates ─────────────────────────────────────────────────
// List message templates for a campaign. Optional ?channel filter.
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  const channel = searchParams.get("channel") as "email" | "sms" | "push" | null;

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const templates = await prisma.messageTemplate.findMany({
    where: {
      campaignId,
      isActive: true,
      deletedAt: null,
      ...(channel ? { channel } : {}),
    },
    select: {
      id: true,
      channel: true,
      name: true,
      subject: true,
      bodyHtml: true,
      bodyText: true,
      previewText: true,
      tokensUsed: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ templates });
}

// ─── POST /api/comms/templates ────────────────────────────────────────────────
// Create a new message template.
const createSchema = z.object({
  campaignId: z.string().min(1),
  channel: z.enum(["email", "sms", "push"]),
  name: z.string().min(1).max(200),
  subject: z.string().max(200).optional(),
  bodyHtml: z.string().max(100_000).optional(),
  bodyText: z.string().min(1).max(5_000),
  previewText: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { campaignId, channel, name, subject, bodyHtml, bodyText, previewText } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !MANAGER_ROLES.includes(membership.role as typeof MANAGER_ROLES[number])) {
    return NextResponse.json({ error: "Admin or Campaign Manager required" }, { status: 403 });
  }

  const sanitizedText = sanitizeUserText(bodyText) ?? bodyText;
  const sanitizedHtml = bodyHtml ? (sanitizeUserText(bodyHtml) ?? bodyHtml) : undefined;
  const allText = `${sanitizedText} ${sanitizedHtml ?? ""} ${subject ?? ""}`;
  const tokensUsed = extractTokens(allText);

  const template = await prisma.messageTemplate.create({
    data: {
      campaignId,
      createdById: session!.user.id,
      channel,
      name: sanitizeUserText(name) ?? name,
      subject: subject ? (sanitizeUserText(subject) ?? subject) : undefined,
      bodyHtml: sanitizedHtml,
      bodyText: sanitizedText,
      previewText: previewText ? (sanitizeUserText(previewText) ?? previewText) : undefined,
      tokensUsed,
    },
    select: {
      id: true,
      channel: true,
      name: true,
      subject: true,
      bodyHtml: true,
      bodyText: true,
      previewText: true,
      tokensUsed: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
