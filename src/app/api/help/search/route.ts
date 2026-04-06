import { NextRequest, NextResponse } from "next/server";
import { searchArticles } from "@/lib/help-center/store";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const results = await searchArticles(q);
  return NextResponse.json({ data: results });
}
