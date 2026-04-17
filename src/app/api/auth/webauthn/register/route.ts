import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
} from "@simplewebauthn/server";

const RP_NAME = "Poll City";
const RP_ID = process.env.NEXTAUTH_URL
  ? new URL(process.env.NEXTAUTH_URL).hostname
  : "localhost";
const ORIGIN = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

interface StoredCredential {
  id: string;      // base64url credential ID
  publicKey: string; // base64url DER public key
  counter: number;
  label: string;
  createdAt: string;
}

/** GET — generate WebAuthn registration options (challenge). */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const userId = session!.user.id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, webauthnCredentials: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = (user.webauthnCredentials as unknown as StoredCredential[]) ?? [];

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.id,
      transports: ["internal", "hybrid"] as ("internal" | "hybrid")[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  // Temporarily persist the challenge so POST can verify against it
  await prisma.user.update({
    where: { id: userId },
    // Reuse emailOtpCode as a temp challenge store (cleared after use)
    data: { emailOtpCode: options.challenge },
  });

  return NextResponse.json(options);
}

/** POST — verify the registration response and store the new credential. */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const userId = session!.user.id as string;

  const body = await req.json() as { response: unknown; label?: string };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailOtpCode: true, webauthnCredentials: true },
  });
  if (!user?.emailOtpCode) {
    return NextResponse.json({ error: "No pending registration — call GET first" }, { status: 400 });
  }

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response as Parameters<typeof verifyRegistrationResponse>[0]["response"],
      expectedChallenge: user.emailOtpCode,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verification failed";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 422 });
  }

  const { credential } = verification.registrationInfo;
  const newCred: StoredCredential = {
    id: Buffer.from(credential.id).toString("base64url"),
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    label: String(body.label ?? "Device").slice(0, 50),
    createdAt: new Date().toISOString(),
  };

  const existing = (user.webauthnCredentials as unknown as StoredCredential[]) ?? [];

  await prisma.user.update({
    where: { id: userId },
    data: {
      webauthnCredentials: [...existing, newCred] as unknown as Prisma.InputJsonValue,
      emailOtpCode: null, // clear the challenge
    },
  });

  await prisma.securityEvent.create({
    data: { userId, type: "webauthn_register", success: true },
  });

  return NextResponse.json({ ok: true, label: newCred.label });
}
