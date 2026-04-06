import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { SupportLevel } from "@prisma/client";

type Ctx = { params: { slug: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const form = await prisma.form.findUnique({
    where: { slug: params.slug },
    include: { fields: { orderBy: { order: "asc" } } },
  });

  if (!form || !form.isActive) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const now = new Date();
  if (form.opensAt && now < form.opensAt) {
    return NextResponse.json({ error: "This form is not yet open" }, { status: 400 });
  }
  if (form.closesAt && now > form.closesAt) {
    return NextResponse.json({ error: "This form is now closed" }, { status: 400 });
  }

  // Check submit limit
  if (form.submitLimit && form.submissionCount >= form.submitLimit) {
    return NextResponse.json({ error: "This form has reached its submission limit" }, { status: 400 });
  }

  // Check allowMultiple by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  if (!form.allowMultiple && ip) {
    const existing = await prisma.formSubmission.findFirst({
      where: { formId: form.id, ip },
    });
    if (existing) {
      return NextResponse.json({ error: "You have already submitted this form" }, { status: 400 });
    }
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body.data as Record<string, any> | undefined;
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "data object is required" }, { status: 400 });
  }

  // Validate required fields
  const errors: string[] = [];
  for (const field of form.fields) {
    if (!field.required) continue;
    // Skip non-input types
    if (["heading", "paragraph", "divider"].includes(field.type)) continue;
    const value = data[field.id];
    if (value === undefined || value === null || value === "") {
      errors.push(`${field.label} is required`);
    }
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent") || null;
  const referrer = req.headers.get("referer") || null;

  let contactId: string | null = null;

  // Auto-create contact if configured
  if (form.autoCreateContact) {
    try {
      // Look for CRM-mapped fields to extract contact data
      const crmMap: Record<string, string> = {};
      for (const field of form.fields) {
        if (field.crmField && data[field.id] !== undefined) {
          crmMap[field.crmField] = String(data[field.id]);
        }
      }

      const firstName = crmMap.firstName || crmMap.first_name || "Unknown";
      const lastName = crmMap.lastName || crmMap.last_name || "Submission";
      const email = crmMap.email || null;
      const phone = crmMap.phone || null;

      // Try to find existing contact by email within campaign
      let contact = null;
      if (email) {
        contact = await prisma.contact.findFirst({
          where: { campaignId: form.campaignId, email },
        });
      }

      if (!contact) {
        const supportLevel = (Object.values(SupportLevel) as string[]).includes(form.defaultSupportLevel)
          ? (form.defaultSupportLevel as SupportLevel)
          : SupportLevel.unknown;

        contact = await prisma.contact.create({
          data: {
            campaignId: form.campaignId,
            firstName,
            lastName,
            email,
            phone,
            supportLevel,
            notes: `Created from form: ${form.name}`,
          },
        });

        // Apply default tags
        if (form.defaultTags.length > 0) {
          for (const tagName of form.defaultTags) {
            const tag = await prisma.tag.upsert({
              where: { name_campaignId: { name: tagName, campaignId: form.campaignId } },
              create: { name: tagName, campaignId: form.campaignId },
              update: {},
            });
            await prisma.contactTag.create({
              data: { contactId: contact.id, tagId: tag.id },
            }).catch(() => {}); // Ignore duplicate
          }
        }
      }

      contactId = contact.id;
    } catch (err) {
      // Don't fail the submission if contact creation fails
      console.error("[Form Submit] Auto-create contact failed:", err);
    }
  }

  const submission = await prisma.formSubmission.create({
    data: {
      formId: form.id,
      data,
      contactId,
      ip,
      userAgent,
      referrer,
    },
  });

  // Increment submission count (fire-and-forget)
  prisma.form.update({
    where: { id: form.id },
    data: { submissionCount: { increment: 1 } },
  }).catch(() => {});

  return NextResponse.json({
    id: submission.id,
    successMessage: form.successMessage,
    successRedirectUrl: form.successRedirectUrl,
  }, { status: 201 });
}
