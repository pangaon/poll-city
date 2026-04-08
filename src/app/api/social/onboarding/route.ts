import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { createHmac } from "crypto";
import { z } from "zod";

const schema = z.object({
  guestToken: z.string().optional(),
  postalCode: z.string().optional(),
  ward: z.string().optional(),
  municipality: z.string().optional(),
  province: z.string().optional(),
  ageRange: z.enum(["18-24", "25-34", "35-49", "50-64", "65+"]).optional(),
  sector: z.enum(["public", "private", "nonprofit", "student", "retired"]).optional(),
  topicInterests: z.array(z.string()).optional(),
  notifyPolls: z.boolean().optional(),
  notifyResults: z.boolean().optional(),
  notifyEmergency: z.boolean().optional(),
  pushToken: z.string().optional(),
  consentGiven: z.boolean(),
});

function hashGuestToken(raw: string): string {
  const secret = process.env.GUEST_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET ?? "poll-city-guest";
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const d = parsed.data;

  if (!d.consentGiven) {
    return NextResponse.json({ error: "Consent required (PIPEDA)" }, { status: 422 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (d.postalCode) updateData.postalCode = d.postalCode.replace(/\s/g, "").toUpperCase().slice(0, 10);
  if (d.ward) updateData.ward = d.ward;
  if (d.municipality) updateData.municipality = d.municipality;
  if (d.province) updateData.province = d.province;
  if (d.ageRange) updateData.ageRange = d.ageRange;
  if (d.sector) updateData.sector = d.sector;
  if (d.topicInterests) updateData.issues = d.topicInterests;
  if (typeof d.notifyPolls === "boolean") updateData.notifyPolls = d.notifyPolls;
  if (typeof d.notifyResults === "boolean") updateData.notifyResults = d.notifyResults;
  if (typeof d.notifyEmergency === "boolean") updateData.notifyEmergency = d.notifyEmergency;
  if (d.pushToken) updateData.pushToken = d.pushToken;

  let profile;

  if (userId) {
    // Authenticated user — upsert by userId
    // If there's a guestToken, also try to merge guest profile data
    if (d.guestToken) {
      const hashedGuest = hashGuestToken(d.guestToken);
      const guestProfile = await prisma.civicProfile.findUnique({ where: { guestToken: hashedGuest } });
      if (guestProfile && !guestProfile.userId) {
        // Merge: link guest profile to this user
        profile = await prisma.civicProfile.update({
          where: { id: guestProfile.id },
          data: { userId, guestToken: null, ...updateData },
        });
      }
    }

    if (!profile) {
      profile = await prisma.civicProfile.upsert({
        where: { userId },
        create: { userId, ...updateData },
        update: updateData,
      });
    }
  } else if (d.guestToken) {
    // Guest user — upsert by hashed guest token
    const hashedGuest = hashGuestToken(d.guestToken);
    profile = await prisma.civicProfile.upsert({
      where: { guestToken: hashedGuest },
      create: { guestToken: hashedGuest, ...updateData },
      update: updateData,
    });
  } else {
    return NextResponse.json({ error: "Either session or guestToken required" }, { status: 401 });
  }

  // Fetch 3 nearby polls for the live polls screen
  const postalPrefix = (d.postalCode ?? "").replace(/\s/g, "").slice(0, 3).toUpperCase();
  const nearbyPolls = postalPrefix
    ? await prisma.poll.findMany({
        where: {
          isActive: true,
          visibility: "public",
          OR: [
            { targetPostalPrefixes: { has: postalPrefix } },
            { targetPostalPrefixes: { isEmpty: true } },
          ],
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 3,
        include: { options: { orderBy: { order: "asc" } } },
      })
    : [];

  return NextResponse.json({ data: { profile, nearbyPolls } });
}
