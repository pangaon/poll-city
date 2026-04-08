import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";
import { z } from "zod";
import { audit } from "@/lib/audit";

const demoSchema = z.object({
  type: z.string().min(1, "type is required"),
  prospectName: z.string().nullish(),
  prospectEmail: z.string().email().nullish(),
  expiresInHours: z.number().positive().optional().default(72),
});

export async function GET(req: NextRequest) {
  const { error } = await apiAuth(req, [Role.ADMIN, Role.SUPER_ADMIN]);
  if (error) return error;

  const demos = await prisma.demoToken.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: demos });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req, [Role.ADMIN, Role.SUPER_ADMIN]);
  if (error) return error;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = demoSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000);

  const demo = await prisma.demoToken.create({
    data: {
      type: parsed.data.type,
      prospectName: parsed.data.prospectName ?? null,
      prospectEmail: parsed.data.prospectEmail ?? null,
      expiresAt,
    },
  });

  audit(prisma, "admin.demo.created", {
    campaignId: "system",
    userId: session!.user.id,
    entityId: demo.id,
    entityType: "DemoToken",
    ip: req.headers.get("x-forwarded-for"),
    details: { type: demo.type, prospectEmail: demo.prospectEmail },
  });

  return NextResponse.json({ data: demo }, { status: 201 });
}
