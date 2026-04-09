"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Target,
  Users,
  Zap,
} from "lucide-react";
import type { CampaignStage, CampaignStageResponse } from "@/app/api/dashboard/campaign-stage/route";

// ── Stage metadata ────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<
  CampaignStage,
  {
    label: string;
    pillClass: string;
    bannerClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  empty: {
    label: "Getting Started",
    pillClass: "bg-slate-100 text-slate-600",
    bannerClass: "border border-slate-200 bg-white",
    icon: Users,
  },
  building: {
    label: "Building",
    pillClass: "bg-green-100 text-green-700",
    bannerClass: "border border-green-100 bg-green-50",
    icon: Zap,
  },
  active: {
    label: "Active",
    pillClass: "bg-blue-100 text-blue-700",
    bannerClass: "border border-blue-100 bg-blue-50",
    icon: CheckCircle2,
  },
  gotv: {
    label: "GOTV",
    pillClass: "bg-blue-600 text-white",
    bannerClass: "border border-blue-200 bg-blue-50 ring-1 ring-blue-400/30",
    icon: Target,
  },
  election_day: {
    label: "Election Day",
    pillClass: "bg-amber-500 text-white",
    bannerClass: "border-2 border-amber-400 bg-amber-50",
    icon: AlertTriangle,
  },
};

// ── Spring animation constant (matches CLAUDE.md spec) ───────────────────────
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

// ── Props ─────────────────────────────────────────────────────────────────────

interface StageBannerProps {
  campaignId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StageBanner({ campaignId }: StageBannerProps) {
  const [data, setData] = useState<CampaignStageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/dashboard/campaign-stage?campaignId=${encodeURIComponent(campaignId)}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as CampaignStageResponse;
        if (!cancelled) setData(json);
      } catch {
        // Non-critical — banner just won't show
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [campaignId]);

  // Don't render anything while loading or if data never arrived
  if (loading || !data) return null;

  const config = STAGE_CONFIG[data.stage];
  const Icon = config.icon;
  const isElectionDay = data.stage === "election_day";
  const isGotv = data.stage === "gotv";

  return (
    <AnimatePresence>
      <motion.div
        key="stage-banner"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={spring}
        className={`rounded-xl p-4 shadow-sm ${config.bannerClass} ${
          isElectionDay ? "w-full" : ""
        }`}
        role="region"
        aria-label="Campaign stage guidance"
      >
        {/* ── Top row: icon + stage pill + optional days label ── */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.pillClass}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {config.label}
          </span>

          {data.daysUntilElection !== null && !isElectionDay && (
            <span className="text-xs text-slate-500 font-medium">
              {data.daysUntilElection} day{data.daysUntilElection === 1 ? "" : "s"} to election
            </span>
          )}

          {isElectionDay && (
            <span className="text-sm font-bold text-amber-700 animate-pulse">
              Polls are open — get your supporters to vote!
            </span>
          )}

          {isGotv && (
            <span className="text-xs font-semibold text-blue-700">
              Final push — every vote counts
            </span>
          )}
        </div>

        {/* ── Next action cards ── */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {data.nextActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                ${
                  isElectionDay
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                    : isGotv
                      ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                      : "bg-white/80 text-slate-700 hover:bg-white border border-slate-100"
                }
                w-full sm:w-auto sm:flex-1
              `}
            >
              <span>{action.label}</span>
              <ArrowRight
                className="h-3.5 w-3.5 flex-shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
