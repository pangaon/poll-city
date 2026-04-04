"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Siren } from "lucide-react";

interface Props {
  campaignId: string;
}

interface AlertItem {
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
}

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default function AlertsClient({ campaignId }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [followUps, gotv, notifications, signs] = await Promise.all([
        getJson(`/api/contacts?campaignId=${campaignId}&followUpNeeded=true&pageSize=1`),
        getJson(`/api/gotv?campaignId=${campaignId}`),
        getJson(`/api/notifications/stats?campaignId=${campaignId}`),
        getJson(`/api/signs?campaignId=${campaignId}&pageSize=100`),
      ]);

      if (cancelled) return;

      const next: AlertItem[] = [];
      const followUpCount = followUps?.total ?? 0;
      const gotvRate = Number(gotv?.data?.percentagePulled ?? 0);
      const delivery = Number(notifications?.data?.deliveryRate ?? 0);
      const signRows = (signs?.data ?? []) as Array<{ status?: string }>;
      const pendingSigns = signRows.filter((row) => row.status === "requested").length;
      const installedSigns = signRows.filter((row) => row.status === "installed").length;

      if (followUpCount > 150) {
        next.push({ severity: "high", title: "Follow-up backlog is elevated", detail: `${followUpCount} contacts require follow-up handling.` });
      }
      if (gotvRate < 30) {
        next.push({ severity: "high", title: "GOTV pull rate is below threshold", detail: `Current pull-through is ${gotvRate}%.` });
      }
      if (delivery < 85) {
        next.push({ severity: "medium", title: "Notification delivery quality dip", detail: `Delivery rate is ${delivery}%, investigate failed sends.` });
      }
      if (pendingSigns > installedSigns) {
        next.push({ severity: "medium", title: "Sign operations are behind", detail: `${pendingSigns} pending vs ${installedSigns} installed signs.` });
      }
      if (next.length === 0) {
        next.push({ severity: "low", title: "No active risk alerts", detail: "All monitored campaign health thresholds are within range." });
      }

      setAlerts(next);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const hasCritical = useMemo(() => alerts.some((a) => a.severity === "high"), [alerts]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <Siren className={`h-6 w-6 ${hasCritical ? "text-red-600" : "text-emerald-600"}`} />
          <div>
            <h1 className="text-2xl font-black text-slate-900">Campaign Alerts</h1>
            <p className="text-sm text-slate-500">Live risk detections across field, GOTV, communications, and signage.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.title}
            className={`rounded-xl border p-4 ${
              alert.severity === "high"
                ? "border-red-200 bg-red-50"
                : alert.severity === "medium"
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex items-start gap-2">
              {alert.severity === "low" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                <p className="text-sm text-slate-600">{alert.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
