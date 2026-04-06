import { NextResponse } from "next/server";
import { submitFeedback } from "@/lib/help-center/store";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = (await req.json().catch(() => null)) as { helpful?: boolean } | null;
  if (typeof body?.helpful !== "boolean") {
    return NextResponse.json({ error: "helpful must be boolean" }, { status: 400 });
  }

  const summary = await submitFeedback(params.slug, body.helpful);
  return NextResponse.json({ data: summary });
}
