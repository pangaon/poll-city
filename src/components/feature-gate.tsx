"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { hasFeature, upgradeContext, type Feature } from "@/lib/feature-flags";

interface FeatureGateProps {
  campaignPlan: string | null | undefined;
  feature: Feature;
  children: React.ReactNode;
  /** When true, render children dimmed with an overlay. When false, render only the upgrade prompt. */
  showWhenLocked?: boolean;
}

/**
 * Wraps a feature UI. If the plan allows it, renders children.
 * If not, renders children dimmed with an overlay CTA to upgrade.
 */
export function FeatureGate({ campaignPlan, feature, children, showWhenLocked = true }: FeatureGateProps) {
  if (hasFeature(campaignPlan, feature)) {
    return <>{children}</>;
  }

  const ctx = upgradeContext(campaignPlan, feature);

  if (!showWhenLocked) {
    return <UpgradePrompt feature={feature} />;
  }

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none opacity-40 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl">
        <div className="max-w-xs text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-lg">
          <Lock className="w-8 h-8 mx-auto mb-2 text-amber-500" />
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {featureLabel(feature)}
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Requires {ctx.requiredPlanLabel} plan or higher.
          </p>
          <Link
            href={ctx.upgradeUrl}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade Now
          </Link>
        </div>
      </div>
    </div>
  );
}

export function UpgradePrompt({ feature }: { feature: Feature }) {
  const ctx = upgradeContext(null, feature);
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
      <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{featureLabel(feature)}</p>
        <p className="text-xs text-gray-600">Unlocks on {ctx.requiredPlanLabel} plan</p>
      </div>
      <Link
        href={ctx.upgradeUrl}
        className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
      >
        Upgrade
      </Link>
    </div>
  );
}

function featureLabel(feature: Feature): string {
  const map: Record<Feature, string> = {
    contacts_import: "Contact Import",
    contacts_export: "Contact Export",
    smart_import_ai: "AI Smart Import",
    unlimited_contacts: "Unlimited Contacts",
    custom_fields: "Custom Fields",
    gotv_engine: "GOTV Engine",
    push_notifications: "Push Notifications",
    analytics_basic: "Analytics",
    analytics_advanced: "Advanced Analytics",
    ai_predictions: "AI Predictions",
    route_optimization: "Route Optimization",
    print_marketplace: "Print Marketplace",
    social_media_management: "Social Media Management",
    communications_email: "Email Campaigns",
    communications_sms: "SMS Campaigns",
    api_access: "API Access",
    white_label: "White Label",
    dedicated_database: "Dedicated Database",
    custom_domain: "Custom Domain",
    team_management: "Team Management",
    bulk_actions: "Bulk Actions",
  };
  return map[feature];
}
