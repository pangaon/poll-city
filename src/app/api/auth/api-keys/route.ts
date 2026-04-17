import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

/** GET — list active API keys for the authenticated user. */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const userId = session!.user.id as string;

  const keys = await prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ keys });
}

/** POST — generate a new API key. Returns the full key ONCE — caller must copy it. */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const userId = session!.user.id as string;

  const body = await req.json() as { name?: string };
  const name = String(body.name ?? "").trim().slice(0, 100);
  if (!name) return NextResponse.json({ error: "Key name is required" }, { status: 400 });

  // Check limit: max 10 active keys per user
  const count = await prisma.apiKey.count({ where: { userId, revokedAt: null } });
  if (count >= 10) {
    return NextResponse.json({ error: "Maximum 10 active API keys allowed" }, { status: 429 });
  }

  const rawKey = `pc_${randomBytes(24).toString("hex")}`; // 51-char key
  const keyPrefix = rawKey.slice(0, 10); // "pc_" + 7 chars shown in UI
  const keyHash = await bcrypt.hash(rawKey, 10);

  const created = await prisma.apiKey.create({
    data: { userId, name, keyPrefix, keyHash },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });

  return NextResponse.json({ ...created, key: rawKey });
}

/** DELETE — revoke an API key. ?id=<key_id> */
export async function DELETE(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const userId = session!.user.id as string;

  const { searchParams } = new URL(req.url);
  const keyId = searchParams.get("id");
  if (!keyId) return NextResponse.json({ error: "?id= is required" }, { status: 400 });

  const key = await prisma.apiKey.findFirst({ where: { id: keyId, userId, revokedAt: null } });
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
