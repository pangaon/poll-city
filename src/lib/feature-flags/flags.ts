/**
 * Feature flag and tier gating system.
 *
 * Tiers: free, pro, enterprise
 * Flags can be: enabled for all, enabled per tier, enabled per campaign, disabled.
 */

export type Tier = "free" | "pro" | "enterprise";

export interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  /** Minimum tier required (null = available to all) */
  minTier: Tier | null;
  /** Default enabled state for the minimum tier */
  defaultEnabled: boolean;
  /** Category for UI grouping */
  category: "core" | "communications" | "analytics" | "integrations" | "security" | "ai";
}

export const FEATURE_FLAGS: FeatureFlag[] = [
  // Core — free tier
  { key: "contacts", label: "Contact Management", description: "CRM with up to 500 contacts", minTier: null, defaultEnabled: true, category: "core" },
  { key: "canvassing", label: "Canvassing & Walk Lists", description: "Door-to-door canvassing tools", minTier: null, defaultEnabled: true, category: "core" },
  { key: "gotv", label: "GOTV Tools", description: "Priority lists and voted tracker", minTier: null, defaultEnabled: true, category: "core" },
  { key: "tasks", label: "Task Management", description: "Assign and track tasks", minTier: null, defaultEnabled: true, category: "core" },
  { key: "signs", label: "Sign Tracking", description: "Lawn sign request and placement tracking", minTier: null, defaultEnabled: true, category: "core" },
  { key: "events", label: "Events", description: "Event creation and RSVP management", minTier: null, defaultEnabled: true, category: "core" },
  { key: "volunteers", label: "Volunteer Management", description: "Shifts, groups, and expenses", minTier: null, defaultEnabled: true, category: "core" },
  { key: "donations", label: "Donation Tracking", description: "Log and receipt donations", minTier: null, defaultEnabled: true, category: "core" },
  { key: "budget", label: "Budget Tracker", description: "Spending limit compliance", minTier: null, defaultEnabled: true, category: "core" },

  // Pro tier
  { key: "unlimited_contacts", label: "Unlimited Contacts", description: "No contact limit", minTier: "pro", defaultEnabled: true, category: "core" },
  { key: "email_campaigns", label: "Email Campaigns", description: "CASL-compliant email blasts", minTier: "pro", defaultEnabled: true, category: "communications" },
  { key: "sms_campaigns", label: "SMS Campaigns", description: "Text message blasts", minTier: "pro", defaultEnabled: true, category: "communications" },
  { key: "analytics_full", label: "Full Analytics Suite", description: "Campaign, canvassing, supporter, donation, GOTV analytics", minTier: "pro", defaultEnabled: true, category: "analytics" },
  { key: "custom_fields", label: "Custom Fields", description: "Campaign-defined data fields on contacts", minTier: "pro", defaultEnabled: true, category: "core" },
  { key: "print_marketplace", label: "Print Marketplace", description: "Order lawn signs, door hangers, flyers", minTier: "pro", defaultEnabled: true, category: "core" },
  { key: "csv_exports", label: "CSV Exports", description: "Export contacts, walk lists, GOTV lists", minTier: "pro", defaultEnabled: true, category: "core" },
  { key: "import_smart", label: "Smart Import", description: "Background import with dedup and rollback", minTier: "pro", defaultEnabled: true, category: "core" },
  { key: "polls", label: "Poll Builder", description: "Create and distribute polls", minTier: "pro", defaultEnabled: true, category: "core" },
  { key: "tv_mode", label: "TV Mode", description: "Campaign war room display", minTier: "pro", defaultEnabled: true, category: "core" },

  // Enterprise tier
  { key: "voice_broadcasts", label: "Voice Broadcasts", description: "Robocalls, voice drops, IVR polls (CRTC compliant)", minTier: "enterprise", defaultEnabled: true, category: "communications" },
  { key: "phone_banking", label: "Phone Banking", description: "Browser-based calling via Twilio", minTier: "enterprise", defaultEnabled: true, category: "communications" },
  { key: "call_center", label: "Call Center Integration", description: "CallHub and universal webhook", minTier: "enterprise", defaultEnabled: true, category: "integrations" },
  { key: "social_manager", label: "Social Media Manager", description: "Multi-platform scheduling and monitoring", minTier: "enterprise", defaultEnabled: true, category: "communications" },
  { key: "adoni_ai", label: "Adoni AI Assistant", description: "AI chief of staff with 16 tools", minTier: "enterprise", defaultEnabled: true, category: "ai" },
  { key: "adoni_auto_execute", label: "Adoni Auto-Execute", description: "Adoni can take actions without confirmation", minTier: "enterprise", defaultEnabled: false, category: "ai" },
  { key: "custom_roles", label: "Custom Roles", description: "Create custom permission roles", minTier: "enterprise", defaultEnabled: true, category: "security" },
  { key: "trust_levels", label: "Trust Levels", description: "5-level trust system for data access gating", minTier: "enterprise", defaultEnabled: true, category: "security" },
  { key: "security_monitoring", label: "Security Monitoring", description: "24/7 security scan, injection detection, anomaly alerts", minTier: "enterprise", defaultEnabled: true, category: "security" },
  { key: "api_access", label: "API Access", description: "REST API for custom integrations", minTier: "enterprise", defaultEnabled: false, category: "integrations" },
  { key: "white_label", label: "White Label", description: "Custom domain and branding removal", minTier: "enterprise", defaultEnabled: false, category: "core" },
  { key: "multi_campaign", label: "Multi-Campaign", description: "Manage multiple campaigns from one account", minTier: "enterprise", defaultEnabled: true, category: "core" },
  { key: "constituent_crm", label: "Constituent CRM", description: "Case file management for elected officials", minTier: "enterprise", defaultEnabled: true, category: "core" },
  { key: "maps_advanced", label: "Advanced Maps", description: "Heat maps, route optimization, area analysis", minTier: "enterprise", defaultEnabled: true, category: "analytics" },
];

const FEATURE_FLAG_INDEX: Record<string, FeatureFlag> = FEATURE_FLAGS.reduce((acc, flag) => {
  acc[flag.key] = flag;
  return acc;
}, {} as Record<string, FeatureFlag>);

/** Tier hierarchy for comparison */
const TIER_ORDER: Record<Tier, number> = { free: 0, pro: 1, enterprise: 2 };

/** Check if a tier meets the minimum requirement */
export function tierMeetsMinimum(userTier: Tier, requiredTier: Tier | null): boolean {
  if (!requiredTier) return true;
  return TIER_ORDER[userTier] >= TIER_ORDER[requiredTier];
}

/** Check if a feature is enabled for a given tier and optional campaign overrides */
export function isFeatureEnabled(
  featureKey: string,
  userTier: Tier,
  campaignOverrides?: Record<string, boolean>,
): boolean {
  // Campaign-level override takes precedence
  if (campaignOverrides && featureKey in campaignOverrides) {
    return campaignOverrides[featureKey];
  }

  const flag = FEATURE_FLAG_INDEX[featureKey];
  if (!flag) return false;

  if (!tierMeetsMinimum(userTier, flag.minTier)) return false;
  return flag.defaultEnabled;
}

export function sanitizeFeatureOverrides(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object") return {};

  const input = raw as Record<string, unknown>;
  const sanitized: Record<string, boolean> = {};

  for (const [key, value] of Object.entries(input)) {
    if (!(key in FEATURE_FLAG_INDEX)) continue;
    if (typeof value !== "boolean") continue;
    sanitized[key] = value;
  }

  return sanitized;
}

/** Get all features available for a tier */
export function getFeaturesForTier(tier: Tier): FeatureFlag[] {
  return FEATURE_FLAGS.filter((f) => tierMeetsMinimum(tier, f.minTier));
}

/** Free tier contact limit */
export const FREE_TIER_CONTACT_LIMIT = 500;

/** Pricing (CAD) */
export const TIER_PRICING = {
  free: { monthly: 0, annual: 0, label: "Free", description: "For small campaigns getting started" },
  pro: { monthly: 49, annual: 468, label: "Pro", description: "For serious campaigns running to win" },
  enterprise: { monthly: 149, annual: 1428, label: "Enterprise", description: "For large campaigns and elected officials" },
} as const;
