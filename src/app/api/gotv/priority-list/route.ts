import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { SupportLevel } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Supporters who have NOT yet voted
  const contacts = await prisma.contact.findMany({
    where: {
      campaignId,
      supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] },
      gotvStatus: { notIn: ["voted"] },
      isDeceased: false,
      phone: { not: null },
    },
    orderBy: [{ supportLevel: "asc" }, { lastName: "asc" }],
    take: 200,
    select: { id: true, firstName: true, lastName: true, phone: true, address1: true, city: true, supportLevel: true, gotvStatus: true },
  });

  return NextResponse.json({ data: contacts });
}
