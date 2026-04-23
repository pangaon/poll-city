import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().max(120).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limit: 5 submissions per hour per IP
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  // Validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 }
    );
  }

  const { email, name } = parsed.data;

  // Verify official exists
  const official = await prisma.official.findUnique({
    where: { id: params.id },
    select: { id: true, isActive: true },
  });
  if (!official || !official.isActive) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Parse name into first/last
  const nameParts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? undefined;
  const lastName = nameParts.slice(1).join(" ") || undefined;

  // Upsert newsletter subscriber (idempotent)
  try {
    const existing = await prisma.newsletterSubscriber.findFirst({
      where: { officialId: params.id, email },
    });

    if (existing) {
      if (existing.status === "active") {
        return NextResponse.json({ ok: true, message: "Already subscribed" });
      }
      // Re-activate if unsubscribed
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { status: "active", unsubscribedAt: null },
      });
    } else {
      await prisma.newsletterSubscriber.create({
        data: {
          officialId: params.id,
          email,
          firstName,
          lastName,
          source: "official_site",
          status: "active",
          consentGiven: true,
          consentDate: new Date(),
          consentIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
        },
      });
    }
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json(
      { error: "Failed to subscribe. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, message: "Subscribed successfully" });
}
