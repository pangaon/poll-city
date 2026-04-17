import { NextRequest, NextResponse } from "next/server";
import { processAutomationEnrollments } from "@/lib/automation/automation-engine";

export const dynamic = "force-dynamic";

/** GET /api/cron/automation-enrollments — process due automation steps
 *  Vercel cron: "0 * * * *" (every hour)
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processAutomationEnrollments();
  return NextResponse.json({ ok: true, ...result });
}
