"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FolderKanban, Route, MapPinned, PersonStanding,
  Footprints, SignpostBig, Users, Package, Bell, Smartphone, Activity,
  ChevronRight, CheckCircle2, Clock, PlayCircle, AlertTriangle,
  Target, TrendingUp, Map,
} from "lucide-react";
import { Spinner } from "@/components/ui";
import type { ShiftRow } from "@/app/(app)/field/runs/runs-client";
import type { RouteRow } from "@/app/(app)/field/routes/routes-client";
import type { TurfRow } from "@/app/(app)/field/turf/turf-client";
import type { LitDropRow, LitProgramRow } from "@/app/(app)/field/lit-drops/lit-drops-client";
import type { TeamRow } from "@/app/(app)/field/teams/teams-client";
import type { InventoryRow, ShiftWithMaterials } from "@/app/(app)/field/materials/materials-client";
import type { FollowUpRow } from "@/app/(app)/field/follow-ups/follow-ups-client";
import type { AuditRow } from "@/app/(app)/field/audit/audit-client";
import type { ActiveShiftRow } from "@/app/(app)/field/mobile/mobile-client";
import type { Program } from "@/app/(app)/field/programs/programs-client";
import type { FieldProgramType } from "@prisma/client";
import { cn } from "@/lib/utils";

// ── Enterprise panel lazy imports ─────────────────────────────────────────────

function PanelLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner className="h-6 w-6 text-gray-300" />
    </div>
  );
}

const ProgramsClient = dynamic(
  () => import("@/app/(app)/field/programs/programs-client"),
  { ssr: false, loading: () => <PanelLoader /> },
);
const RoutesClient = dynamic(
  () => import("@/app/(app)/field/routes/routes-client"),
  { ssr: false, loading: () => <PanelLoader /> },
);
const TurfClient = dynamic(
  () => import("@/app/(app)/field/turf/turf-client"),
  { ssr: false, loading: () => <PanelLoader /> },
);
const RunsClient = dynamic(
  () => import("@/app/(app)/field/runs/runs-client"),
  { ssr: false, loading: () => <PanelLoader /> },
);
const LitDropsClient = dynamic(
  () => import("@/app/(app)/field/lit-drops/lit-drops-client"),
  { ssr: false, loading: () => <PanelLoader /> },
);
const SignsClient = dynamic(
  () => import("@/app/(app)/signs/signs-client"),
  { ssr: false, loading: () => <PanelLoader /> },
);
const TeamsClient = dynamic(
  () => import("@/app/(app)/field/teams/teams-client"),
  { ssr: false, loading: () => <PanelLoader /> },
);
const MaterialsClient = dynamic(
  () => import("@/app/(app)/field/materials/materials-client"),
  { ssr: false, loading: () => <PanelLoader /> },
);
const FollowUpsClient = dynamic(
  () => import("@/app/(app)/field/follow-ups/follow-ups-client"),
  { ssr: false, loading: () => <PanelLoader /> },
);
const MobileFieldClient = dynamic(
  () => import("@/app/(app)/field/mobile/mobile-client"),
  { ssr: false, loading: () => <PanelLoader /> },
);
const FieldAuditClient = dynamic(
  () => import("@/app/(app)/field/audit/audit-client"),
  { ssr: false, loading: () => <PanelLoader /> },
);

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab =
  | "dashboard" | "programs" | "routes" | "turf" | "runs"
  | "lit-drops" | "signs" | "teams" | "materials" | "follow-ups"
  | "mobile" | "audit";

interface RouteProgram { id: string; name: string; programType: FieldProgramType }
interface RouteTurf    { id: string; name: string; ward: string | null }
interface TurfProgram  { id: string; name: string; programType: FieldProgramType }
interface TeamMember   { id: string; name: string | null; email: string }
interface RouteDensity { poll: string; contactCount: number }
interface TurfDensity  { poll: string; ward: string | null; contactCount: number }
interface ProgramTurf  { id: string; name: string; ward: string | null }

interface Props {
  campaignId: string;
  campaignName: string;
  // Programs
  initialPrograms: Program[];
  programTurfs: ProgramTurf[];
  // Routes
  initialRoutes: RouteRow[];
  routePrograms: RouteProgram[];
  routeTurfs: RouteTurf[];
  routeDensity: RouteDensity[];
  // Turf
  initialTurfs: TurfRow[];
  turfPrograms: TurfProgram[];
  teamMembers: TeamMember[];
  turfDensity: TurfDensity[];
  // Runs
  initialShifts: ShiftRow[];
  shiftPrograms: RouteProgram[];
  // Lit Drops
  initialLitDrops: LitDropRow[];
  litDropPrograms: LitProgramRow[];
  // Teams
  initialTeams: TeamRow[];
  // Materials
  inventory: InventoryRow[];
  materialShifts: ShiftWithMaterials[];
  // Follow-Ups
  initialFollowUps: FollowUpRow[];
  // Mobile
  activeShifts: ActiveShiftRow[];
  // Audit
  logs: AuditRow[];
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ReactNode; badge?: string }[] = [
  { key: "dashboard",  label: "Dashboard",  icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "programs",   label: "Programs",   icon: <FolderKanban className="h-4 w-4" /> },
  { key: "routes",     label: "Routes",     icon: <Route className="h-4 w-4" /> },
  { key: "turf",       label: "Turf",       icon: <MapPinned className="h-4 w-4" /> },
  { key: "runs",       label: "Runs",       icon: <PersonStanding className="h-4 w-4" /> },
  { key: "lit-drops",  label: "Lit Drops",  icon: <Footprints className="h-4 w-4" /> },
  { key: "signs",      label: "Signs",      icon: <SignpostBig className="h-4 w-4" /> },
  { key: "teams",      label: "Teams",      icon: <Users className="h-4 w-4" /> },
  { key: "materials",  label: "Materials",  icon: <Package className="h-4 w-4" /> },
  { key: "follow-ups", label: "Follow-Ups", icon: <Bell className="h-4 w-4" /> },
  { key: "mobile",     label: "Mobile",     icon: <Smartphone className="h-4 w-4" /> },
  { key: "audit",      label: "Audit",      icon: <Activity className="h-4 w-4" /> },
];

// ── Dashboard pipeline card ───────────────────────────────────────────────────

function PipelineCard({
  icon, label, value, sub, color, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-[#0A2342] hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("p-1.5 rounded-lg", color)}>{icon}</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-300 group-hover:text-[#0A2342] transition-colors" />
      </div>
      <p className="text-2xl font-bold text-[#0A2342]">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </motion.button>
  );
}

// ── Dashboard panel ───────────────────────────────────────────────────────────

function DashboardPanel({
  campaignName,
  initialPrograms,
  initialRoutes,
  initialTurfs,
  initialShifts,
  initialLitDrops,
  initialFollowUps,
  initialTeams,
  onNavigate,
}: {
  campaignName: string;
  initialPrograms: Program[];
  initialRoutes: RouteRow[];
  initialTurfs: TurfRow[];
  initialShifts: ShiftRow[];
  initialLitDrops: LitDropRow[];
  initialFollowUps: FollowUpRow[];
  initialTeams: TeamRow[];
  onNavigate: (tab: Tab) => void;
}) {
  const today = new Date().toDateString();

  const activePrograms = initialPrograms.filter((p) => p.status === "active").length;
  const totalPrograms  = initialPrograms.length;

  const totalRoutes = initialRoutes.length;
  const avgRouteCompletion = totalRoutes > 0
    ? Math.round(initialRoutes.reduce((a, r) => a + (r.completionPct ?? 0), 0) / totalRoutes)
    : 0;

  const totalTurfs    = initialTurfs.length;
  const coveredTurfs  = initialTurfs.filter((t) => t.completionPercent >= 100).length;
  const activeTurfs   = initialTurfs.filter((t) => t.status === "in_progress").length;

  const todayShifts   = initialShifts.filter((s) => new Date(s.scheduledDate).toDateString() === today);
  const activeShifts  = initialShifts.filter((s) => s.status === "in_progress").length;
  const completedShifts = initialShifts.filter((s) => s.status === "completed").length;

  const totalAttempts = initialShifts.reduce((a, s) => a + (s._count?.attempts ?? 0), 0);
  const pendingFollowUps = initialFollowUps.length;
  const activeTeams   = initialTeams.filter((t) => t.isActive).length;
  const activeLitDrops = initialLitDrops.filter((s) => s.status === "in_progress").length;

  const pipeline: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub: string;
    color: string;
    tab: Tab;
  }[] = [
    {
      icon: <FolderKanban className="h-4 w-4 text-[#0A2342]" />,
      label: "Programs",
      value: activePrograms,
      sub: `${totalPrograms} total`,
      color: "bg-blue-50",
      tab: "programs",
    },
    {
      icon: <Route className="h-4 w-4 text-indigo-600" />,
      label: "Routes",
      value: totalRoutes,
      sub: `${avgRouteCompletion}% avg completion`,
      color: "bg-indigo-50",
      tab: "routes",
    },
    {
      icon: <MapPinned className="h-4 w-4 text-[#1D9E75]" />,
      label: "Turf",
      value: activeTurfs,
      sub: `${coveredTurfs}/${totalTurfs} covered`,
      color: "bg-green-50",
      tab: "turf",
    },
    {
      icon: <PersonStanding className="h-4 w-4 text-amber-600" />,
      label: "Runs Today",
      value: todayShifts.length,
      sub: `${activeShifts} active · ${completedShifts} done`,
      color: "bg-amber-50",
      tab: "runs",
    },
    {
      icon: <Target className="h-4 w-4 text-purple-600" />,
      label: "Attempts",
      value: totalAttempts,
      sub: "total canvassing contacts",
      color: "bg-purple-50",
      tab: "runs",
    },
    {
      icon: <Footprints className="h-4 w-4 text-orange-600" />,
      label: "Lit Drops",
      value: activeLitDrops,
      sub: `${initialLitDrops.length} total`,
      color: "bg-orange-50",
      tab: "lit-drops",
    },
    {
      icon: <Users className="h-4 w-4 text-sky-600" />,
      label: "Teams",
      value: activeTeams,
      sub: "active field teams",
      color: "bg-sky-50",
      tab: "teams",
    },
    {
      icon: <Bell className="h-4 w-4 text-[#E24B4A]" />,
      label: "Follow-Ups",
      value: pendingFollowUps,
      sub: "pending actions",
      color: "bg-red-50",
      tab: "follow-ups",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Pipeline header */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <TrendingUp className="h-4 w-4" />
        <span className="font-medium">{campaignName}</span>
        <span>— field operations pipeline</span>
      </div>

      {/* Pipeline flow indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {(["programs", "routes", "turf", "runs"] as Tab[]).map((t, i) => {
          const cfg = TABS.find((x) => x.key === t)!;
          return (
            <div key={t} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onNavigate(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A2342] text-white text-xs font-medium hover:bg-[#1D9E75] transition-colors"
              >
                {cfg.icon}
                {cfg.label}
              </button>
              {i < 3 && <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {pipeline.map((p) => (
          <PipelineCard
            key={`${p.tab}-${p.label}`}
            icon={p.icon}
            label={p.label}
            value={p.value}
            sub={p.sub}
            color={p.color}
            onClick={() => onNavigate(p.tab)}
          />
        ))}
      </div>

      {/* Quick access row */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Quick access</p>
        <div className="flex flex-wrap gap-2">
          {TABS.filter((t) => !["dashboard", "programs", "routes", "turf", "runs"].includes(t.key)).map((t) => (
            <button
              key={t.key}
              onClick={() => onNavigate(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-[#0A2342] hover:text-[#0A2342] transition-colors"
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FieldOpsClient({
  campaignId,
  campaignName,
  initialPrograms,
  programTurfs,
  initialRoutes,
  routePrograms,
  routeTurfs,
  routeDensity,
  initialTurfs,
  turfPrograms,
  teamMembers,
  turfDensity,
  initialShifts,
  shiftPrograms,
  initialLitDrops,
  litDropPrograms,
  initialTeams,
  inventory,
  materialShifts,
  initialFollowUps,
  activeShifts,
  logs,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams?.get("tab") as Tab | null;
  const validTabs = TABS.map((t) => t.key);
  const activeTab: Tab = rawTab && validTabs.includes(rawTab) ? rawTab : "dashboard";

  const setTab = useCallback(
    (tab: Tab) => {
      const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
      params.set("tab", tab);
      router.push(`/field-ops?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 pt-4 pb-0">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#0A2342]">Field Operations</h1>
              <p className="text-sm text-gray-500">{campaignName}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Map className="h-3.5 w-3.5" />
              <span>Master Control</span>
            </div>
          </div>

          {/* ── Tab bar ──────────────────────────────────────────────────── */}
          <div className="flex overflow-x-auto gap-0.5 -mb-px pb-0">
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => setTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                    isActive
                      ? "border-[#0A2342] text-[#0A2342]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Panel ────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.15 }}
            className="h-full"
          >
            {activeTab === "dashboard" && (
              <div className="p-4 sm:p-6">
                <DashboardPanel
                  campaignName={campaignName}
                  initialPrograms={initialPrograms}
                  initialRoutes={initialRoutes}
                  initialTurfs={initialTurfs}
                  initialShifts={initialShifts}
                  initialLitDrops={initialLitDrops}
                  initialFollowUps={initialFollowUps}
                  initialTeams={initialTeams}
                  onNavigate={setTab}
                />
              </div>
            )}

            {activeTab === "programs" && (
              <ProgramsClient
                campaignId={campaignId}
                campaignName={campaignName}
                initialPrograms={initialPrograms}
                turfs={programTurfs}
              />
            )}

            {activeTab === "routes" && (
              <RoutesClient
                campaignId={campaignId}
                campaignName={campaignName}
                initialRoutes={initialRoutes}
                programs={routePrograms}
                turfs={routeTurfs}
                density={routeDensity}
              />
            )}

            {activeTab === "turf" && (
              <TurfClient
                campaignId={campaignId}
                campaignName={campaignName}
                initialTurfs={initialTurfs}
                programs={turfPrograms}
                teamMembers={teamMembers}
                density={turfDensity}
              />
            )}

            {activeTab === "runs" && (
              <RunsClient
                campaignId={campaignId}
                campaignName={campaignName}
                initialShifts={initialShifts}
                programs={shiftPrograms}
              />
            )}

            {activeTab === "lit-drops" && (
              <LitDropsClient
                campaignId={campaignId}
                campaignName={campaignName}
                initialShifts={initialLitDrops}
                programs={litDropPrograms}
              />
            )}

            {activeTab === "signs" && (
              <SignsClient campaignId={campaignId} />
            )}

            {activeTab === "teams" && (
              <TeamsClient
                campaignId={campaignId}
                campaignName={campaignName}
                initialTeams={initialTeams}
              />
            )}

            {activeTab === "materials" && (
              <MaterialsClient
                campaignId={campaignId}
                campaignName={campaignName}
                inventory={inventory}
                shifts={materialShifts}
              />
            )}

            {activeTab === "follow-ups" && (
              <FollowUpsClient
                campaignId={campaignId}
                campaignName={campaignName}
                initialFollowUps={initialFollowUps}
              />
            )}

            {activeTab === "mobile" && (
              <MobileFieldClient
                campaignId={campaignId}
                campaignName={campaignName}
                activeShifts={activeShifts}
              />
            )}

            {activeTab === "audit" && (
              <FieldAuditClient
                campaignId={campaignId}
                campaignName={campaignName}
                logs={logs}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
