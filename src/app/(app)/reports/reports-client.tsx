"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";

interface Props {
  campaignId: string;
}

interface ReportStats {
  contacts: number;
  supporters: number;
  gotvPulled: number;
  donationsRaised: number;
  signsInstalled: number;
  volunteersActive: number;
  notificationsDelivered: number;
}

const EMPTY_STATS: ReportStats = {
  contacts: 0,
  supporters: 0,
  gotvPulled: 0,
  donationsRaised: 0,
  signsInstalled: 0,
  volunteersActive: 0,
  notificationsDelivered: 0,
};

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default function ReportsClient({ campaignId }: Props) {
  const [stats, setStats] = useState<ReportStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [contacts, supporters, gotv, donations, signs, volunteers, notifications] = await Promise.all([
        getJson(`/api/contacts?campaignId=${campaignId}&pageSize=1`),
        getJson(`/api/contacts?campaignId=${campaignId}&supportLevels=strong_support,leaning_support&pageSize=1`),
        getJson(`/api/gotv?campaignId=${campaignId}`),
        getJson(`/api/donations?campaignId=${campaignId}&pageSize=100`),
        getJson(`/api/signs?campaignId=${campaignId}&pageSize=100`),
        getJson(`/api/volunteers?campaignId=${campaignId}&pageSize=100`),
        getJson(`/api/notifications/stats?campaignId=${campaignId}`),
      ]);

      if (cancelled) return;

      const donationTotals = (donations?.totalsByStatus ?? []) as Array<{ status: string; _sum?: { amount?: number | null } }>;
      const raised = donationTotals.reduce((sum, row) => sum + (row.status === "received" ? Number(row._sum?.amount ?? 0) : 0), 0);
      const signsInstalled = ((signs?.data ?? []) as Array<{ status?: string }>).filter((row) => row.status === "installed").length;
      const volunteersActive = ((volunteers?.data ?? []) as Array<{ isActive?: boolean }>).filter((row) => row.isActive).length;

      setStats({
        contacts: contacts?.total ?? 0,
        supporters: supporters?.total ?? 0,
        gotvPulled: gotv?.data?.confirmedVoted ?? 0,
        donationsRaised: raised,
        signsInstalled,
        volunteersActive,
        notificationsDelivered: notifications?.data?.totals?.delivered ?? 0,
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const generatedAt = useMemo(() => new Date().toISOString(), []);

  function exportCsv() {
    const rows = [
      ["metric", "value"],
      ["contacts", stats.contacts],
      ["supporters", stats.supporters],
      ["gotvPulled", stats.gotvPulled],
      ["donationsRaised", stats.donationsRaised],
      ["signsInstalled", stats.signsInstalled],
      ["volunteersActive", stats.volunteersActive],
      ["notificationsDelivered", stats.notificationsDelivered],
      ["generatedAt", generatedAt],
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Reports Suite</h1>
            <p className="text-sm text-slate-500">Compliance-ready exports and executive snapshots.</p>
          </div>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            <Download className="h-4 w-4" /> Export Executive CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Contacts", stats.contacts],
          ["Supporters", stats.supporters],
          ["GOTV Pulled", stats.gotvPulled],
          ["Donations Raised", `$${stats.donationsRaised.toLocaleString()}`],
          ["Signs Installed", stats.signsInstalled],
          ["Active Volunteers", stats.volunteersActive],
          ["Notifications Delivered", stats.notificationsDelivered],
          ["Generated", generatedAt.slice(0, 10)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-2 inline-flex items-center gap-2 text-slate-700">
          <FileSpreadsheet className="h-4 w-4" />
          <span className="text-sm font-semibold">Audit and Retention Notes</span>
        </div>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>All exports are generated from campaign-scoped API endpoints.</li>
          <li>Use this report package for weekly war-room and compliance standups.</li>
          <li>Store exported files in your approved campaign document vault.</li>
        </ul>
      </div>

      {loading && <p className="text-sm text-slate-500">Refreshing reports...</p>}
    </div>
  );
}
