import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user!.id as string;

  const passport = await prisma.voterPassport.findUnique({
    where: { userId },
    select: { badges: true, credits: true },
  });

  return NextResponse.json({
    badges: passport?.badges ?? [],
    credits: passport?.credits ?? 0,
  });
}
