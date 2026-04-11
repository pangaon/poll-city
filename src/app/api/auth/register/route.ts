import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validatePassword } from "@/lib/auth/password-policy";
import { rateLimit } from "@/lib/rate-limit";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

const RegisterBody = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "auth");
  if (limited) return limited;

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const parsed = RegisterBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422, headers: NO_STORE }
    );
  }

  const { name, email, password } = parsed.data;

  const policy = validatePassword(password);
  if (!policy.valid) {
    return NextResponse.json(
      { error: "Password requirements not met", details: policy.errors },
      { status: 422, headers: NO_STORE }
    );
  }

  // Duplicate check
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in instead." },
      { status: 409, headers: NO_STORE }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: Role.ADMIN,  // Campaign owners start as ADMIN
      emailVerified: false,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  // No ActivityLog here — no campaign context at registration time.
  // The client redirects to /campaigns/new where the first campaign creation is logged.

  return NextResponse.json({ data: { id: user.id, email: user.email, name: user.name } }, { headers: NO_STORE });
}
