"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Download, BarChart3, List, TrendingUp,
  CheckSquare, Hash, AlignLeft, Users, Eye, MousePointer,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type FieldStat = {
  fieldId: string;
  label: string;
  type: string;
  answered: number;
  distribution?: { label: string; count: number }[];
  average?: number;
  min?: number;
  max?: number;
  topValues?: { value: string; count: number }[];
};

type Analytics = {
  form: { id: string; name: string; viewCount: number; submissionCount: number };
  total: number;
  fieldStats: FieldStat[];
  trend: { date: string; count: number }[];
};

type Submission = {
  id: string;
  data: Record<string, unknown>;
  completedAt: string;
  contactId: string | null;
};

const PALETTE = ["#1D9E75", "#0A2342", "#EF9F27", "#E24B4A", "#818cf8", "#f472b6", "#34d399", "#60a5fa"];

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-green-50">
        <Icon className="h-4 w-4 text-green-600" />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function FieldChart({ stat, total }: { stat: FieldStat; total: number }) {
  const pct = total > 0 ? Math.round((stat.answered / total) * 100) : 0;

  const fieldIcon = () => {
    if (["radio", "select", "checkboxes", "checkbox_group"].includes(stat.type)) return <CheckSquare className="h-3.5 w-3.5" />;
    if (["number", "rating", "scale"].includes(stat.type)) return <Hash className="h-3.5 w-3.5" />;
    if (stat.type === "checkbox") return <CheckSquare className="h-3.5 w-3.5" />;
    return <AlignLeft className="h-3.5 w-3.5" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{fieldIcon()}</span>
          <h3 className="font-medium text-gray-900 text-sm">{stat.label}</h3>
        </div>
        <div className="text-right text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{stat.answered}</span> answered
          <span className="ml-1 text-gray-400">({pct}%)</span>
        </div>
      </div>

      {/* Answer rate bar */}
      <div className="h-1 bg-gray-100 rounded-full mb-4">
        <div className="h-1 bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>

      {/* Distribution chart */}
      {stat.distribution && stat.distribution.length > 0 && (
        <ResponsiveContainer width="100%" height={stat.distribution.length > 6 ? 180 : 120}>
          <BarChart
            data={stat.distribution}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(v: unknown) => { const n = Number(v ?? 0); return [`${n} response${n !== 1 ? "s" : ""}`, ""] as [string, string]; }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {stat.distribution.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Number stats */}
      {stat.average !== undefined && (
        <div className="flex gap-6 mt-1">
          <div>
            <p className="text-xs text-gray-400">Average</p>
            <p className="text-lg font-bold text-gray-900">{stat.average}</p>
          </div>
          {stat.min !== undefined && (
            <div>
              <p className="text-xs text-gray-400">Min</p>
              <p className="text-lg font-semibold text-gray-700">{stat.min}</p>
            </div>
          )}
          {stat.max !== undefined && (
            <div>
              <p className="text-xs text-gray-400">Max</p>
              <p className="text-lg font-semibold text-gray-700">{stat.max}</p>
            </div>
          )}
        </div>
      )}

      {/* Top text values */}
      {stat.topValues && stat.topValues.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {stat.topValues.slice(0, 5).map(({ value, count }) => (
            <div key={value} className="flex items-center gap-2 text-xs">
              <div
                className="h-1.5 bg-green-500 rounded-full flex-shrink-0"
                style={{ width: `${Math.round((count / (stat.topValues![0]?.count || 1)) * 80)}px` }}
              />
              <span className="text-gray-600 truncate">{value}</span>
              <span className="text-gray-400 ml-auto flex-shrink-0">{count}×</span>
            </div>
          ))}
        </div>
      )}

      {/* Open-ended with no repeats */}
      {!stat.distribution && !stat.average && !stat.topValues && stat.answered > 0 && (
        <p className="text-xs text-gray-400 italic mt-1">Open-ended responses — see table view for full answers</p>
      )}
    </motion.div>
  );
}

export default function FormResultsPage() {
  const params = useParams();
  const formId = (params?.id ?? "") as string;
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tab, setTab] = useState<"charts" | "responses">("charts");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/forms/${formId}/analytics`)
      .then((r) => r.json())
      .then(setAnalytics)
      .finally(() => setLoading(false));
  }, [formId]);

  useEffect(() => {
    if (tab !== "responses") return;
    fetch(`/api/forms/${formId}/submissions?page=${page}&limit=50`)
      .then((r) => r.json())
      .then((d) => {
        setSubmissions(d.submissions ?? []);
        setTotalPages(d.pagination?.totalPages ?? 1);
      });
  }, [formId, tab, page]);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Form not found or no access.</p>
        <Link href="/forms" className="text-green-600 text-sm mt-2 block">← Back to forms</Link>
      </div>
    );
  }

  const { form, total, fieldStats, trend } = analytics;
  const conversion = form.viewCount > 0 ? Math.round((form.submissionCount / form.viewCount) * 100) : 0;
  const fields = fieldStats.filter((f) => !["heading", "paragraph", "divider"].includes(f.type));

  // Get all field labels for table headers (from first submission keys)
  const tableFields = fieldStats.slice(0, 6);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/forms" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{form.name} — Results</h1>
            <p className="text-sm text-gray-500">{total} submission{total !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <a
          href={`/api/forms/${formId}/submissions/export`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Submissions" value={total} />
        <StatCard icon={Eye} label="Views" value={form.viewCount} />
        <StatCard icon={MousePointer} label="Conversion" value={`${conversion}%`} />
        <StatCard
          icon={BarChart3}
          label="Fields Answered"
          value={fields.length > 0 ? `${Math.round(fields.reduce((a, f) => a + (total > 0 ? f.answered / total : 0), 0) / fields.length * 100)}%` : "—"}
          sub="avg completion rate"
        />
      </div>

      {/* Trend chart */}
      {trend.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <h2 className="text-sm font-semibold text-gray-700">Submission Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={trend} margin={{ top: 2, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(v: unknown) => { const n = Number(v ?? 0); return [`${n} submission${n !== 1 ? "s" : ""}`, ""] as [string, string]; }}
              />
              <Line type="monotone" dataKey="count" stroke="#1D9E75" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["charts", "responses"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t === "charts" ? <BarChart3 className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
            {t === "charts" ? "Charts" : "Responses"}
          </button>
        ))}
      </div>

      {/* Charts tab */}
      {tab === "charts" && (
        <>
          {total === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">No submissions yet</p>
              <p className="text-sm text-gray-400 mt-1">Share your form to start collecting responses.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((stat) => (
                <FieldChart key={stat.fieldId} stat={stat} total={total} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Responses tab */}
      {tab === "responses" && (
        <>
          {submissions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <List className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No submissions yet.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      {tableFields.map((f) => (
                        <th key={f.fieldId} className="px-4 py-3">{f.label}</th>
                      ))}
                      <th className="px-4 py-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.map((sub, i) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{(page - 1) * 50 + i + 1}</td>
                        {tableFields.map((f) => {
                          const val = sub.data[f.fieldId];
                          const display = Array.isArray(val)
                            ? val.join(", ")
                            : val === true
                            ? "Yes"
                            : val === false
                            ? "No"
                            : String(val ?? "—");
                          return (
                            <td key={f.fieldId} className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                              {display}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(sub.completedAt).toLocaleString("en-CA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
