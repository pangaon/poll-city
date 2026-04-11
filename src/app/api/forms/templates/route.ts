/**
 * GET /api/forms/templates — List available form templates.
 */
import { NextResponse } from "next/server";
import { FORM_TEMPLATES } from "@/lib/forms/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    templates: FORM_TEMPLATES.map((t) => ({
      key: t.key,
      name: t.name,
      title: t.title,
      description: t.description,
      icon: t.icon,
      fieldCount: t.fields.length,
    })),
  });
}
