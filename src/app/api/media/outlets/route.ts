import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

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

  const body = await request.json().catch(() => null) as {
    name?: string; domain?: string; plan?: string;
  } | null;

  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const outlet = await prisma.mediaOutlet.create({
    data: {
      name: body.name.trim(),
      domain: body.domain?.trim() || null,
      plan: body.plan ?? "COMMUNITY",
    },
  });

  return NextResponse.json({
    data: outlet,
    embedCode: `<script src="https://www.poll.city/ticker.js?outlet=${outlet.id}&theme=dark"><\/script>`,
  }, { status: 201 });
}
