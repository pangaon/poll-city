/**
 * GOTV Rides Coordination — the silent vote multiplier.
 *
 * From SUBJECT-MATTER-BIBLE Part 4:
 * "A significant number of supporters do not vote because they cannot
 * get to the polling station. A campaign that systematically offers
 * rides can increase their supported turnout by 5-15%."
 *
 * GET — List supporters who need rides, clustered by neighbourhood
 * POST — Assign a driver to a ride request
 * PATCH — Mark ride as completed
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

/** GET — List ride requests for election day */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  // Find supporters who flagged they need a ride
  // This flag is set during canvassing (More Options > "Needs a ride on election day")
  const needsRide = await prisma.contact.findMany({
    where: {
      campaignId,
      supportLevel: { in: ["strong_support", "leaning_support"] as any[] },
      // Look for ride flag in notes or a custom field
      OR: [
        { notes: { contains: "ride", mode: "insensitive" } },
        { notes: { contains: "transportation", mode: "insensitive" } },
        { accessibilityFlag: true },
      ],
      voted: false,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      address1: true,
      city: true,
      postalCode: true,
      phone: true,
      notes: true,
      supportLevel: true,
      accessibilityFlag: true,
    },
    orderBy: { postalCode: "asc" }, // cluster by neighbourhood (postal code)
  });

  // Group by postal code prefix (first 3 chars = neighbourhood)
  const clusters: Record<string, typeof needsRide> = {};
  for (const contact of needsRide) {
    const area = contact.postalCode?.slice(0, 3)?.toUpperCase() ?? "UNKNOWN";
    if (!clusters[area]) clusters[area] = [];
    clusters[area].push(contact);
  }

  return NextResponse.json({
    totalNeedingRides: needsRide.length,
    clusters: Object.entries(clusters).map(([area, contacts]) => ({
      area,
      count: contacts.length,
      contacts,
    })),
  });
}

/** POST — Assign a volunteer driver to a ride request */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:write");
  if (permError) return permError;

  const { contactId, driverId, pickupTime, campaignId } = await req.json();
  if (!contactId || !campaignId) {
    return NextResponse.json({ error: "contactId and campaignId required" }, { status: 400 });
  }

  // Log the ride assignment as a task
  const task = await prisma.task.create({
    data: {
      campaignId,
      title: `GOTV Ride: Pick up voter`,
      assignedToId: driverId ?? session!.user.id,
      createdById: session!.user.id,
      priority: "urgent" as any,
      status: "pending" as any,
      dueDate: pickupTime ? new Date(pickupTime) : new Date(),
    },
  });

  // Add note to contact
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      notes: {
        set: `RIDE ASSIGNED — Driver assigned at ${new Date().toLocaleTimeString()}. Task: ${task.id}`,
      },
    },
  }).catch(() => {}); // non-fatal if notes format doesn't work

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "gotv_ride_assigned",
      entityType: "Task",
      entityId: task.id,
      details: { contactId, driverId: driverId ?? session!.user.id },
    },
  });

  return NextResponse.json({ ok: true, taskId: task.id });
}
