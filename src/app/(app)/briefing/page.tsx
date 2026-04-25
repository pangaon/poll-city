"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sun, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Users, ArrowRight, Target, DollarSign, MapPin, ChevronRight,
  Sparkles, Loader2, Rocket, Upload, CreditCard, Calendar,
} from "lucide-react";
import { useActiveCampaignId } from "@/lib/hooks/useActiveCampaignId";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BriefingData {
  campaign: { name: string; candidateName: string | null; daysToElection: number | null; phase: string };
  yesterday: { doorsKnocked: number; newSupporters: number; donations: number; donationAmount: number };
  trends: { doorsThisWeek: number; doorsLastWeek: number; doorsWoWChange: number; supportRate: number };
  totals: { contacts: number; supporters: number; undecided: number; signs: number; budgetUsed: number; budgetLimit: number; budgetUsedPct: number; totalDonated: number };
  volunteers: { active: number; quiet: number; newThisWeek: number };
  upcomingEvents: { id: string; name: string; date: string; location: string }[];
  overdueTasks: number;
  priorities: { priority: number; action: string; why: string; link: string }[];
  redFlags: string[];
}

interface HealthData {
  healthScore: number;
  grade: string;
  breakdown: Record<string, { score: number; weight: number; value: number; label: string; unit?: string }>;
  daysToElection: number | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case "GOTV_FINAL": return "GOTV — Final Push";
    case "GOTV_EARLY": return "GOTV Phase";
    case "MOMENTUM": return "Momentum Phase";
    case "FOUNDATION": return "Foundation Phase";
    case "ELECTION_DAY": return "Election Day";
    default: return "Post-Election";
  }
}

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

function card(i: number) {
  return {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { ...SPRING, delay: i * 0.06 } },
  };
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 rounded-xl ${className ?? ""}`} />;
}

function BriefingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5 pb-24">
      {/* header */}
      <div className="space-y-2 pt-1">
        <Pulse className="h-3.5 w-28" />
        <Pulse className="h-8 w-56" />
        <Pulse className="h-3.5 w-40" />
      </div>
      {/* adoni */}
      <Pulse className="h-24 rounded-2xl" />
      {/* health + flags row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Pulse className="h-44 rounded-2xl" />
        <div className="md:col-span-2 space-y-3">
          <Pulse className="h-20 rounded-xl" />
          <Pulse className="h-20 rounded-xl" />
        </div>
      </div>
      {/* priorities */}
      <Pulse className="h-52 rounded-2xl" />
      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Pulse key={i} className="h-24 rounded-xl" />)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Health Ring                                                        */
/* ------------------------------------------------------------------ */

function HealthRing({ score, grade }: { score: number; grade: string }) {
  const [progress, setProgress] = useState(0);
  const circumference = 2 * Math.PI * 52;
  const color = score >= 65 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626";

  useEffect(() => {
    const id = requestAnimationFrame(() => setProgress(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg width="120" height="120" className="-rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(progress / 100) * circumference} ${circumference}`}
            style={{ transition: "stroke-dasharray 1.1s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <span className="absolute text-3xl font-black text-gray-900">{score}</span>
      </div>
      <p className="mt-1 text-sm font-bold" style={{ color }}>Grade {grade}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon, alert }: { label: string; value: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${alert ? "border-red-200 bg-red-50" : "border-gray-100"}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className={alert ? "text-red-400" : "text-gray-400"}>{icon}</span>
        <p className={`text-xs font-semibold uppercase tracking-wide ${alert ? "text-red-500" : "text-gray-400"}`}>{label}</p>
      </div>
      <p className={`text-2xl font-bold ${alert ? "text-red-700" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BriefingPage() {
  const { campaignId, status: sessionStatus } = useActiveCampaignId();
  const [data, setData] = useState<BriefingData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [adoniSummary, setAdoniSummary] = useState<string | null>(null);
  const [adoniLoading, setAdoniLoading] = useState(false);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "no-campaign") { setLoading(false); return; }

    setLoading(true);
    setData(null);
    setHealth(null);
    setAdoniSummary(null);

    Promise.all([
      fetch(`/api/briefing?campaignId=${campaignId}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/briefing/health-score?campaignId=${campaignId}`).then(r => r.ok ? r.json() : null),
    ]).then(([briefing, healthScore]) => {
      setData(briefing);
      setHealth(healthScore);

      if (briefing && campaignId) {
        setAdoniLoading(true);
        const snapshot = {
          campaignName: briefing.campaign.name,
          candidateName: briefing.campaign.candidateName,
          daysToElection: briefing.campaign.daysToElection,
          phase: briefing.campaign.phase,
          doorsKnockedYesterday: briefing.yesterday.doorsKnocked,
          newSupportersYesterday: briefing.yesterday.newSupporters,
          donationsYesterday: briefing.yesterday.donations,
          donationAmountYesterday: briefing.yesterday.donationAmount,
          doorsThisWeek: briefing.trends.doorsThisWeek,
          doorsWoWChange: briefing.trends.doorsWoWChange,
          supportRate: briefing.trends.supportRate,
          totalContacts: briefing.totals.contacts,
          totalSupporters: briefing.totals.supporters,
          volunteers: briefing.volunteers,
          overdueTasks: briefing.overdueTasks,
          redFlags: briefing.redFlags,
          priorities: briefing.priorities,
        };
        fetch("/api/briefing/adoni-summary", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ campaignId, snapshot }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.summary) setAdoniSummary(d.summary); })
          .catch(() => {})
          .finally(() => setAdoniLoading(false));
      }
    }).finally(() => setLoading(false));
  }, [campaignId, sessionStatus]);

  /* ---- loading ---- */
  if (sessionStatus === "loading" || loading) return <BriefingSkeleton />;

  /* ---- no campaign ---- */
  if (sessionStatus === "no-campaign" || !data) {
    return (
      <motion.div
        className="max-w-xl mx-auto p-6 text-center py-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-5">
          <Sun className="h-8 w-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Morning Brief</h1>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
          Select a campaign from the sidebar to see your daily briefing — doors knocked, supporters added, what needs your attention today.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A2342] text-white text-sm font-semibold rounded-xl hover:bg-[#0d2d56] transition-colors"
        >
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    );
  }

  const d = data;
  const h = health;
  const isNewCampaign = d.totals.contacts < 10 && d.campaign.phase === "FOUNDATION";
  const hasYesterdayActivity = d.yesterday.doorsKnocked > 0 || d.yesterday.newSupporters > 0 || d.yesterday.donations > 0;
  const wowUp = d.trends.doorsWoWChange >= 0;
  const maxPace = Math.max(d.trends.doorsThisWeek, d.trends.doorsLastWeek, 1);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5 pb-24">

      {/* ---- Header ---- */}
      <motion.div variants={card(0)} initial="hidden" animate="visible">
        <p className="text-xs font-semibold text-amber-600 flex items-center gap-1.5 mb-1">
          <Sun className="h-3.5 w-3.5" />
          {phaseLabel(d.campaign.phase)}
          {d.campaign.daysToElection !== null && (
            <span className="text-gray-400 font-normal">· {d.campaign.daysToElection} days to election</span>
          )}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {timeGreeting()}, {d.campaign.candidateName?.split(" ")[0] ?? "there"}.
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Here is where your campaign stands this morning.</p>
      </motion.div>

      {/* ---- Red Flags (urgent — rendered first when present) ---- */}
      {d.redFlags.length > 0 && (
        <motion.div
          variants={card(1)}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5"
        >
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-red-700 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
            Attention needed
          </p>
          <div className="space-y-2">
            {d.redFlags.map((flag, i) => (
              <p key={i} className="text-sm text-red-800 flex items-start gap-2">
                <span className="mt-0.5 text-red-400 shrink-0">•</span>
                {flag}
              </p>
            ))}
          </div>
        </motion.div>
      )}

      {/* ---- Day 1 Welcome ---- */}
      {isNewCampaign && (
        <motion.div
          variants={card(d.redFlags.length > 0 ? 2 : 1)}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-[#1D9E75]/30 bg-gradient-to-br from-[#1D9E75]/10 to-emerald-50 p-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1D9E75] flex items-center justify-center shrink-0">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Welcome to your campaign command centre.</p>
              <p className="text-sm text-slate-600 mt-1">
                {d.campaign.daysToElection !== null
                  ? `You have ${d.campaign.daysToElection} days until election day. Here is what to do first.`
                  : "Let us get your campaign operational. Three things need your attention right now."}
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { href: "/import-export", icon: Upload, label: "Import your contacts" },
                  { href: "/settings/team", icon: Users, label: "Invite your team" },
                  { href: "/fundraising?tab=settings", icon: CreditCard, label: "Connect donations" },
                ].map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 hover:border-[#1D9E75] hover:bg-[#1D9E75]/5 rounded-xl text-sm font-medium text-slate-700 transition-colors group"
                  >
                    <Icon className="w-4 h-4 text-[#1D9E75] shrink-0" />
                    <span>{label}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-300 group-hover:text-[#1D9E75] transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ---- Adoni's Morning Read ---- */}
      {(adoniLoading || adoniSummary) && (
        <motion.div
          variants={card(2)}
          initial="hidden"
          animate="visible"
          className="rounded-2xl bg-gradient-to-br from-[#0A2342] to-[#0d2d56] p-5 text-white shadow-md"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1D9E75] to-[#0A2342] flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white/90">Adoni&apos;s Morning Read</span>
          </div>
          {adoniLoading ? (
            <div className="space-y-2">
              <div className="h-3.5 bg-white/10 rounded animate-pulse w-full" />
              <div className="h-3.5 bg-white/10 rounded animate-pulse w-4/5" />
              <div className="h-3.5 bg-white/10 rounded animate-pulse w-11/12" />
            </div>
          ) : (
            <p className="text-sm text-white/90 leading-relaxed">{adoniSummary}</p>
          )}
        </motion.div>
      )}

      {/* ---- Health Score + Yesterday ---- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {h && (
          <motion.div
            variants={card(3)}
            initial="hidden"
            animate="visible"
            className="md:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Campaign Health</p>
            <HealthRing score={h.healthScore} grade={h.grade} />
          </motion.div>
        )}

        <motion.div
          variants={card(4)}
          initial="hidden"
          animate="visible"
          className={`${h ? "md:col-span-2" : "md:col-span-3"} bg-white rounded-2xl border border-gray-100 shadow-sm p-5`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Yesterday</p>
          {hasYesterdayActivity ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { value: d.yesterday.doorsKnocked, label: "doors knocked", color: "text-gray-900" },
                { value: `+${d.yesterday.newSupporters}`, label: "new supporters", color: "text-emerald-600" },
                { value: d.yesterday.donations, label: "donations", color: "text-gray-900" },
                { value: `$${d.yesterday.donationAmount.toLocaleString()}`, label: "raised", color: "text-gray-900" },
              ].map(({ value, label, color }) => (
                <div key={label}>
                  <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-400">No activity recorded yet.</p>
              <p className="text-xs text-gray-400 mt-1">Your numbers appear here once your team starts canvassing.</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ---- Top Priorities ---- */}
      {d.priorities.length > 0 && (
        <motion.div
          variants={card(5)}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Your top priorities today</p>
          <div className="space-y-2">
            {d.priorities.map((p) => (
              <Link
                key={p.priority}
                href={p.link}
                className="flex items-center gap-4 rounded-xl border border-gray-100 p-3.5 sm:p-4 hover:bg-blue-50 hover:border-blue-200 transition-colors group"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0A2342] text-white text-sm font-bold flex items-center justify-center">
                  {p.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">{p.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.why}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* ---- Stats Grid ---- */}
      <motion.div
        variants={card(6)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <StatCard label="Support rate" value={`${d.trends.supportRate}%`} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Contacts" value={d.totals.contacts.toLocaleString()} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Budget used" value={`${d.totals.budgetUsedPct}%`} alert={d.totals.budgetUsedPct > 80} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Signs" value={String(d.totals.signs)} icon={<MapPin className="h-4 w-4" />} />
      </motion.div>

      {/* ---- Canvassing Pace ---- */}
      <motion.div
        variants={card(7)}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Canvassing pace</p>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${wowUp ? "text-emerald-600" : "text-red-600"}`}>
            {wowUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {wowUp ? "+" : ""}{d.trends.doorsWoWChange}% vs last week
          </span>
        </div>
        <div className="space-y-3">
          {[
            { label: "This week", value: d.trends.doorsThisWeek, active: true },
            { label: "Last week", value: d.trends.doorsLastWeek, active: false },
          ].map(({ label, value, active }) => (
            <div key={label} className="flex items-center gap-3">
              <p className="text-xs text-gray-500 w-20 shrink-0">{label}</p>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${active ? "bg-[#0A2342]" : "bg-gray-300"}`}
                  style={{ width: `${Math.round((value / maxPace) * 100)}%` }}
                />
              </div>
              <p className={`text-sm font-bold w-10 text-right ${active ? "text-gray-900" : "text-gray-500"}`}>{value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ---- Team / Events / Tasks ---- */}
      <motion.div
        variants={card(8)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {/* Team */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Team</p>
          <p className="text-2xl font-bold text-gray-900">
            {d.volunteers.active}
            <span className="text-sm font-normal text-gray-500 ml-1">active</span>
          </p>
          {d.volunteers.newThisWeek > 0 && (
            <p className="text-xs text-emerald-600 mt-1">+{d.volunteers.newThisWeek} new this week</p>
          )}
          {d.volunteers.quiet > 0 && (
            <p className="text-xs text-amber-600 mt-1">{d.volunteers.quiet} gone quiet</p>
          )}
          {d.volunteers.active === 0 && (
            <Link href="/volunteers" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">
              Recruit volunteers <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Upcoming events</p>
          {d.upcomingEvents.length === 0 ? (
            <div>
              <p className="text-sm text-gray-400">No events scheduled.</p>
              <Link href="/events" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">
                Schedule one <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {d.upcomingEvents.slice(0, 3).map(e => (
                <div key={e.id} className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 leading-tight">{e.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(e.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })} · {e.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Tasks</p>
          {d.overdueTasks > 0 ? (
            <Link href="/tasks" className="group flex items-center gap-2 text-red-600 hover:text-red-700">
              <AlertTriangle className="h-4 w-4 animate-pulse" />
              <span className="font-semibold text-sm">{d.overdueTasks} overdue</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ) : (
            <p className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              All caught up
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
