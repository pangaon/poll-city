import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user!.id as string;
  const body = await req.json();

  const allowedFields = [
    "notifyResults",
    "notifyPolls",
    "notifyDebates",
    "notifyEmergency",
    "quietHoursStart",
    "quietHoursEnd",
    "pushToken",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = body[field];
    }
  }

  const profile = await prisma.civicProfile.update({
    where: { userId },
    data,
  });

  return NextResponse.json({ profile });
}
