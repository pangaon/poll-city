import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { SupportLevel } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: { contactIds: string[]; supportLevel?: SupportLevel; campaignId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { contactIds, supportLevel, campaignId } = body;

  if (!contactIds?.length || !supportLevel) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify user has access to campaign
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: campaignId || "" } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.contact.updateMany({
      where: {
        id: { in: contactIds },
        campaignId: campaignId || "",
      },
      data: { supportLevel },
    });

    return NextResponse.json({ data: { updated: contactIds.length } });
  } catch (err) {
    console.error("Failed to bulk update contacts:", err);
    return NextResponse.json({ error: "Failed to update contacts" }, { status: 500 });
  }
}