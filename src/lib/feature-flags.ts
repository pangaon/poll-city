/**
 * Poll City Feature Flags — central tier gating system.
 *
 * Every paid feature is gated here. UIs should call `hasFeature(plan, feature)`
 * before rendering. Locked features should still be shown (greyed out + upgrade prompt),
 * never hidden completely — so campaigns know what they are missing.
 */

export type Plan = "free_trial" | "starter" | "pro" | "official" | "command";

const PLAN_RANK: Record<Plan, number> = {
  free_trial: 0,
  starter: 1,
  pro: 2,
  official: 3,
  command: 4,
};

export type Feature =
  | "contacts_import"
  | "contacts_export"
  | "smart_import_ai"
  | "unlimited_contacts"
  | "custom_fields"
  | "gotv_engine"
  | "push_notifications"
  | "analytics_basic"
  | "analytics_advanced"
  | "ai_predictions"
  | "route_optimization"
  | "print_marketplace"
  | "social_media_management"
  | "communications_email"
  | "communications_sms"
  | "api_access"
  | "white_label"
  | "dedicated_database"
  | "custom_domain"
  | "team_management"
  | "bulk_actions";

const FEATURE_MIN_PLAN: Record<Feature, Plan> = {
  contacts_import: "starter",
  contacts_export: "starter",
  smart_import_ai: "pro",
  unlimited_contacts: "pro",
  custom_fields: "pro",
  gotv_engine: "starter",
  push_notifications: "starter",
  analytics_basic: "starter",
  analytics_advanced: "pro",
  ai_predictions: "pro",
  route_optimization: "pro",
  print_marketplace: "starter",
  social_media_management: "pro",
  communications_email: "starter",
  communications_sms: "pro",
  api_access: "command",
  white_label: "command",
  dedicated_database: "command",
  custom_domain: "pro",
  team_management: "starter",
  bulk_actions: "starter",
};

const PLAN_LABEL: Record<Plan, string> = {
  free_trial: "Free Trial",
  starter: "Starter",
  pro: "Pro",
  official: "Official",
  command: "Command",
};

/**
 * Check whether a given campaign plan has access to a feature.
 * Returns true if the plan rank is >= the feature's required rank.
 */
export function hasFeature(campaignPlan: string | null | undefined, feature: Feature): boolean {
  const plan = normalizePlan(campaignPlan);
  const required = FEATURE_MIN_PLAN[feature];
  return PLAN_RANK[plan] >= PLAN_RANK[required];
}

/**
 * Get the minimum plan required for a feature.
 */
export function requiredPlan(feature: Feature): Plan {
  return FEATURE_MIN_PLAN[feature];
}

/**
 * Human-readable plan name for display.
 */
export function planLabel(plan: string | null | undefined): string {
  return PLAN_LABEL[normalizePlan(plan)];
}

/**
 * Return the upgrade context for a locked feature.
 */
export function upgradeContext(campaignPlan: string | null | undefined, feature: Feature) {
  const currentPlan = normalizePlan(campaignPlan);
  const needed = FEATURE_MIN_PLAN[feature];
  return {
    locked: !hasFeature(currentPlan, feature),
    currentPlan,
    currentPlanLabel: PLAN_LABEL[currentPlan],
    requiredPlan: needed,
    requiredPlanLabel: PLAN_LABEL[needed],
    upgradeUrl: "/billing",
  };
}

function normalizePlan(plan: string | null | undefined): Plan {
  if (!plan) return "free_trial";
  const lower = plan.toLowerCase().trim();
  if (lower in PLAN_RANK) return lower as Plan;
  // Legacy aliases
  if (lower === "trial") return "free_trial";
  if (lower === "basic") return "starter";
  if (lower === "professional") return "pro";
  if (lower === "enterprise") return "command";
  return "free_trial";
}
