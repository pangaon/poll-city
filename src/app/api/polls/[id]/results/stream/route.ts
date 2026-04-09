import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    select: { id: true, type: true, isActive: true, totalResponses: true, visibility: true, campaignId: true },
  });

  if (!poll || !poll.isActive) {
    return new Response(JSON.stringify({ error: "Poll not found or closed" }), { status: 404 });
  }

  let lastCount = -1;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = async () => {
        try {
          const current = await prisma.poll.findUnique({
            where: { id: params.id },
            select: { totalResponses: true },
          });
          const count = current?.totalResponses ?? 0;

          // Only push if changed OR first push
          if (count !== lastCount) {
            lastCount = count;

            let results: unknown = null;

            if (count >= 1) {
              // Fetch results based on type
              if (poll.type === "binary") {
                results = await prisma.pollResponse.groupBy({
                  by: ["value"],
                  where: { pollId: params.id },
                  _count: true,
                });
              } else if (poll.type === "multiple_choice") {
                results = await prisma.pollOption.findMany({
                  where: { pollId: params.id },
                  include: { _count: { select: { responses: true } } },
                  orderBy: { order: "asc" },
                });
              } else if (poll.type === "nps") {
                const rows = await prisma.pollResponse.findMany({
                  where: { pollId: params.id },
                  select: { value: true },
                });
                const vals = rows.map((r) => parseInt(r.value ?? "0", 10)).filter((v) => !isNaN(v));
                const promoters = vals.filter((v) => v >= 9).length;
                const detractors = vals.filter((v) => v <= 6).length;
                const npsScore = vals.length > 0 ? Math.round(((promoters - detractors) / vals.length) * 100) : 0;
                results = { promoters, passives: vals.filter((v) => v >= 7 && v <= 8).length, detractors, npsScore, total: vals.length };
              } else if (poll.type === "word_cloud") {
                results = await prisma.wordCloudEntry.findMany({
                  where: { pollId: params.id },
                  orderBy: { count: "desc" },
                  take: 50,
                });
              } else if (poll.type === "slider") {
                const rows = await prisma.pollResponse.findMany({ where: { pollId: params.id }, select: { value: true } });
                const vals = rows.map((r) => parseFloat(r.value ?? "")).filter((v) => !isNaN(v));
                results = { average: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null, count: vals.length };
              }
            }

            const data = JSON.stringify({ totalResponses: count, results, hasMinVotes: count >= 1 });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch (e) {
          console.error("[SSE stream] error:", e);
        }
      };

      // Immediate push
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
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
