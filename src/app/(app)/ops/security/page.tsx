"use client";

import { useEffect, useState } from "react";
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";

type SecurityEvent = {
  id: string;
  type: string;
  ip: string | null;
  userAgent: string | null;
  userId: string | null;
  success: boolean;
  details: Record<string, unknown> | null;
  createdAt: string;
};

type SuspiciousAdoni = {
  id: string;
  userId: string;
  campaignId: string;
  questions: unknown;
  flaggedAt: string;
  reviewed: boolean;
};

type SecurityRule = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  threshold: number;
  windowMins: number;
  severity: string;
  action: string;
};

type Payload = {
  threatLevel: "none" | "low" | "medium" | "high";
  metrics: {
    totalUnresolved: number;
    failedLogins24h: number;
    eventsLast30m: number;
    suspiciousAdoniCount: number;
  };
  recentEvents: SecurityEvent[];
  suspiciousAdoni: SuspiciousAdoni[];
  securityRules: SecurityRule[];
};

const THREAT_COLORS: Record<string, string> = {
  none: "bg-green-500",
  low: "bg-yellow-400",
  medium: "bg-orange-500",
  high: "bg-red-600",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-slate-600 bg-slate-100",
  medium: "text-yellow-700 bg-yellow-50",
  high: "text-orange-700 bg-orange-50",
  critical: "text-red-700 bg-red-50",
};

export default function OpsSecurityPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const res = await fetch("/api/ops/security");
      if (res.status === 403) {
        setError("SUPER_ADMIN access required.");
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
    } catch {
      setError("Failed to load security data.");
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function resolveEvent(eventId: string) {
    setResolving((prev) => new Set(prev).add(eventId));
    await fetch("/api/ops/security", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action: "resolve" }),
    });
    await load();
    setResolving((prev) => {
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });
  }

  async function reviewAdoni(eventId: string) {
    setResolving((prev) => new Set(prev).add(eventId));
    await fetch("/api/ops/security", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action: "review_adoni" }),
    });
    await load();
    setResolving((prev) => {
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg font-semibold text-slate-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Loading security dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-900">Security Operations</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-3 w-3 rounded-full ${THREAT_COLORS[data.threatLevel]} animate-pulse`} />
          <span className="text-sm font-semibold text-slate-700 uppercase">{data.threatLevel} threat</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Unresolved Events" value={data.metrics.totalUnresolved} alert={data.metrics.totalUnresolved > 10} />
        <MetricCard label="Failed Logins (24h)" value={data.metrics.failedLogins24h} alert={data.metrics.failedLogins24h > 10} />
        <MetricCard label="Events (30m)" value={data.metrics.eventsLast30m} alert={data.metrics.eventsLast30m > 5} />
        <MetricCard label="Suspicious Adoni" value={data.metrics.suspiciousAdoniCount} alert={data.metrics.suspiciousAdoniCount > 0} />
      </div>

      {/* Recent Security Events */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Recent Events (24h)</h2>
        {data.recentEvents.length === 0 ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
            <p className="mt-2 text-sm text-green-700">All clear. No security events in the last 24 hours.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">IP</th>
                  <th className="px-4 py-2">Severity</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentEvents.map((event) => {
                  const severity = (event.details as Record<string, string>)?.severity || "low";
                  return (
                    <tr key={event.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-500">
                        {new Date(event.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-700">{event.type}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{event.ip || "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[severity] || SEVERITY_COLORS.low}`}>
                          {severity}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {event.success ? (
                          <span className="text-green-600 text-xs">Resolved</span>
                        ) : (
                          <span className="text-red-600 text-xs">Open</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {!event.success && (
                          <button
                            type="button"
                            onClick={() => resolveEvent(event.id)}
                            disabled={resolving.has(event.id)}
                            className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Suspicious Adoni Activity */}
      {data.suspiciousAdoni.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Suspicious Adoni Activity
          </h2>
          <div className="space-y-3">
            {data.suspiciousAdoni.map((item) => (
              <div key={item.id} className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">User: {item.userId}</p>
                    <p className="text-xs text-slate-500 mt-1">Campaign: {item.campaignId}</p>
                    <p className="text-xs text-slate-500">Flagged: {new Date(item.flaggedAt).toLocaleString()}</p>
                    <div className="mt-2 text-xs text-slate-600">
                      <p className="font-medium">Questions asked:</p>
                      <pre className="mt-1 whitespace-pre-wrap text-xs bg-white rounded p-2 border border-orange-100">
                        {JSON.stringify(item.questions, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => reviewAdoni(item.id)}
                    disabled={resolving.has(item.id)}
                    className="rounded bg-orange-600 px-3 py-1.5 text-xs text-white hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    Mark Reviewed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Security Rules */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Active Security Rules</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Rule</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Threshold</th>
                <th className="px-4 py-2">Window</th>
                <th className="px-4 py-2">Severity</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.securityRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">{rule.name}</td>
                  <td className="px-4 py-2 text-slate-600">{rule.description}</td>
                  <td className="px-4 py-2 text-center">{rule.threshold}</td>
                  <td className="px-4 py-2 text-center">{rule.windowMins}m</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.low}`}>
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs font-medium uppercase">{rule.action}</td>
                  <td className="px-4 py-2">
                    {rule.isActive ? (
                      <span className="text-green-600 text-xs font-medium">Active</span>
                    ) : (
                      <span className="text-slate-400 text-xs">Disabled</span>
                    )}
                  </td>
                </tr>
              ))}
              {data.securityRules.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">No security rules configured yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, alert }: { label: string; value: number; alert: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${alert ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${alert ? "text-red-700" : "text-slate-800"}`}>
        {value}
      </p>
      {alert && <XCircle className="h-4 w-4 text-red-400 mt-1" />}
    </div>
  );
}
