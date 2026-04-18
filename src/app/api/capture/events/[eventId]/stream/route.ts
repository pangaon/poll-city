import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const event = await prisma.captureEvent.findFirst({
    where: { id: params.eventId, deletedAt: null },
    select: { campaignId: true },
  });
  if (!event) return new Response("Not found", { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") return new Response("Forbidden", { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "VOLUNTEER_LEADER"].includes(membership.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let lastHash = "";

  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        try {
          const [approvedCount, pendingCount, flaggedCount, totalLocations, recentSubmission] = await Promise.all([
            prisma.captureSubmission.count({ where: { eventId: params.eventId, status: "approved" } }),
            prisma.captureSubmission.count({ where: { eventId: params.eventId, status: "pending_review" } }),
            prisma.captureSubmission.count({ where: { eventId: params.eventId, status: "flagged" } }),
            prisma.captureLocation.count({ where: { eventId: params.eventId } }),
            prisma.captureSubmission.findFirst({
              where: { eventId: params.eventId, status: { not: "draft" } },
              orderBy: { createdAt: "desc" },
              select: { id: true, createdAt: true, locationId: true, status: true },
            }),
          ]);

          const hash = `${approvedCount}-${pendingCount}-${flaggedCount}-${recentSubmission?.id ?? ""}`;

          if (hash !== lastHash) {
            lastHash = hash;
            const payload = JSON.stringify({
              approvedCount,
              pendingCount,
              flaggedCount,
              totalLocations,
              completionRate:
                totalLocations > 0 ? Math.round((approvedCount / totalLocations) * 1000) / 10 : 0,
              recentSubmission,
              ts: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch {
          // Transient DB error — skip this tick, don't close stream
        }
      };

      send();
      const interval = setInterval(send, 5000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
