import { NextResponse } from "next/server";
import { getPublishedArticles } from "@/lib/help-center/store";

export async function GET() {
  const articles = await getPublishedArticles();
  return NextResponse.json({ data: articles });
}
