import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      postalCode: true,
      ward: true,
      riding: true,
      address: true,
    },
  });

  return NextResponse.json({
    data: {
      postalCode: user?.postalCode ?? null,
      ward: user?.ward ?? null,
      riding: user?.riding ?? null,
      address: user?.address ?? null,
    },
  });
}