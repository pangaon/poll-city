import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

/** GET — return the last 20 security events for the authenticated user. */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const userId = session!.user.id as string;

  const events = await prisma.securityEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      success: true,
      ip: true,
      userAgent: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ events });
}
