import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Nightly at 3am — rebuilds Adoni's knowledge base from live system data.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { buildKnowledgeBase } = await import("@/lib/adoni/training/build-knowledge");
    await buildKnowledgeBase();
    return NextResponse.json({ ok: true, trainedAt: new Date().toISOString() });
  } catch (e) {
    console.error("[cron/adoni-train] failed:", e);
    return NextResponse.json({ ok: false, error: "Training failed" }, { status: 500 });
  }
}
