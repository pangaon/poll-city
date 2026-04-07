import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const demo = await prisma.demoToken.findUnique({
    where: { token: params.token },
  });

  if (!demo) {
    return NextResponse.json({ error: "Demo not found" }, { status: 404 });
  }

  if (demo.expiresAt < new Date()) {
    return NextResponse.json({ error: "Demo expired" }, { status: 410 });
  }

  await prisma.demoToken.update({
    where: { id: demo.id },
    data: {
      views: { increment: 1 },
      lastViewedAt: new Date(),
    },
  });

  return NextResponse.json({
    type: demo.type,
    prospectName: demo.prospectName,
    views: demo.views + 1,
    expiresAt: demo.expiresAt,
  });
}
