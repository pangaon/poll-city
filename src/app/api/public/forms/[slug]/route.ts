import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

type Ctx = { params: { slug: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const rateLimitResponse = await rateLimit(req, "read");
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
    return NextResponse.json({ error: "This form is not yet open" }, { status: 404 });
  }
  if (form.closesAt && now > form.closesAt) {
    return NextResponse.json({ error: "This form is now closed" }, { status: 404 });
  }

  // Increment view count (fire-and-forget)
  prisma.form.update({
    where: { id: form.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  // Return only public-safe data
  return NextResponse.json({
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    logoUrl: form.logoUrl,
    primaryColour: form.primaryColour,
    backgroundUrl: form.backgroundUrl,
    allowMultiple: form.allowMultiple,
    successMessage: form.successMessage,
    successRedirectUrl: form.successRedirectUrl,
    fields: form.fields.map((f) => ({
      id: f.id,
      order: f.order,
      type: f.type,
      label: f.label,
      placeholder: f.placeholder,
      helpText: f.helpText,
      defaultValue: f.defaultValue,
      required: f.required,
      minLength: f.minLength,
      maxLength: f.maxLength,
      minValue: f.minValue,
      maxValue: f.maxValue,
      pattern: f.pattern,
      options: f.options,
      width: f.width,
      showIf: f.showIf,
      content: f.content,
    })),
  });
}
