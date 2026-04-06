import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { getOpsVideoRows, getArticleBySlug, getCategoryCatalog, getVideoScript } from "@/lib/help-center/store";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (!ADMIN_ROLES.has(session!.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await getOpsVideoRows();
  const statusCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  const retroactiveQueue = rows
    .filter((row) => row.status === "no_video" || row.status === "needs_update")
    .sort((a, b) => b.pageViews - a.pageViews);

  const withScripts = await Promise.all(
    rows.map(async (row) => {
      const article = await getArticleBySlug(row.slug);
      const script = await getVideoScript(row.slug);
      return {
        ...row,
        article,
        script,
      };
    })
  );

  return NextResponse.json({
    data: withScripts,
    stats: {
      total: rows.length,
      verified: statusCounts.verified || 0,
      no_video: statusCounts.no_video || 0,
      needs_update: statusCounts.needs_update || 0,
      script_ready: statusCounts.script_ready || 0,
      not_built: statusCounts.not_built || 0,
    },
    retroactiveQueue,
    categories: getCategoryCatalog(),
  });
}
