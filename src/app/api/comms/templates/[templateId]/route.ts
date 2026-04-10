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

async function resolveTemplate(templateId: string, userId: string) {
  const template = await prisma.messageTemplate.findUnique({
    where: { id: templateId, deletedAt: null },
    select: { id: true, campaignId: true },
  });
  if (!template) return null;
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: template.campaignId } },
  });
  return membership ? { template, membership } : null;
}

// ─── GET /api/comms/templates/[templateId] ───────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { templateId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const resolved = await resolveTemplate(params.templateId, session!.user.id);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const template = await prisma.messageTemplate.findUnique({
    where: { id: params.templateId },
    select: {
      id: true,
      channel: true,
      name: true,
      subject: true,
      bodyHtml: true,
      bodyText: true,
      previewText: true,
      tokensUsed: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ template });
}

// ─── PUT /api/comms/templates/[templateId] ───────────────────────────────────
const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().max(200).optional().nullable(),
  bodyHtml: z.string().max(100_000).optional().nullable(),
  bodyText: z.string().min(1).max(5_000).optional(),
  previewText: z.string().max(300).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { templateId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const resolved = await resolveTemplate(params.templateId, session!.user.id);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!MANAGER_ROLES.includes(resolved.membership.role as typeof MANAGER_ROLES[number])) {
    return NextResponse.json({ error: "Admin or Campaign Manager required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, subject, bodyHtml, bodyText, previewText, isActive } = parsed.data;

  // Recompute tokens if body changed
  let tokensUsed: string[] | undefined;
  if (bodyText || bodyHtml) {
    const current = await prisma.messageTemplate.findUnique({
      where: { id: params.templateId },
      select: { bodyText: true, bodyHtml: true, subject: true },
    });
    const newBodyText = bodyText ?? current?.bodyText ?? "";
    const newBodyHtml = bodyHtml !== undefined ? bodyHtml : (current?.bodyHtml ?? "");
    const newSubject = subject !== undefined ? subject : (current?.subject ?? "");
    tokensUsed = extractTokens(`${newBodyText} ${newBodyHtml ?? ""} ${newSubject ?? ""}`);
  }

  const template = await prisma.messageTemplate.update({
    where: { id: params.templateId },
    data: {
      ...(name !== undefined ? { name: sanitizeUserText(name) ?? name } : {}),
      ...(subject !== undefined ? { subject: subject ? (sanitizeUserText(subject) ?? subject) : null } : {}),
      ...(bodyHtml !== undefined ? { bodyHtml: bodyHtml ? (sanitizeUserText(bodyHtml) ?? bodyHtml) : null } : {}),
      ...(bodyText !== undefined ? { bodyText: sanitizeUserText(bodyText) ?? bodyText } : {}),
      ...(previewText !== undefined ? { previewText: previewText ? (sanitizeUserText(previewText) ?? previewText) : null } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(tokensUsed !== undefined ? { tokensUsed } : {}),
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
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ template });
}

// ─── DELETE /api/comms/templates/[templateId] ────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { templateId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const resolved = await resolveTemplate(params.templateId, session!.user.id);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!MANAGER_ROLES.includes(resolved.membership.role as typeof MANAGER_ROLES[number])) {
    return NextResponse.json({ error: "Admin or Campaign Manager required" }, { status: 403 });
  }

  await prisma.messageTemplate.update({
    where: { id: params.templateId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
