import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user!.id as string;

  const passport = await prisma.voterPassport.findUnique({ where: { userId } });

  if (!passport) {
    return NextResponse.json({ passport: null }, { status: 200 });
  }

  return NextResponse.json({ passport });
}
