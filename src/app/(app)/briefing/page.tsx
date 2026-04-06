"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, TrendingUp, TrendingDown, AlertTriangle, Calendar, CheckCircle, Users, ArrowRight, Target, DollarSign, MapPin, ChevronRight } from "lucide-react";

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

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function BriefingPage() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const campaignId = document.cookie.match(/activeCampaignId=([^;]+)/)?.[1] ?? "";
    Promise.all([
      fetch(`/api/briefing/morning?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/briefing/health-score?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
    ]).then(([briefing, healthScore]) => {
      setData(briefing);
      setHealth(healthScore);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-64 bg-gray-200 rounded-lg" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center py-20">
        <Sun className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Morning Brief</h1>
        <p className="text-gray-500 mb-6">Select a campaign to see your daily briefing.</p>
        <Link href="/dashboard" className="text-blue-600 font-medium hover:underline">Go to Dashboard</Link>
      </div>
    );
  }

  const d = data;
  const h = health;
  const phase = d.campaign.phase;
  const phaseLabel = phase === "GOTV_FINAL" ? "GOTV — Final Push" : phase === "GOTV_EARLY" ? "GOTV Phase" : phase === "MOMENTUM" ? "Momentum Phase" : phase === "FOUNDATION" ? "Foundation Phase" : phase === "ELECTION_DAY" ? "ELECTION DAY" : "Post-Election";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 pb-20">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-amber-600 flex items-center gap-1.5"><Sun className="h-4 w-4" /> {phaseLabel} {d.campaign.daysToElection !== null && `· ${d.campaign.daysToElection} days to election`}</p>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">{timeGreeting()}, {d.campaign.candidateName?.split(" ")[0] ?? "there"}.</h1>
        <p className="text-gray-500 mt-1">Here is where your campaign stands this morning.</p>
      </div>

      {/* Health Score + Red Flags */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {h && (
          <div className="md:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Campaign Health</p>
            <div className="mt-3 relative inline-flex items-center justify-center">
              <svg width="120" height="120" className="-rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={h.healthScore >= 65 ? "#16a34a" : h.healthScore >= 40 ? "#eab308" : "#dc2626"} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(h.healthScore / 100) * 327} 327`} />
              </svg>
              <span className="absolute text-3xl font-black text-gray-900">{h.healthScore}</span>
            </div>
            <p className="mt-2 text-sm font-semibold" style={{ color: h.healthScore >= 65 ? "#16a34a" : h.healthScore >= 40 ? "#eab308" : "#dc2626" }}>
              Grade: {h.grade}
            </p>
          </div>
        )}

        <div className={`${h ? "md:col-span-2" : "md:col-span-3"} space-y-3`}>
          {d.redFlags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Attention needed</p>
              {d.redFlags.map((flag, i) => <p key={i} className="text-sm text-red-800 mt-1">• {flag}</p>)}
            </div>
          )}

          {/* Yesterday's Activity */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Yesterday</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><p className="text-2xl font-bold text-gray-900">{d.yesterday.doorsKnocked}</p><p className="text-xs text-gray-500">doors knocked</p></div>
              <div><p className="text-2xl font-bold text-emerald-600">+{d.yesterday.newSupporters}</p><p className="text-xs text-gray-500">new supporters</p></div>
              <div><p className="text-2xl font-bold text-gray-900">{d.yesterday.donations}</p><p className="text-xs text-gray-500">donations</p></div>
              <div><p className="text-2xl font-bold text-gray-900">${d.yesterday.donationAmount.toLocaleString()}</p><p className="text-xs text-gray-500">raised</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Priorities */}
      {d.priorities.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Your top priorities today</p>
          <div className="space-y-3">
            {d.priorities.map((p) => (
              <Link key={p.priority} href={p.link} className="flex items-start gap-4 rounded-xl border border-gray-100 p-4 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">{p.priority}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 group-hover:text-blue-700">{p.action}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{p.why}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trends + Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Support rate" value={`${d.trends.supportRate}%`} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Contacts" value={d.totals.contacts.toLocaleString()} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Budget used" value={`${d.totals.budgetUsedPct}%`} alert={d.totals.budgetUsedPct > 80} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Signs" value={String(d.totals.signs)} icon={<MapPin className="h-4 w-4" />} />
      </div>

      {/* Canvassing Trend */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Canvassing pace</p>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${d.trends.doorsWoWChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {d.trends.doorsWoWChange >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {d.trends.doorsWoWChange >= 0 ? "+" : ""}{d.trends.doorsWoWChange}% vs last week
          </span>
        </div>
        <div className="mt-3 flex items-end gap-4">
          <div>
            <p className="text-3xl font-bold text-gray-900">{d.trends.doorsThisWeek}</p>
            <p className="text-xs text-gray-500">doors this week</p>
          </div>
          <div className="text-gray-400">vs</div>
          <div>
            <p className="text-xl font-semibold text-gray-500">{d.trends.doorsLastWeek}</p>
            <p className="text-xs text-gray-500">last week</p>
          </div>
        </div>
      </div>

      {/* Volunteers + Events + Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Team</p>
          <p className="text-2xl font-bold text-gray-900">{d.volunteers.active} <span className="text-sm font-normal text-gray-500">active</span></p>
          {d.volunteers.newThisWeek > 0 && <p className="text-xs text-emerald-600 mt-1">+{d.volunteers.newThisWeek} new this week</p>}
          {d.volunteers.quiet > 0 && <p className="text-xs text-amber-600 mt-1">{d.volunteers.quiet} gone quiet</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Upcoming events</p>
          {d.upcomingEvents.length === 0 ? (
            <p className="text-sm text-gray-400">No events scheduled</p>
          ) : (
            <div className="space-y-2">
              {d.upcomingEvents.slice(0, 3).map((e) => (
                <div key={e.id} className="text-sm">
                  <p className="font-medium text-gray-900">{e.name}</p>
                  <p className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })} · {e.location}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Tasks</p>
          {d.overdueTasks > 0 ? (
            <Link href="/tasks" className="flex items-center gap-2 text-red-600 hover:text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold">{d.overdueTasks} overdue</span>
            </Link>
          ) : (
            <p className="flex items-center gap-2 text-emerald-600"><CheckCircle className="h-4 w-4" /> All caught up</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, alert }: { label: string; value: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${alert ? "border-red-200" : "border-gray-100"}`}>
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">{icon}<p className="text-xs font-semibold uppercase tracking-wide">{label}</p></div>
      <p className={`text-2xl font-bold ${alert ? "text-red-700" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
