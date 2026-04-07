import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";
import { z } from "zod";

const notifySchema = z.object({
  type: z.string().min(1, "type is required"),
  title: z.string().min(1, "title is required"),
  body: z.string().min(1, "body is required"),
  data: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req, [Role.ADMIN, Role.SUPER_ADMIN]);
  if (error) return error;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = notifySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const notification = await prisma.operatorNotification.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      body: parsed.data.body,
      data: parsed.data.data as object ?? undefined,
    },
  });

  return NextResponse.json({ data: notification }, { status: 201 });
}
