import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// Authenticate via API key in Authorization header
async function authenticateOutlet(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return null;
  return prisma.mediaOutlet.findUnique({ where: { apiKey, isActive: true } });
}

export async function GET(request: NextRequest) {
  const outlet = await authenticateOutlet(request);
  if (!outlet) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  const items = await prisma.tickerItem.findMany({
    where: { mediaOutletId: outlet.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: items });
}

export async function POST(request: NextRequest) {
  const outlet = await authenticateOutlet(request);
  if (!outlet) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    text?: string; url?: string; type?: string; priority?: number; expiresAt?: string;
  } | null;

  if (!body?.text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const item = await prisma.tickerItem.create({
    data: {
      mediaOutletId: outlet.id,
      text: body.text.trim(),
      url: body.url?.trim() || null,
      type: body.type ?? "GENERAL",
      priority: body.priority ?? 5,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });

  return NextResponse.json({ data: item }, { status: 201 });
}
