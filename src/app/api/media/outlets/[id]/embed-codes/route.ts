import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const outlet = await prisma.mediaOutlet.findUnique({ where: { id: params.id } });
  if (!outlet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const baseUrl = "https://www.poll.city";
  const embeds = {
    tickerDark: `<script src="${baseUrl}/ticker.js?outlet=${outlet.id}&theme=dark"><\/script>`,
    tickerLight: `<script src="${baseUrl}/ticker.js?outlet=${outlet.id}&theme=light"><\/script>`,
    tickerTop: `<script src="${baseUrl}/ticker.js?outlet=${outlet.id}&position=top"><\/script>`,
    tickerBottom: `<script src="${baseUrl}/ticker.js?outlet=${outlet.id}&position=bottom"><\/script>`,
    resultsIframe: `<iframe src="${baseUrl}/embed/results?outlet=${outlet.id}" style="width:100%;height:600px;border:none;"></iframe>`,
  };

  return NextResponse.json({ data: embeds });
}
