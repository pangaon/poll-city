import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
  role: z.string().optional(), // "candidate" | "cm" | "official" | "other"
});

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { email, name, role } = parsed.data;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  // Check for existing subscription to avoid duplicates
  const existing = await prisma.newsletterSubscriber.findFirst({
    where: { email, campaignId: null, officialId: null },
  });

  if (existing) {
    // Already subscribed — return success silently (don't leak subscription status)
    return NextResponse.json({ success: true });
  }

  await prisma.newsletterSubscriber.create({
    data: {
      email,
      firstName: name?.split(" ")[0] ?? null,
      lastName: name?.split(" ").slice(1).join(" ") || null,
      source: role ? `marketing_${role}` : "marketing_lead",
      status: "active",
      consentGiven: true,
      consentDate: new Date(),
      consentIp: ip,
      campaignId: null,
      officialId: null,
    },
  });

  return NextResponse.json({ success: true });
}
