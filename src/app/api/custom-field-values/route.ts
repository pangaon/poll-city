import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { setContactCustomFields, getContactCustomFields } from "@/lib/db/custom-fields";
import { z } from "zod";

const updateSchema = z.object({
  contactId: z.string().cuid(),
  campaignId: z.string().cuid(),
  fields: z.record(z.union([z.string(), z.boolean(), z.number(), z.array(z.string()), z.null()])),
});

/**
 * GET /api/custom-field-values?contactId=xxx&campaignId=xxx
 * Get all custom field values for a contact with definitions
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const contactId = req.nextUrl.searchParams.get("contactId");
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!contactId || !campaignId) return NextResponse.json({ error: "contactId and campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const fields = await getContactCustomFields(contactId, campaignId);
  return NextResponse.json({ data: fields });
}

/**
 * POST /api/custom-field-values
 * Bulk set custom field values for a contact
 * Body: { contactId, campaignId, fields: { key: value, ... } }
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const { contactId, campaignId, fields } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify contact belongs to campaign
  const contact = await prisma.contact.findFirst({ where: { id: contactId, campaignId } });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  await setContactCustomFields(contactId, campaignId, fields as Record<string, string | boolean | number | string[] | null>);

  // Return updated values
  const updated = await getContactCustomFields(contactId, campaignId);
  return NextResponse.json({ data: updated });
}
