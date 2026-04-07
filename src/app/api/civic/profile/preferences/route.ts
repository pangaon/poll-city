import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const preferencesSchema = z.object({
  notifyResults: z.boolean().optional(),
  notifyPolls: z.boolean().optional(),
  notifyDebates: z.boolean().optional(),
  notifyEmergency: z.boolean().optional(),
  quietHoursStart: z.string().nullish(),
  quietHoursEnd: z.string().nullish(),
  pushToken: z.string().nullish(),
});

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user!.id as string;
  const body = await req.json();
  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  // Only include fields that were actually provided
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      data[key] = value;
    }
  }

  const profile = await prisma.civicProfile.update({
    where: { userId },
    data,
  });

  return NextResponse.json({ profile });
}
