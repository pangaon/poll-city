import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { awardCivicCredits } from "@/lib/civic-credits";

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

  const profile = await prisma.civicProfile.create({
    data: {
      userId,
      postalCode: body.postalCode ?? null,
      ward: body.ward ?? null,
      municipality: body.municipality ?? null,
      province: body.province ?? null,
      issues: body.issues ?? [],
    },
  });

  const { credits, newBadges } = await awardCivicCredits(
    userId,
    "CREATE_PROFILE",
    "Created civic profile"
  );

  return NextResponse.json({ profile, creditsAwarded: credits, newBadges }, { status: 201 });
}
