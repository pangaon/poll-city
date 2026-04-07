import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await apiAuth(req, [Role.ADMIN, Role.SUPER_ADMIN]);
  if (error) return error;

  const demos = await prisma.demoToken.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: demos });
}

export async function POST(req: NextRequest) {
  const { error } = await apiAuth(req, [Role.ADMIN, Role.SUPER_ADMIN]);
  if (error) return error;

  let body: {
    type: string;
    prospectName?: string;
    prospectEmail?: string;
    expiresInHours?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + (body.expiresInHours ?? 72) * 60 * 60 * 1000);

  const demo = await prisma.demoToken.create({
    data: {
      type: body.type,
      prospectName: body.prospectName ?? null,
      prospectEmail: body.prospectEmail ?? null,
      expiresAt,
    },
  });

  return NextResponse.json({ data: demo }, { status: 201 });
}
