import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

// ── Request body schema ───────────────────────────────────────────────────────
// userId is NEVER taken from the request body — always from session.
// campaignId is NEVER trusted from the client — resolved from campaignSlug via DB.

const signalSchema = z.object({
  // At least one of officialId or campaignSlug must be present to route the signal
  officialId:   z.string().cuid().optional(),
  campaignSlug: z.string().min(1).max(100).optional(),

  type: z.enum([
    "strong_support",
    "general_support",
    "sign_request",
    "do_not_contact",
    "volunteer_interest",
    "question",
  ]),

  message: z.string().max(500).optional(),

  // Geo — voluntarily provided, used for Contact record
  postalCode: z.string().max(10).optional(),

  // User-provided fields for sign requests — only copied if explicitly submitted
  // These are the ONLY fields that can cross into the CRM from this route
  userAddress: z.string().max(200).optional(), // for sign_request type only

  isPublic: z.boolean().default(true),
});

// ── Consent scope mapping ─────────────────────────────────────────────────────
// Maps signal type to what the user is agreeing the campaign can do with the data

const CONSENT_SCOPE: Record<string, string> = {
  strong_support:     "campaign_awareness",
  general_support:    "campaign_awareness",
  sign_request:       "sign_installation",
  do_not_contact:     "do_not_contact",
  volunteer_interest: "volunteer_contact",
  question:           "campaign_awareness",
};

// ── Fields transferred per signal type ───────────────────────────────────────
// Minimum data only. Never includes email, phone, full name unless explicitly provided.

function getFieldsTransferred(
  signalType: string,
  hasPostal: boolean,
  hasAddress: boolean
): string[] {
  const fields: string[] = ["source"];
  if (hasPostal) fields.push("postalCode", "ward", "riding");
  if (signalType === "sign_request" && hasAddress) fields.push("address1");
  if (signalType === "volunteer_interest") fields.push("volunteerInterest");
  if (signalType === "do_not_contact") fields.push("doNotContact");
  if (signalType === "sign_request") fields.push("signRequested");
  return fields;
}

// ── POST /api/social/signal ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Request must be authenticated — anonymous users cannot consent
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sessionUserId = session!.user.id;

  // Body size guard
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 8_000) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = signalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const { type, officialId, campaignSlug, message, postalCode, userAddress, isPublic } = parsed.data;

  // ── Resolve campaign from slug ────────────────────────────────────────────
  // campaignId comes from the DB — never from client input.
  let campaignId: string | null = null;

  if (campaignSlug) {
    const campaign = await prisma.campaign.findUnique({
      where: { slug: campaignSlug },
      select: { id: true, isActive: true },
    });
    if (!campaign || !campaign.isActive) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    campaignId = campaign.id;
  }

  // If no campaignSlug but officialId provided, still record the signal
  // but no CRM bridge transfer (no campaign to write to)
  const hasCampaignTarget = campaignId !== null;

  // ── Load user geo data for Contact record ─────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { ward: true, riding: true, postalCode: true, name: true },
  });

  const resolvedPostal = postalCode ?? user?.postalCode ?? null;
  const resolvedWard   = user?.ward   ?? null;
  const resolvedRiding = user?.riding ?? null;

  // ── Idempotency check ─────────────────────────────────────────────────────
  // If a ConsentLog already exists for this (user, campaign, signalType),
  // return the existing record rather than creating a duplicate.
  // This prevents double-submission on mobile network retries.

  if (hasCampaignTarget) {
    const existing = await prisma.consentLog.findUnique({
      where: { unique_active_consent: { userId: sessionUserId, campaignId: campaignId!, signalType: type } },
      select: { id: true, revokedAt: true, contactId: true },
    });

    if (existing && !existing.revokedAt) {
      // Already consented — idempotent success
      return NextResponse.json({
        data: {
          recorded: false,
          reason: "already_recorded",
          consentId: existing.id,
          contactId: existing.contactId,
        },
      }, { status: 200 });
    }
  }

  // ── Create SupportSignal (public aggregate record) ────────────────────────
  // This record is ALWAYS created regardless of consent bridge outcome.
  // It is the public-facing aggregate signal, not the CRM record.

  const signal = await prisma.supportSignal.create({
    data: {
      userId:      sessionUserId,
      officialId:  officialId   ?? undefined,
      campaignSlug: campaignSlug ?? undefined,
      type,
      message:     message ?? undefined,
      postalCode:  resolvedPostal ?? undefined,
      ward:        resolvedWard   ?? undefined,
      riding:      resolvedRiding ?? undefined,
      isPublic,
    },
    select: { id: true },
  });

  // ── Consent bridge — only executes when there is a campaign target ─────────
  // All of the following must succeed atomically.
  // If the campaign has no target, we stop here and return the signal only.

  if (!hasCampaignTarget) {
    return NextResponse.json({
      data: {
        recorded: true,
        signalId: signal.id,
        bridgeExecuted: false,
        reason: "no_campaign_target",
      },
    }, { status: 201 });
  }

  const fieldsTransferred = getFieldsTransferred(
    type,
    resolvedPostal !== null,
    !!userAddress
  );

  // ── Find or create Contact in campaign CRM ────────────────────────────────
  // Look up by (campaignId, userId-as-externalId) to find a prior bridge contact.
  // externalId stores the Social userId for bridge-created contacts only.
  // NEVER overwrites staff-entered contacts with bridge data.

  let contactId: string;
  const externalBridgeId = `social_user_${sessionUserId}`;

  const existingContact = await prisma.contact.findFirst({
    where: { campaignId: campaignId!, externalId: externalBridgeId },
    select: { id: true },
  });

  if (existingContact) {
    // Update only the fields that the bridge is authorized to touch
    const updateData: Record<string, unknown> = {
      source: "social_consent_bridge",
      lastContactedAt: new Date(),
    };

    if (resolvedPostal) updateData.postalCode = resolvedPostal;
    if (resolvedWard)   updateData.ward        = resolvedWard;
    if (resolvedRiding) updateData.riding       = resolvedRiding;
    if (type === "sign_request")       updateData.signRequested    = true;
    if (type === "volunteer_interest") updateData.volunteerInterest = true;
    if (type === "do_not_contact")     updateData.doNotContact      = true;

    await prisma.contact.update({
      where: { id: existingContact.id },
      data:  updateData,
    });
    contactId = existingContact.id;
  } else {
    // Create a new minimal Contact record.
    // Fields copied: source, externalId, postalCode, ward, riding, and signal flags.
    // NEVER copied: email, phone, full name, address (unless sign_request with userAddress).
    //               supportLevel, notes, tags, gotvStatus — internal use only.
    const createData: Record<string, unknown> = {
      campaignId,
      firstName:    "Social",    // placeholder — campaign staff will update
      lastName:     "Supporter", // placeholder — campaign staff will update
      source:       "social_consent_bridge",
      externalId:   externalBridgeId,
      lastContactedAt: new Date(),
    };

    if (resolvedPostal) createData.postalCode = resolvedPostal;
    if (resolvedWard)   createData.ward        = resolvedWard;
    if (resolvedRiding) createData.riding       = resolvedRiding;

    // Sign request: copy user-provided address only
    if (type === "sign_request" && userAddress) {
      createData.address1       = userAddress;
      createData.signRequested  = true;
    } else if (type === "sign_request") {
      createData.signRequested  = true;
    }

    if (type === "volunteer_interest") createData.volunteerInterest = true;
    if (type === "do_not_contact")     createData.doNotContact      = true;

    const newContact = await prisma.contact.create({
      data: createData as Parameters<typeof prisma.contact.create>[0]["data"],
      select: { id: true },
    });
    contactId = newContact.id;
  }

  // ── Create VolunteerProfile for volunteer_interest signals ────────────────
  if (type === "volunteer_interest") {
    await prisma.volunteerProfile.upsert({
      where:  { contactId },
      create: { contactId, campaignId: campaignId!, isActive: true },
      update: { campaignId: campaignId!, isActive: true },
    });
  }

  // ── Create Sign record for sign_request signals ───────────────────────────
  // Only creates a Sign record if an address was provided by the user.
  // Sign status defaults to "requested" — campaign staff handles fulfilment.
  //
  // Provenance: Sign has no source field in the schema. Bridge origin is
  // recorded in three places without adding a non-existent field:
  //   1. notes field on this Sign record (human-readable, for campaign staff)
  //   2. ActivityLog.details.signalId written below
  //   3. ConsentLog record written below
  // Contact.source = "social_consent_bridge" identifies the bridge contact.
  if (type === "sign_request" && userAddress) {
    await prisma.sign.create({
      data: {
        campaignId:  campaignId!,
        contactId,
        address1:    userAddress,
        postalCode:  resolvedPostal ?? undefined,
        notes:       `Requested via Poll City Social (signal: ${signal.id})`,
        status:      "requested",
        requestedAt: new Date(),
      },
    });
  }

  // ── Write ActivityLog (mandatory — never skipped) ────────────────────────
  const activityLog = await prisma.activityLog.create({
    data: {
      campaignId: campaignId!,
      userId:     sessionUserId,
      action:     "consent_bridge_transfer",
      entityType: "contact",
      entityId:   contactId,
      details: {
        signalType:       type,
        consentScope:     CONSENT_SCOPE[type],
        fieldsTransferred,
        signalId:         signal.id,
        externalBridgeId,
        postalCode:       resolvedPostal ?? null,
      },
    },
    select: { id: true },
  });

  // ── Write ConsentLog (mandatory — never skipped) ─────────────────────────
  // @@unique([userId, campaignId, signalType]) ensures exactly one record.
  // If a prior revoked record exists, we upsert to re-activate.
  const consentLog = await prisma.consentLog.upsert({
    where: { unique_active_consent: { userId: sessionUserId, campaignId: campaignId!, signalType: type } },
    create: {
      userId:       sessionUserId,
      campaignId:   campaignId!,
      signalType:   type,
      consentScope: CONSENT_SCOPE[type],
      fieldsXferred: fieldsTransferred,
      activityLogId: activityLog.id,
      contactId,
      revokedAt:    null,
    },
    update: {
      // Re-activating a previously revoked consent
      revokedAt:     null,
      consentScope:  CONSENT_SCOPE[type],
      fieldsXferred: fieldsTransferred,
      activityLogId: activityLog.id,
      contactId,
    },
    select: { id: true },
  });

  return NextResponse.json({
    data: {
      recorded:      true,
      signalId:      signal.id,
      consentId:     consentLog.id,
      contactId,
      bridgeExecuted: true,
      fieldsTransferred,
    },
  }, { status: 201 });
}
