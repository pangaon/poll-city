import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "contacts:write");
  if (permError) return permError;

  let body: { contactIds: string[]; tagIds: string[]; campaignId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { contactIds, tagIds, campaignId } = body;

  if (!contactIds?.length || !tagIds?.length) {
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
    // Add tags to contacts (skip duplicates)
    const tagAssignments = contactIds.flatMap(contactId =>
      tagIds.map(tagId => ({ contactId, tagId }))
    );

    await prisma.contactTag.createMany({
      data: tagAssignments,
      skipDuplicates: true,
    });

    return NextResponse.json({ data: { updated: contactIds.length } });
  } catch (err) {
    console.error("Failed to bulk tag contacts:", err);
    return NextResponse.json({ error: "Failed to update tags" }, { status: 500 });
  }
}