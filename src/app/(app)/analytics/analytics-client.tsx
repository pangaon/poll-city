"use client";
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import type { ComponentProps } from "react";
import dynamic from "next/dynamic";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { BarChart3, TrendingUp, Table2, Map, Download, ChevronUp, ChevronDown, Search, Filter } from "lucide-react";

const ChoroplethMap = dynamic(() => import("./choropleth-map"), { ssr: false, loading: () => <div className="h-80 bg-gray-50 rounded-xl animate-pulse" /> });

void lazy; void Suspense; // keep imports clean

/* ── Types ── */
interface ElectionRow {
  id: string;
  jurisdiction: string;
  candidateName: string;
  partyName: string | null;
  votesReceived: number;
  totalVotesCast: number;
  percentage: number;
  won: boolean;
  pollNumber: string | null;
  province: string | null;
  electionDate: string;
}

interface HeatRow {
  jurisdiction: string;
  candidateName: string;
  percentage: number;
  totalVotesCast: number;
  votesReceived: number;
  province: string | null;
  intensity: number;
  bucket: "close" | "moderate" | "dominant";
}

interface GeoJsonCollection {
  type: "FeatureCollection";
  features: object[];
}

interface TrendPoint {
  year: string;
  totalVotes: number;
  contests: number;
}

interface TopEntry {
  jurisdiction: string;
  province: string | null;
  totalVotes: number;
  winnerName: string;
  winnerPct: number;
  year: string;
}

type SortKey = "jurisdiction" | "candidateName" | "votesReceived" | "percentage" | "totalVotesCast";
type Tab = "heat" | "bar" | "line" | "table";

/* ── Colour helpers ── */
function heatColour(bucket: string, percentage: number): string {
  if (bucket === "dominant") return `rgba(30,58,138,${0.4 + (percentage - 60) / 100})`;  // deep blue
  if (bucket === "moderate") return `rgba(59,130,246,${0.3 + (percentage - 40) / 120})`; // blue
  return `rgba(220,38,38,${0.2 + (60 - percentage) / 120})`;                              // red = close race
}

/* ── CSV export ── */
function exportCSV(rows: ElectionRow[]) {
  const header = "Jurisdiction,Candidate,Party,Votes,Total Votes,Percentage,Won,Province,Date\n";
  const body = rows
    .map((r) =>
      [r.jurisdiction, r.candidateName, r.partyName ?? "", r.votesReceived, r.totalVotesCast,
        r.percentage.toFixed(1) + "%", r.won ? "Yes" : "No", r.province ?? "", r.electionDate.slice(0, 10)]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `election-results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsClient() {
  const [tab, setTab] = useState<Tab>("heat");
  const [year, setYear] = useState("2022");
  const [province, setProvince] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("votesReceived");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [heatData, setHeatData] = useState<HeatRow[]>([]);
  const [geojson, setGeojson] = useState<GeoJsonCollection | null>(null);
  const [boundaryCount, setBoundaryCount] = useState(0);
  const [tableData, setTableData] = useState<ElectionRow[]>([]);
  const [topData, setTopData] = useState<TopEntry[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const params = new URLSearchParams({ year, electionType: "municipal" });
      if (province) params.set("province", province);
      if (search) params.set("jurisdiction", search);

      const [heatRes, tableRes] = await Promise.all([
        fetch(`/api/analytics/heat-map?year=${year}&mode=geojson${province ? `&province=${province}` : ""}`, {
          signal: abortRef.current.signal,
        }),
        fetch(`/api/analytics/election-results?${params}`, {
          signal: abortRef.current.signal,
        }),
      ]);

      if (heatRes.ok) {
        const h = await heatRes.json();
        setHeatData(h.data ?? []);
        if (h.geojson) {
          setGeojson(h.geojson);
          setBoundaryCount(h.boundaryCount ?? 0);
        }
      }
      if (tableRes.ok) {
        const t = await tableRes.json();
        setTableData(t.data?.results ?? []);
        setTopData(t.data?.topByVotes ?? []);
        setTrendData(t.data?.trendByYear ?? []);
      }
    } catch (e: unknown) {
      if ((e as {name?: string}).name !== "AbortError") console.error(e);
    } finally {
      setLoading(false);
    }
  }, [year, province, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Sort table rows */
  const sortedRows = [...tableData].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
    ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)
    : <ChevronDown className="w-3 h-3 inline text-gray-300" />;

  /* Filtered heat rows */
  const filteredHeat = search
    ? heatData.filter(r => r.jurisdiction.toLowerCase().includes(search.toLowerCase()))
    : heatData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Election Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ontario municipal election data — 2014, 2018, 2022</p>
        </div>
        <button
          onClick={() => exportCSV(tableData)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            {["2022", "2018", "2014"].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">All Provinces</option>
            <option value="ON">Ontario</option>
            <option value="BC">British Columbia</option>
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search municipality…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: "heat" as Tab, label: "Heat Map", icon: Map },
          { key: "bar" as Tab, label: "Top Municipalities", icon: BarChart3 },
          { key: "line" as Tab, label: "Trends", icon: TrendingUp },
          { key: "table" as Tab, label: "Full Results", icon: Table2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-400 text-sm">Loading election data…</div>
      )}

      {!loading && (
        <>
          {/* ── Heat Map Tab ── */}
          {tab === "heat" && (
            <div className="space-y-4">
              {/* Real GIS choropleth map */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">Choropleth Map — {year}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {boundaryCount > 0
                        ? `${boundaryCount} municipal boundaries with election data overlay`
                        : "GIS boundaries not yet loaded — run db:seed:boundaries:gis from Railway"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{filteredHeat.length} municipalities</span>
                </div>
                <div className="p-4">
                  <ChoroplethMap
                    geojson={boundaryCount > 0 ? (geojson as ComponentProps<typeof ChoroplethMap>["geojson"]) : null}
                    year={year}
                  />
                </div>
              </div>

              {/* Grid fallback / supplemental data */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">Election Results Grid — {year}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400 mr-1" />Close race (&lt;40%)
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400 mx-1 ml-3" />Moderate (40–60%)
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-800 mx-1 ml-3" />Dominant (&gt;60%)
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  {filteredHeat.length === 0 ? (
                    <p className="text-center text-gray-400 py-12 text-sm">No data for selected filters</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {filteredHeat.slice(0, 100).map((row) => (
                        <div
                          key={row.jurisdiction}
                          title={`${row.jurisdiction}\n${row.candidateName}\n${row.percentage.toFixed(1)}% · ${row.totalVotesCast.toLocaleString()} votes`}
                          className="rounded-lg px-3 py-2.5 cursor-default hover:scale-105 transition-transform"
                          style={{ backgroundColor: heatColour(row.bucket, row.percentage) }}
                        >
                          <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{row.jurisdiction}</p>
                          <p className="text-[11px] text-gray-700 mt-0.5 truncate">{row.candidateName}</p>
                          <p className="text-[11px] font-bold text-gray-800 mt-0.5">{row.percentage.toFixed(1)}%</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Bar Chart Tab ── */}
          {tab === "bar" && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-1">Top 10 Municipalities by Voter Turnout — {year}</h2>
              <p className="text-xs text-gray-500 mb-5">Total votes cast in municipal election</p>
              {topData.length === 0 ? (
                <p className="text-center text-gray-400 py-12 text-sm">No data for selected filters</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topData} margin={{ top: 4, right: 16, bottom: 60, left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="jurisdiction"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
                      <Tooltip
                        // @ts-ignore
                        formatter={(v: any) => v ? v.toLocaleString() : ""}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Bar dataKey="totalVotes" fill="#1E3A8A" radius={[4, 4, 0, 0]} name="Total Votes" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── Line Chart Tab ── */}
          {tab === "line" && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-1">Election Trends — 2014 · 2018 · 2022</h2>
              <p className="text-xs text-gray-500 mb-5">Total votes cast and number of contests across election cycles</p>
              {trendData.length === 0 ? (
                <p className="text-center text-gray-400 py-12 text-sm">No trend data available</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 4, right: 24, bottom: 4, left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tickFormatter={(v) => v.toLocaleString()} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip
                        // @ts-ignore
                        formatter={(v: any, name: string) => name === "totalVotes" ? v.toLocaleString() : v}
                        labelFormatter={(v: any) => `Year: ${v}`}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="totalVotes" stroke="#1E3A8A" strokeWidth={2.5} dot={{ r: 5 }} name="totalVotes" />
                      <Line yAxisId="right" type="monotone" dataKey="contests" stroke="#DC2626" strokeWidth={2} dot={{ r: 4 }} name="contests" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── Full Results Table ── */}
          {tab === "table" && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Full Results — {sortedRows.length} records</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {(
                        [
                          ["jurisdiction", "Jurisdiction"],
                          ["candidateName", "Candidate"],
                          ["votesReceived", "Votes"],
                          ["totalVotesCast", "Total Votes"],
                          ["percentage", "Percentage"],
                        ] as [SortKey, string][]
                      ).map(([key, label]) => (
                        <th
                          key={key}
                          onClick={() => toggleSort(key)}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap select-none"
                        >
                          {label} <SortIcon k={key} />
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Won</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Province</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedRows.slice(0, 200).map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{row.jurisdiction}</td>
                        <td className="px-4 py-2.5 text-gray-700 text-xs">{row.candidateName}</td>
                        <td className="px-4 py-2.5 text-gray-700 text-xs">{row.votesReceived.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{row.totalVotesCast.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-[60px]">
                              <div
                                className="h-1.5 rounded-full bg-blue-500"
                                style={{ width: `${Math.min(row.percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-gray-700">{row.percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {row.won ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                              ✓ Won
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{row.province}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {new Date(row.electionDate).getFullYear()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sortedRows.length > 200 && (
                  <p className="text-xs text-gray-400 text-center py-3">
                    Showing 200 of {sortedRows.length} records. Use filters to narrow results.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
