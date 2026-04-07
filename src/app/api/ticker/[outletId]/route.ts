import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { outletId: string } }
) {
  // Validate outlet exists
  const outlet = await prisma.mediaOutlet.findUnique({
    where: { id: params.outletId, isActive: true },
  });

  if (!outlet) {
    return NextResponse.json({ error: "Outlet not found" }, { status: 404 });
  }

  // Get active ticker items
  const items = await prisma.tickerItem.findMany({
    where: {
      mediaOutletId: params.outletId,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { priority: "desc" },
    take: 50,
  });

  // Return as SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial data
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ items })}\n\n`));

      // Keep connection alive with periodic updates
      let iteration = 0;
      const interval = setInterval(async () => {
        try {
          iteration++;
          const freshItems = await prisma.tickerItem.findMany({
            where: {
              mediaOutletId: params.outletId,
              isActive: true,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
            orderBy: { priority: "desc" },
            take: 50,
          });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ items: freshItems })}\n\n`));

          // Close after 5 minutes to prevent resource leaks
          if (iteration > 10) {
            clearInterval(interval);
            controller.close();
          }
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 30000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
