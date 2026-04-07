import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req, [Role.ADMIN, Role.SUPER_ADMIN]);
  if (error) return error;

  let body: { type: string; title: string; body: string; data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.type || !body.title || !body.body) {
    return NextResponse.json({ error: "type, title, and body are required" }, { status: 400 });
  }

  const notification = await prisma.operatorNotification.create({
    data: {
      type: body.type,
      title: body.title,
      body: body.body,
      data: body.data as object ?? undefined,
    },
  });

  return NextResponse.json({ data: notification }, { status: 201 });
}
