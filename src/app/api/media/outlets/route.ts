import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const createOutletSchema = z.object({
  name: z.string().min(1, "name is required").transform(s => s.trim()),
  domain: z.string().nullish(),
  plan: z.string().optional().default("COMMUNITY"),
});

export async function GET(request: NextRequest) {
  const { session, error } = await apiAuth(request);
  if (error) return error;

  // Only admins can list outlets (check role from any membership)
  const membership = await prisma.membership.findFirst({
    where: { userId: session!.user.id, role: { in: ["SUPER_ADMIN", "ADMIN"] } },
  });

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outlets = await prisma.mediaOutlet.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: outlets });
}

export async function POST(request: NextRequest) {
  const { session, error } = await apiAuth(request);
  if (error) return error;

  const rawBody = await request.json().catch(() => null);
  const parsed = createOutletSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const outlet = await prisma.mediaOutlet.create({
    data: {
      name: parsed.data.name,
      domain: parsed.data.domain?.trim() || null,
      plan: parsed.data.plan,
    },
  });

  return NextResponse.json({
    data: outlet,
    embedCode: `<script src="https://www.poll.city/ticker.js?outlet=${outlet.id}&theme=dark"><\/script>`,
  }, { status: 201 });
}
