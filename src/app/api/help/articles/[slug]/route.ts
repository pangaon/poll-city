import { NextResponse } from "next/server";
import { getArticleBySlug, getVideoScript } from "@/lib/help-center/store";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const article = await getArticleBySlug(params.slug);
  if (!article || !article.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const script = await getVideoScript(params.slug);
  return NextResponse.json({ data: article, script });
}
