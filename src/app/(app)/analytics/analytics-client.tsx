"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Download,
  FileText,
  Flag,
  HandHeart,
  Megaphone,
  Radio,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ChoroplethMap = dynamic(() => import("./choropleth-map"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-xl bg-gray-100" />,
});

type TabKey = "overview" | "canvassing" | "supporters" | "gotv" | "signs" | "volunteers" | "donations" | "communications" | "predictions";

interface Props {
  campaignId: string;
  userName?: string;
}

interface HeatRow {
  jurisdiction: string;
  candidateName: string;
  percentage: number;
  totalVotesCast: number;
  bucket: "close" | "moderate" | "dominant";
}

interface ElectionRow {
  id: string;
  jurisdiction: string;
  candidateName: string;
  votesReceived: number;
  totalVotesCast: number;
  percentage: number;
}

interface DashboardDataset {
  contactsTotal: number;
  strongSupport: number;
  leaningSupport: number;
  undecided: number;
  leaningOpposition: number;
  strongOpposition: number;
  followUps: number;
  volunteerInterest: number;
  signRequests: number;
  gotvPulled: number;
  gotvSupporters: number;
  gotvNeeded: number;
  gotvRidingVotes: number;
  donationsRaised: number;
  donationsCount: number;
  donationsPending: number;
  donationsDeclined: number;
  signsTotal: number;
  signsInstalled: number;
  signsPending: number;
  volunteersTotal: number;
  volunteersActive: number;
  notificationDeliveryRate: number;
  notificationsSent: number;
  notificationsDelivered: number;
  pollsLive: number;
  pollResponses: number;
  heatRows: HeatRow[];
  electionRows: ElectionRow[];
  trendRows: Array<{ year: string; totalVotes: number; contests: number }>;
  topRows: Array<{ jurisdiction: string; totalVotes: number }>;
  boundaryCount: number;
  geojson: unknown;
}

const DEFAULT_DATA: DashboardDataset = {
  contactsTotal: 0,
  strongSupport: 0,
  leaningSupport: 0,
  undecided: 0,
  leaningOpposition: 0,
  strongOpposition: 0,
  followUps: 0,
  volunteerInterest: 0,
  signRequests: 0,
  gotvPulled: 0,
  gotvSupporters: 0,
  gotvNeeded: 0,
  gotvRidingVotes: 0,
  donationsRaised: 0,
  donationsCount: 0,
  donationsPending: 0,
  donationsDeclined: 0,
  signsTotal: 0,
  signsInstalled: 0,
  signsPending: 0,
  volunteersTotal: 0,
  volunteersActive: 0,
  notificationDeliveryRate: 0,
  notificationsSent: 0,
  notificationsDelivered: 0,
  pollsLive: 0,
  pollResponses: 0,
  heatRows: [],
  electionRows: [],
  trendRows: [],
  topRows: [],
  boundaryCount: 0,
  geojson: null,
};

const TABS: Array<{ key: TabKey; label: string; icon: ElementType }> = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "canvassing", label: "Canvassing", icon: Activity },
  { key: "supporters", label: "Supporters", icon: Users },
  { key: "gotv", label: "GOTV", icon: Flag },
  { key: "signs", label: "Signs", icon: Target },
  { key: "volunteers", label: "Volunteers", icon: HandHeart },
  { key: "donations", label: "Donations", icon: TrendingUp },
  { key: "communications", label: "Communications", icon: Megaphone },
  { key: "predictions", label: "Predictions", icon: Radio },
];

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default function AnalyticsClient({ campaignId, userName }: Props) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [year, setYear] = useState("2022");
  const [province, setProvince] = useState("ON");
  const [data, setData] = useState<DashboardDataset>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const contactQueries = [
        getJson(`/api/contacts?campaignId=${campaignId}&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&supportLevels=strong_support&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&supportLevels=leaning_support&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&supportLevels=undecided&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&supportLevels=leaning_opposition&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&supportLevels=strong_opposition&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&followUpNeeded=true&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&volunteerInterest=true&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&signRequested=true&pageSize=1`),
      ];

      const [
        contacts,
        strongSupport,
        leaningSupport,
        undecided,
        leaningOpp,
        strongOpp,
        followUps,
        volunteerInterest,
        signRequests,
        gotv,
        donations,
        signs,
        volunteers,
        notifications,
        polls,
        election,
        heat,
      ] = await Promise.all([
        ...contactQueries,
        getJson(`/api/gotv?campaignId=${campaignId}`),
        getJson(`/api/donations?campaignId=${campaignId}&pageSize=100`),
        getJson(`/api/signs?campaignId=${campaignId}&pageSize=100`),
        getJson(`/api/volunteers?campaignId=${campaignId}&pageSize=100`),
        getJson(`/api/notifications/stats?campaignId=${campaignId}`),
        getJson(`/api/polls?campaignId=${campaignId}&pageSize=50`),
        getJson(`/api/analytics/election-results?year=${year}&electionType=municipal&province=${province}`),
        getJson(`/api/analytics/heat-map?year=${year}&mode=geojson&province=${province}`),
      ]);

      if (cancelled) return;

      const donationTotals = (donations?.totalsByStatus ?? []) as Array<{ status: string; _sum?: { amount?: number | null }; _count?: { amount?: number } }>;
      const raised = donationTotals.reduce((sum, item) => {
        if (item.status === "received") return sum + Number(item._sum?.amount ?? 0);
        return sum;
      }, 0);

      const signsRows = (signs?.data ?? []) as Array<{ status?: string }>;
      const volunteerRows = (volunteers?.data ?? []) as Array<{ isActive?: boolean }>;
      const pollRows = (polls?.data ?? []) as Array<{ _count?: { responses?: number } }>;

      setData({
        contactsTotal: contacts?.total ?? 0,
        strongSupport: strongSupport?.total ?? 0,
        leaningSupport: leaningSupport?.total ?? 0,
        undecided: undecided?.total ?? 0,
        leaningOpposition: leaningOpp?.total ?? 0,
        strongOpposition: strongOpp?.total ?? 0,
        followUps: followUps?.total ?? 0,
        volunteerInterest: volunteerInterest?.total ?? 0,
        signRequests: signRequests?.total ?? 0,
        gotvPulled: gotv?.data?.confirmedVoted ?? 0,
        gotvSupporters: gotv?.data?.totalSupporters ?? 0,
        gotvNeeded: gotv?.data?.stillNeeded ?? 0,
        gotvRidingVotes: gotv?.data?.totalVotedInRiding ?? 0,
        donationsRaised: raised,
        donationsCount: donations?.total ?? 0,
        donationsPending: donationTotals.find((d) => d.status === "pending")?._count?.amount ?? 0,
        donationsDeclined: donationTotals.find((d) => d.status === "declined")?._count?.amount ?? 0,
        signsTotal: signs?.total ?? 0,
        signsInstalled: signsRows.filter((s) => s.status === "installed").length,
        signsPending: signsRows.filter((s) => s.status === "requested").length,
        volunteersTotal: volunteers?.total ?? 0,
        volunteersActive: volunteerRows.filter((v) => v.isActive).length,
        notificationDeliveryRate: notifications?.data?.deliveryRate ?? 0,
        notificationsSent: notifications?.data?.totals?.total ?? 0,
        notificationsDelivered: notifications?.data?.totals?.delivered ?? 0,
        pollsLive: polls?.total ?? 0,
        pollResponses: pollRows.reduce((sum, poll) => sum + Number(poll._count?.responses ?? 0), 0),
        heatRows: heat?.data ?? [],
        electionRows: election?.data?.results ?? [],
        trendRows: election?.data?.trendByYear ?? [],
        topRows: election?.data?.topByVotes?.map((entry: { jurisdiction: string; totalVotes: number }) => ({ jurisdiction: entry.jurisdiction, totalVotes: entry.totalVotes })) ?? [],
        boundaryCount: heat?.boundaryCount ?? 0,
        geojson: heat?.geojson ?? null,
      });

      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [campaignId, year, province]);

  const supportTotal = data.strongSupport + data.leaningSupport;
  const persuasionUniverse = data.undecided + data.leaningOpposition;
  const supportRate = data.contactsTotal ? Math.round((supportTotal / data.contactsTotal) * 100) : 0;
  const gotvRate = data.gotvSupporters ? Math.round((data.gotvPulled / data.gotvSupporters) * 100) : 0;
  const riskLevel = useMemo(() => {
    if (supportRate >= 52 && gotvRate >= 45) return "Low";
    if (supportRate >= 45 && gotvRate >= 30) return "Moderate";
    return "High";
  }, [supportRate, gotvRate]);

  const funnelData = [
    { name: "Universe", value: data.contactsTotal, color: "#1d4ed8" },
    { name: "Support", value: supportTotal, color: "#059669" },
    { name: "GOTV Pulled", value: data.gotvPulled, color: "#d97706" },
  ];

  const sentimentData = [
    { name: "Strong+Leaning Support", value: supportTotal, color: "#10b981" },
    { name: "Undecided", value: data.undecided, color: "#f59e0b" },
    { name: "Opposition", value: data.leaningOpposition + data.strongOpposition, color: "#ef4444" },
  ];

  function exportSnapshot() {
    const snapshot = [
      ["Campaign ID", campaignId],
      ["Contacts", data.contactsTotal],
      ["Support rate", `${supportRate}%`],
      ["GOTV pulled", data.gotvPulled],
      ["GOTV supporters", data.gotvSupporters],
      ["Donations raised", data.donationsRaised],
      ["Signs installed", data.signsInstalled],
      ["Volunteers active", data.volunteersActive],
      ["Notification delivery", `${data.notificationDeliveryRate}%`],
      ["Prediction risk", riskLevel],
      ["Generated at", new Date().toISOString()],
    ];
    const csv = snapshot.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `analytics-snapshot-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-blue-900 p-6 text-white md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Enterprise Analytics</p>
          <h1 className="mt-1 text-2xl font-black">Campaign Intelligence Suite</h1>
          <p className="mt-1 text-sm text-blue-100">
            {userName ? `${userName.split(" ")[0]}, here is` : "Here is"} the live campaign pulse across field, finance, and communications.
          </p>
        </div>
        <div className="flex gap-2">
          <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm">
            <option value="2022">2022</option>
            <option value="2018">2018</option>
            <option value="2014">2014</option>
          </select>
          <button onClick={exportSnapshot} className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">
            <Download className="h-4 w-4" /> Export Snapshot
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${tab === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {loading && <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading live campaign metrics...</div>}

      {!loading && (
        <div className="max-h-[72vh] overflow-y-auto pr-1">
          {tab === "overview" && (
            <div className="grid gap-4 lg:grid-cols-4">
              {[
                { label: "Contact Universe", value: data.contactsTotal.toLocaleString() },
                { label: "Support Rate", value: `${supportRate}%` },
                { label: "GOTV Pull Rate", value: `${gotvRate}%` },
                { label: "Risk Level", value: riskLevel },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{card.value}</p>
                </div>
              ))}
              <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
                <p className="mb-3 text-sm font-semibold text-slate-800">Campaign Funnel</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {funnelData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
                <p className="mb-3 text-sm font-semibold text-slate-800">Sentiment Distribution</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95}>
                        {sentimentData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {tab === "canvassing" && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Follow Ups Due</p>
                <p className="mt-2 text-3xl font-black text-amber-600">{data.followUps}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Persuasion Universe</p>
                <p className="mt-2 text-3xl font-black text-blue-700">{persuasionUniverse.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Volunteer Interest Leads</p>
                <p className="mt-2 text-3xl font-black text-emerald-600">{data.volunteerInterest.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-3">
                <p className="mb-3 text-sm font-semibold text-slate-800">Election Benchmarks by Year</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trendRows}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="totalVotes" stroke="#1d4ed8" strokeWidth={3} />
                      <Line type="monotone" dataKey="contests" stroke="#f97316" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {tab === "supporters" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-slate-800">Support Stack</p>
                <div className="space-y-3">
                  {[
                    ["Strong support", data.strongSupport, "bg-emerald-600"],
                    ["Leaning support", data.leaningSupport, "bg-emerald-400"],
                    ["Undecided", data.undecided, "bg-amber-400"],
                    ["Leaning opposition", data.leaningOpposition, "bg-rose-400"],
                    ["Strong opposition", data.strongOpposition, "bg-rose-600"],
                  ].map(([label, value, tone]) => (
                    <div key={String(label)}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{label}</span>
                        <span className="font-bold">{Number(value).toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${tone}`} style={{ width: `${data.contactsTotal ? Math.round((Number(value) / data.contactsTotal) * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-sm font-semibold text-slate-800">Top Municipal Turnout Context</p>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topRows.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="jurisdiction" interval={0} angle={-20} textAnchor="end" height={70} />
                      <YAxis />
                      <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                      <Bar dataKey="totalVotes" fill="#1d4ed8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {tab === "gotv" && (
            <div className="grid gap-4 lg:grid-cols-4">
              {["Supporters", "Pulled", "Still Needed", "Riding Votes Today"].map((title, idx) => {
                const values = [data.gotvSupporters, data.gotvPulled, data.gotvNeeded, data.gotvRidingVotes];
                return (
                  <div key={title} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{values[idx].toLocaleString()}</p>
                  </div>
                );
              })}
              <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4">
                <p className="text-sm font-semibold text-slate-800">Pull Progress</p>
                <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500" style={{ width: `${gotvRate}%` }} />
                </div>
                <p className="mt-2 text-sm text-slate-600">{gotvRate}% of known supporters have been pulled.</p>
              </div>
            </div>
          )}

          {tab === "signs" && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Total Signs</p><p className="text-3xl font-black text-slate-900">{data.signsTotal}</p></div>
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Installed</p><p className="text-3xl font-black text-emerald-600">{data.signsInstalled}</p></div>
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Pending</p><p className="text-3xl font-black text-amber-600">{data.signsPending}</p></div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-3">
                <p className="mb-3 text-sm font-semibold text-slate-800">Municipal Geo Context</p>
                <ChoroplethMap geojson={data.boundaryCount > 0 ? (data.geojson as never) : null} year={year} />
                <p className="mt-3 text-xs text-slate-500">GIS boundaries with data: {data.boundaryCount}</p>
              </div>
            </div>
          )}

          {tab === "volunteers" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-800">Volunteer Capacity</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{data.volunteersActive} / {data.volunteersTotal}</p>
                <p className="mt-1 text-xs text-slate-500">Active volunteers / total profiles</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-800">Activation Rate</p>
                <p className="mt-2 text-3xl font-black text-blue-700">
                  {data.volunteersTotal ? Math.round((data.volunteersActive / data.volunteersTotal) * 100) : 0}%
                </p>
                <p className="mt-1 text-xs text-slate-500">Used to size canvassing and GOTV shift plans</p>
              </div>
            </div>
          )}

          {tab === "donations" && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Raised (received)</p><p className="text-3xl font-black text-emerald-600">${data.donationsRaised.toLocaleString()}</p></div>
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Total Donations</p><p className="text-3xl font-black text-slate-900">{data.donationsCount}</p></div>
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Pending / Declined</p><p className="text-3xl font-black text-amber-600">{data.donationsPending} / {data.donationsDeclined}</p></div>
            </div>
          )}

          {tab === "communications" && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Delivery Rate</p><p className="text-3xl font-black text-blue-700">{data.notificationDeliveryRate}%</p></div>
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Notifications Sent</p><p className="text-3xl font-black text-slate-900">{data.notificationsSent.toLocaleString()}</p></div>
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Delivered</p><p className="text-3xl font-black text-emerald-600">{data.notificationsDelivered.toLocaleString()}</p></div>
            </div>
          )}

          {tab === "predictions" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-800">Win Probability Model</p>
                <p className="mt-2 text-4xl font-black text-slate-900">
                  {Math.max(5, Math.min(95, Math.round((supportRate * 0.6) + (gotvRate * 0.4))))}%
                </p>
                <p className="mt-2 text-sm text-slate-600">Weighted by support share and pull-through execution.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold text-slate-800">Risk Flags</p>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    { cond: data.followUps > 150, msg: "Follow-up queue is high; field responsiveness is at risk." },
                    { cond: gotvRate < 30, msg: "GOTV pull-through is below target for this stage." },
                    { cond: data.notificationDeliveryRate < 85, msg: "Broadcast delivery reliability is below 85%." },
                    { cond: data.signsPending > data.signsInstalled, msg: "More signs are pending than installed." },
                  ].filter((flag) => flag.cond).map((flag) => (
                    <div key={flag.msg} className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                      <span>{flag.msg}</span>
                    </div>
                  ))}
                  {!([
                    data.followUps > 150,
                    gotvRate < 30,
                    data.notificationDeliveryRate < 85,
                    data.signsPending > data.signsInstalled,
                  ].some(Boolean)) && <p className="text-emerald-700">No critical risk flags in current telemetry.</p>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
                <p className="mb-2 text-sm font-semibold text-slate-800">Election Results Reference Table ({province} {year})</p>
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Jurisdiction</th>
                        <th className="px-3 py-2">Candidate</th>
                        <th className="px-3 py-2">Votes</th>
                        <th className="px-3 py-2">Pct</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.electionRows.slice(0, 50).map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{row.jurisdiction}</td>
                          <td className="px-3 py-2">{row.candidateName}</td>
                          <td className="px-3 py-2">{row.votesReceived.toLocaleString()}</td>
                          <td className="px-3 py-2">{row.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Powered by live campaign and election datasets.</span>
        <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Predictions are directional and should be reviewed daily.</span>
      </div>
    </div>
  );
}
