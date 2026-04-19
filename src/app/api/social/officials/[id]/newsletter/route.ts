import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Sign in to subscribe" }, { status: 401 });
  }

  const official = await prisma.official.findUnique({
    where: { id: params.id, isActive: true },
    select: { id: true },
  });
  if (!official) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.newsletterSubscriber.findFirst({
    where: { officialId: params.id, email },
  });

  if (existing) {
    if (existing.status === "active") {
      return NextResponse.json({ data: { subscribed: true, existed: true } });
    }
    // Re-activate unsubscribed record
    await prisma.newsletterSubscriber.update({
      where: { id: existing.id },
      data: { status: "active", unsubscribedAt: null },
    });
  } else {
    await prisma.newsletterSubscriber.create({
      data: {
        officialId: params.id,
        email,
        firstName: session.user.name?.split(" ")[0] ?? null,
        lastName: session.user.name?.split(" ").slice(1).join(" ") || null,
        source: "web",
        status: "active",
        consentGiven: true,
        consentDate: new Date(),
      },
    });
  }

  return NextResponse.json({ data: { subscribed: true } });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.newsletterSubscriber.updateMany({
    where: { officialId: params.id, email, status: "active" },
    data: { status: "unsubscribed", unsubscribedAt: new Date() },
  });

  return NextResponse.json({ data: { subscribed: false } });
}
