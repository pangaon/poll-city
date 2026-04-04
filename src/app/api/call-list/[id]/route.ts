import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

const ALLOWED_STATUSES = new Set(["pending", "called", "completed", "skipped"]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body.status?.trim().toLowerCase();
  if (!status || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 422 });
  }

  const [prefix, entityId] = params.id.split("-", 2);
  if (!prefix || !entityId) {
    return NextResponse.json({ error: "Invalid call-list item id" }, { status: 400 });
  }

  try {
    if (prefix === "fu" || prefix === "vol") {
      const contact = await prisma.contact.findUnique({
        where: { id: entityId },
        select: { id: true, campaignId: true },
      });
      if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const membership = await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: session!.user.id, campaignId: contact.campaignId } },
      });
      if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      if (status === "called" || status === "completed") {
        await prisma.contact.update({
          where: { id: entityId },
          data: { followUpNeeded: false },
        });
      }

      return NextResponse.json({ data: { updated: true } });
    }

    if (prefix === "don") {
      const donation = await prisma.donation.findUnique({
        where: { id: entityId },
        select: { id: true, campaignId: true },
      });
      if (!donation) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const membership = await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: session!.user.id, campaignId: donation.campaignId } },
      });
      if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      if (status === "called" || status === "completed") {
        await prisma.donation.update({
          where: { id: entityId },
          data: { status: "processed" },
        });
      }

      return NextResponse.json({ data: { updated: true } });
    }

    return NextResponse.json({ error: "Unsupported call-list item type" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Update failed", detail: (e as Error).message }, { status: 500 });
  }
}
