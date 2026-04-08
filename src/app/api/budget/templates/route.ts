import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { SYSTEM_BUDGET_TEMPLATES, findTemplate } from "@/lib/budget/templates";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/budget/templates — list system + campaign custom templates.
 * POST /api/budget/templates — apply a template to the campaign (creates BudgetRules from template items).
 */

const applySchema = z.object({
  campaignId: z.string().min(1),
  templateId: z.string().min(1),
  replaceExisting: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "budget:read");
  if (forbidden) return forbidden;

  const electionLevel = sp.get("electionLevel");

  const customTemplates = await prisma.budgetTemplate.findMany({
    where: { campaignId: campaignId! },
    orderBy: { createdAt: "desc" },
  });

  const filteredSystem = electionLevel
    ? SYSTEM_BUDGET_TEMPLATES.filter((t) => t.electionLevel === electionLevel)
    : SYSTEM_BUDGET_TEMPLATES;

  return NextResponse.json({
    data: {
      system: filteredSystem,
      custom: customTemplates,
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const raw = await req.json().catch(() => null);
  const parsed = applySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { campaignId, templateId, replaceExisting } = parsed.data;

  const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, campaignId, "budget:write");
  if (forbidden2) return forbidden2;

  const template = findTemplate(templateId);
  if (!template) {
    // Try campaign's custom template
    const custom = await prisma.budgetTemplate.findFirst({
      where: { id: templateId, OR: [{ campaignId }, { campaignId: null }] },
    });
    if (!custom) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    const items = custom.items as Array<{ category: string; percentOfTotal: number; priority: number; notes?: string }>;

    if (replaceExisting) {
      await prisma.budgetRule.deleteMany({ where: { campaignId: campaignId! } });
    }

    const created = await Promise.all(
      items.map((item) =>
        prisma.budgetRule.create({
          data: {
            campaignId,
            category: item.category,
            percentOfTotal: item.percentOfTotal,
            priority: item.priority,
            notes: item.notes ?? null,
            warnAtPercent: 0.85,
            isActive: true,
          },
        })
      )
    );
    return NextResponse.json({ data: { applied: created.length, template: custom.name } });
  }

  // System template
  if (replaceExisting) {
    await prisma.budgetRule.deleteMany({ where: { campaignId: campaignId! } });
  }

  const created = await Promise.all(
    template.items.map((item) =>
      prisma.budgetRule.create({
        data: {
          campaignId,
          category: item.category,
          percentOfTotal: item.percentOfTotal,
          priority: item.priority,
          notes: item.notes,
          warnAtPercent: 0.85,
          isActive: true,
        },
      })
    )
  );

  return NextResponse.json({ data: { applied: created.length, template: template.name } });
}
