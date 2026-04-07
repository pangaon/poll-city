import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { awardCivicCredits } from "@/lib/civic-credits";
import { z } from "zod";

const createProfileSchema = z.object({
  postalCode: z.string().nullish(),
  ward: z.string().nullish(),
  municipality: z.string().nullish(),
  province: z.string().nullish(),
  issues: z.array(z.string()).optional().default([]),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user!.id as string;
  const profile = await prisma.civicProfile.findUnique({ where: { userId } });

  if (!profile) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }

  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user!.id as string;

  const existing = await prisma.civicProfile.findUnique({ where: { userId } });
  if (existing) {
    return NextResponse.json({ error: "Profile already exists" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = createProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await prisma.civicProfile.create({
    data: {
      userId,
      postalCode: parsed.data.postalCode ?? null,
      ward: parsed.data.ward ?? null,
      municipality: parsed.data.municipality ?? null,
      province: parsed.data.province ?? null,
      issues: parsed.data.issues,
    },
  });

  const { credits, newBadges } = await awardCivicCredits(
    userId,
    "CREATE_PROFILE",
    "Created civic profile"
  );

  return NextResponse.json({ profile, creditsAwarded: credits, newBadges }, { status: 201 });
}
