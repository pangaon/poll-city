import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { SYSTEM_BUDGET_TEMPLATES, templatesForLevel } from "@/lib/budget/templates";

export const dynamic = "force-dynamic";

interface SuggestionRow {
  category: string;
  suggestedAmount: number;
  currentAllocation: number;
  delta: number;
  source: "rule" | "template" | "history";
  priority: number;
  notes: string;
  warning?: string;
}

/**
 * Suggests a budget distribution for a campaign using (in priority order):
 * 1. Campaign's own BudgetRules (user-defined)
 * 2. A matching system template based on electionType
 * 3. Historical spending patterns from existing expenses
 *
 * Query params:
 *   campaignId (required)
 *   totalBudget (optional) — total dollars to distribute; if omitted, infers from current allocations
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "budget:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const totalParam = req.nextUrl.searchParams.get("totalBudget");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Load campaign and existing budget data
  const [campaign, rules, items] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { electionType: true, name: true },
    }),
    prisma.budgetRule.findMany({
      where: { campaignId, isActive: true },
      orderBy: [{ priority: "asc" }],
    }),
    prisma.budgetItem.findMany({
      where: { campaignId },
    }),
  ]);

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Determine total budget
  const currentAllocationByCategory = new Map<string, number>();
  const currentExpenseByCategory = new Map<string, number>();
  let currentTotalAllocation = 0;
  let currentTotalExpense = 0;

  for (const item of items) {
    if (item.itemType === "allocation") {
      currentTotalAllocation += item.amount;
      currentAllocationByCategory.set(item.category, (currentAllocationByCategory.get(item.category) ?? 0) + item.amount);
    } else {
      currentTotalExpense += item.amount;
      currentExpenseByCategory.set(item.category, (currentExpenseByCategory.get(item.category) ?? 0) + item.amount);
    }
  }

  const totalBudget = totalParam
    ? parseFloat(totalParam)
    : currentTotalAllocation > 0
    ? currentTotalAllocation
    : 50_000; // sensible default for inference

  const suggestions: SuggestionRow[] = [];
  const warnings: string[] = [];

  // 1) If campaign has custom rules, use them first
  if (rules.length > 0) {
    for (const rule of rules) {
      const suggested =
        rule.fixedAmount ?? (rule.percentOfTotal ? totalBudget * rule.percentOfTotal : 0);
      const current = currentAllocationByCategory.get(rule.category) ?? 0;
      const spent = currentExpenseByCategory.get(rule.category) ?? 0;

      let warning: string | undefined;
      if (current > 0 && spent / current >= rule.warnAtPercent) {
        warning = `At ${Math.round((spent / current) * 100)}% of allocation — approaching warn threshold (${Math.round(rule.warnAtPercent * 100)}%).`;
      }
      if (spent > current && current > 0) {
        warning = `OVER BUDGET by $${(spent - current).toFixed(2)}.`;
      }

      suggestions.push({
        category: rule.category,
        suggestedAmount: Math.round(suggested * 100) / 100,
        currentAllocation: current,
        delta: Math.round((suggested - current) * 100) / 100,
        source: "rule",
        priority: rule.priority,
        notes: rule.notes ?? "Custom rule for your campaign",
        warning,
      });
    }
  } else {
    // 2) Fall back to matching system template
    const level = (campaign.electionType as "federal" | "provincial" | "municipal") ?? "municipal";
    const templates = templatesForLevel(level);
    const template = templates[0] ?? SYSTEM_BUDGET_TEMPLATES[0];

    warnings.push(`No custom rules defined. Using template: "${template.name}". Create rules to personalise.`);

    for (const item of template.items) {
      const suggested = totalBudget * item.percentOfTotal;
      const current = currentAllocationByCategory.get(item.category) ?? 0;

      suggestions.push({
        category: item.category,
        suggestedAmount: Math.round(suggested * 100) / 100,
        currentAllocation: current,
        delta: Math.round((suggested - current) * 100) / 100,
        source: "template",
        priority: item.priority,
        notes: item.notes,
      });
    }
  }

  // Compute health metrics
  const health = {
    totalBudget,
    totalAllocated: Math.round(currentTotalAllocation * 100) / 100,
    totalSpent: Math.round(currentTotalExpense * 100) / 100,
    remaining: Math.round((currentTotalAllocation - currentTotalExpense) * 100) / 100,
    utilizationPct: currentTotalAllocation > 0 ? Math.round((currentTotalExpense / currentTotalAllocation) * 100) : 0,
    suggestedVariance: Math.round((currentTotalAllocation - totalBudget) * 100) / 100,
  };

  return NextResponse.json({
    data: {
      campaign: { name: campaign.name, electionType: campaign.electionType },
      totalBudget,
      suggestions: suggestions.sort((a, b) => a.priority - b.priority),
      health,
      warnings,
      hasCustomRules: rules.length > 0,
    },
  });
}
