import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

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

  const tickerSchema = z.object({
    text: z.string().min(1, "text is required").transform(s => s.trim()),
    url: z.string().url().nullish(),
    type: z.string().optional().default("GENERAL"),
    priority: z.number().int().min(1).max(10).optional().default(5),
    expiresAt: z.string().nullish(),
  });

  const rawBody = await request.json().catch(() => null);
  const parsed = tickerSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.tickerItem.create({
    data: {
      mediaOutletId: outlet.id,
      text: parsed.data.text,
      url: parsed.data.url ?? null,
      type: parsed.data.type,
      priority: parsed.data.priority,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });

  return NextResponse.json({ data: item }, { status: 201 });
}
