import { NextRequest, NextResponse } from "next/server";
import { submitFeedback } from "@/lib/help-center/store";
import { apiPublicRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await apiPublicRateLimit(ip);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { helpful?: boolean } | null;
  if (typeof body?.helpful !== "boolean") {
    return NextResponse.json({ error: "helpful must be boolean" }, { status: 400 });
  }

  const summary = await submitFeedback(params.slug, body.helpful);
  return NextResponse.json({ data: summary });
}
