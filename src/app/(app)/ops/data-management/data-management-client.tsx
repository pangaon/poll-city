"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  MapPin,
  Users,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  Building2,
  Layers,
  UserPlus,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── palette ─────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

/* ── types ───────────────────────────────────────────────────── */
interface WardCoverage {
  municipality: string;
  wardCount: number;
  lastFetchedAt: string | null;
}

interface CampaignHealth {
  id: string;
  name: string;
  candidateName: string | null;
  contactCount: number;
  householdCount: number;
  lastImportAt: string | null;
}

interface WardDetail {
  wardName: string;
  wardNumber: number | null;
  fetchedAt: string;
}

interface StatusData {
  wardCoverage: WardCoverage[];
  campaignHealth: CampaignHealth[];
  lastRefreshed: string;
}

interface SeedResult {
  success: boolean;
  wardsLoaded: number;
  municipalityName: string;
  errors?: string[];
}

interface ProvisionResult {
  campaign: { id: string; name: string; slug: string };
  user: { id: string; email: string; isNewUser: boolean };
  emailSent: boolean;
  inviteUrl: string | null;
}

/* ── shimmer ─────────────────────────────────────────────────── */
function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-200", className)} />;
}

/* ── relative time ───────────────────────────────────────────── */
function relTime(isoStr: string | null): string {
  if (!isoStr) return "Never";
  const diff = Date.now() - new Date(isoStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* ── main ────────────────────────────────────────────────────── */
export default function DataManagementClient() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/data-management/status");
      if (res.ok) {
        const json = (await res.json()) as { data: StatusData };
        setData(json.data);
      }
    } catch {
      // non-fatal — keep last data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    intervalRef.current = setInterval(() => void loadStatus(), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadStatus]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: NAVY }}>
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>Data Management</h1>
          <p className="text-sm text-gray-500">
            Ward seeding, client provisioning, and platform data health
            {data && (
              <span className="ml-2 text-xs text-gray-400">
                · refreshed {relTime(data.lastRefreshed)} · auto-updates every 30s
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => void loadStatus()}
          className="ml-auto p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Refresh now"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          <Shimmer className="h-48" />
          <Shimmer className="h-48" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Ward Coverage ──────────────────────────────────── */}
          <WardCoverageCard data={data?.wardCoverage ?? []} onRefresh={loadStatus} />

          {/* ── Campaign Health ────────────────────────────────── */}
          <CampaignHealthCard data={data?.campaignHealth ?? []} />

          {/* ── Ward Boundary Management ───────────────────────── */}
          <WardSeedingCard onRefresh={loadStatus} />

          {/* ── Client Provisioning ────────────────────────────── */}
          <ClientProvisioningCard />
        </div>
      )}
    </div>
  );
}

/* ── Ward Coverage Card ──────────────────────────────────────── */
function WardCoverageCard({
  data,
  onRefresh,
}: {
  data: WardCoverage[];
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [wardDetails, setWardDetails] = useState<Record<string, WardDetail[]>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  async function loadWardDetails(municipality: string) {
    if (wardDetails[municipality]) {
      setExpanded(expanded === municipality ? null : municipality);
      return;
    }
    setExpanded(municipality);
    setDetailLoading(municipality);
    try {
      const res = await fetch(
        `/api/ops/data-management/status?wards=${encodeURIComponent(municipality)}`
      );
      if (res.ok) {
        const json = (await res.json()) as { data: { wards: WardDetail[] } };
        setWardDetails((prev) => ({ ...prev, [municipality]: json.data.wards }));
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(null);
    }
  }

  const zeroCoverage = data.filter((m) => m.wardCount === 0);
  const hasCoverage = data.filter((m) => m.wardCount > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: NAVY }} />
          <h2 className="text-sm font-bold text-gray-900">Ward Coverage</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {data.length} municipalities
          </span>
          {zeroCoverage.length > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${RED}18`, color: RED }}
            >
              {zeroCoverage.length} empty
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {data.length === 0 ? (
        <div className="p-10 text-center">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 font-medium">No ward boundaries seeded yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Use the Ward Seeding card below to load ward boundaries.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Municipality</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Wards</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Seeded</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Zero-coverage rows first (red highlight) */}
              {zeroCoverage.map((m) => (
                <tr key={m.municipality} className="bg-red-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: RED }} />
                      <span className="font-medium text-gray-900">{m.municipality}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: RED }}>0</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${RED}18`, color: RED }}>
                      Not seeded
                    </span>
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              ))}
              {/* Normal rows */}
              {hasCoverage.map((m) => {
                const isExpanded = expanded === m.municipality;
                const details = wardDetails[m.municipality];
                return (
                  <>
                    <tr key={m.municipality} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GREEN }} />
                          <span className="font-medium text-gray-900">{m.municipality}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: NAVY }}>{m.wardCount}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{relTime(m.lastFetchedAt)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${GREEN}18`, color: GREEN }}>
                          Seeded
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void loadWardDetails(m.municipality)}
                          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {isExpanded ? "Hide" : "View"} wards
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${m.municipality}-detail`}>
                        <td colSpan={5} className="px-4 pb-4 pt-0 bg-gray-50">
                          {detailLoading === m.municipality ? (
                            <Shimmer className="h-12" />
                          ) : details ? (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {details.map((w) => (
                                <span
                                  key={w.wardName}
                                  className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-700"
                                >
                                  {w.wardName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 pt-2">Failed to load ward details.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

/* ── Campaign Health Card ────────────────────────────────────── */
function CampaignHealthCard({ data }: { data: CampaignHealth[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.05 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Users className="w-4 h-4" style={{ color: NAVY }} />
        <h2 className="text-sm font-bold text-gray-900">Campaign Health</h2>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {data.length} campaigns
        </span>
      </div>

      {data.length === 0 ? (
        <div className="p-10 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No campaigns yet</p>
          <p className="text-xs text-gray-400 mt-1">Provision a client below to create the first campaign.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Campaign</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contacts</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Households</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Import</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: i * 0.03 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">{c.name}</div>
                        {c.candidateName && (
                          <div className="text-xs text-gray-400">{c.candidateName}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: c.contactCount === 0 ? "#9ca3af" : NAVY }}>
                    {c.contactCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: c.householdCount === 0 ? "#9ca3af" : NAVY }}>
                    {c.householdCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.lastImportAt ? (
                      relTime(c.lastImportAt)
                    ) : (
                      <span className="text-gray-300">No imports</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

/* ── Ward Seeding Card ───────────────────────────────────────── */
function WardSeedingCard({ onRefresh }: { onRefresh: () => void }) {
  const [municipality, setMunicipality] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [wardRows, setWardRows] = useState<WardDetail[]>([]);
  const [wardLoading, setWardLoading] = useState(false);

  // Load known municipalities for autocomplete
  useEffect(() => {
    fetch("/api/ops/data-management/status")
      .then((r) => r.json())
      .then((json: { data: StatusData }) => {
        const known = (json.data?.wardCoverage ?? []).map((w) => w.municipality);
        setSuggestions(known);
      })
      .catch(() => {});
  }, []);

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(municipality.toLowerCase()) && s !== municipality
  );

  async function handleSeed() {
    if (!municipality.trim()) return;
    setSeeding(true);
    setSeedResult(null);
    setSeedError(null);
    setWardRows([]);

    try {
      const res = await fetch("/api/ops/seed-municipality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ municipalityName: municipality.trim() }),
      });
      const json = (await res.json()) as SeedResult | { error: string };
      if (!res.ok) {
        setSeedError(("error" in json ? json.error : null) ?? "Seeding failed");
      } else {
        const result = json as SeedResult;
        setSeedResult(result);
        if (result.success) {
          // Load the freshly seeded wards for display
          void loadWards(municipality.trim());
          onRefresh();
        }
      }
    } catch {
      setSeedError("Request failed — check network connection");
    } finally {
      setSeeding(false);
    }
  }

  async function loadWards(muni: string) {
    setWardLoading(true);
    try {
      const res = await fetch(
        `/api/ops/data-management/status?wards=${encodeURIComponent(muni)}`
      );
      if (res.ok) {
        const json = (await res.json()) as { data: { wards: WardDetail[] } };
        setWardRows(json.data?.wards ?? []);
      }
    } finally {
      setWardLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.1 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Layers className="w-4 h-4" style={{ color: NAVY }} />
        <h2 className="text-sm font-bold text-gray-900">Ward Boundary Seeding</h2>
        <span className="text-xs text-gray-400 ml-auto">
          Pulls from ArcGIS / Represent OpenNorth
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Municipality name
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Must match the name in the Ward Asset Registry exactly (e.g. &quot;Whitby&quot;, &quot;Toronto&quot;, &quot;Brampton&quot;).
            Autocomplete shows municipalities already in the database.
          </p>
          <div className="relative">
            <input
              type="text"
              value={municipality}
              onChange={(e) => {
                setMunicipality(e.target.value);
                setShowSuggestions(true);
                setSeedResult(null);
                setSeedError(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="e.g. Whitby"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <AnimatePresence>
              {showSuggestions && filteredSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={spring}
                  className="absolute top-full left-0 right-0 z-10 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
                >
                  {filteredSuggestions.slice(0, 8).map((s) => (
                    <button
                      key={s}
                      onMouseDown={() => {
                        setMunicipality(s);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <button
          onClick={() => void handleSeed()}
          disabled={seeding || !municipality.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity min-h-[44px]"
          style={{ background: seeding ? "#9ca3af" : NAVY }}
        >
          {seeding ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Seeding wards…</>
          ) : (
            <><Layers className="w-4 h-4" /> Seed Wards</>
          )}
        </button>

        {/* Result */}
        <AnimatePresence>
          {seedResult && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
              className="rounded-xl p-4"
              style={{
                background: seedResult.success ? `${GREEN}10` : `${AMBER}10`,
                border: `1px solid ${seedResult.success ? GREEN : AMBER}30`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                {seedResult.success ? (
                  <CheckCircle className="w-4 h-4" style={{ color: GREEN }} />
                ) : (
                  <AlertCircle className="w-4 h-4" style={{ color: AMBER }} />
                )}
                <span className="text-sm font-semibold" style={{ color: seedResult.success ? GREEN : AMBER }}>
                  {seedResult.success
                    ? `${seedResult.wardsLoaded} wards loaded for ${seedResult.municipalityName}`
                    : `Partial — ${seedResult.wardsLoaded} wards loaded`}
                </span>
              </div>
              {seedResult.errors && seedResult.errors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {seedResult.errors.map((e, i) => (
                    <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: AMBER }} />
                      {e}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
          {seedError && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
              className="rounded-xl p-4"
              style={{ background: `${RED}10`, border: `1px solid ${RED}30` }}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" style={{ color: RED }} />
                <span className="text-sm font-semibold" style={{ color: RED }}>{seedError}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ward list after seeding */}
        {(wardRows.length > 0 || wardLoading) && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Wards in {municipality}
            </p>
            {wardLoading ? (
              <Shimmer className="h-12" />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {wardRows.map((w) => (
                  <span
                    key={w.wardName}
                    className="text-xs px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-700"
                  >
                    {w.wardName}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Client Provisioning Card ────────────────────────────────── */
function ClientProvisioningCard() {
  const [form, setForm] = useState({
    candidateName: "",
    email: "",
    campaignName: "",
    jurisdiction: "",
    plan: "professional",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInviteUrl, setShowInviteUrl] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.candidateName.trim()) errs.candidateName = "Required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Valid email required";
    if (!form.campaignName.trim()) errs.campaignName = "Required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleProvision() {
    if (!validate()) return;
    setSubmitting(true);
    setResult(null);
    setError(null);
    setShowInviteUrl(false);

    try {
      const res = await fetch("/api/ops/provision-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: form.candidateName.trim(),
          adminEmail: form.email.trim().toLowerCase(),
          campaignName: form.campaignName.trim(),
          jurisdiction: form.jurisdiction.trim() || undefined,
          plan: form.plan,
        }),
      });
      const json = (await res.json()) as { data?: ProvisionResult; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Provisioning failed");
      } else if (json.data) {
        setResult(json.data);
        setForm({ candidateName: "", email: "", campaignName: "", jurisdiction: "", plan: "professional" });
        setFieldErrors({});
      }
    } catch {
      setError("Request failed — check network connection");
    } finally {
      setSubmitting(false);
    }
  }

  function copyInviteUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.15 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <UserPlus className="w-4 h-4" style={{ color: NAVY }} />
        <h2 className="text-sm font-bold text-gray-900">Client Provisioning</h2>
        <span className="text-xs text-gray-400 ml-auto">
          Creates user + campaign + membership + sends invite
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Candidate name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Candidate full name <span style={{ color: RED }}>*</span>
          </label>
          <input
            type="text"
            value={form.candidateName}
            onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))}
            placeholder="e.g. Elizabeth Chan"
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white",
              fieldErrors.candidateName ? "border-red-400" : "border-gray-300"
            )}
          />
          {fieldErrors.candidateName && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.candidateName}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Full legal name as it will appear on the platform. Used for the campaign&apos;s candidateName field.
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Admin email <span style={{ color: RED }}>*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="e.g. elizabeth@chanforwardwilson.ca"
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white",
              fieldErrors.email ? "border-red-400" : "border-gray-300"
            )}
          />
          {fieldErrors.email && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            The campaign manager&apos;s login email. An invite link will be sent here (if RESEND_API_KEY is set), or shown below for manual sharing.
          </p>
        </div>

        {/* Campaign name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Campaign name <span style={{ color: RED }}>*</span>
          </label>
          <input
            type="text"
            value={form.campaignName}
            onChange={(e) => setForm((f) => ({ ...f, campaignName: e.target.value }))}
            placeholder="e.g. Elizabeth Chan for Ward 5"
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white",
              fieldErrors.campaignName ? "border-red-400" : "border-gray-300"
            )}
          />
          {fieldErrors.campaignName && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.campaignName}</p>
          )}
        </div>

        {/* Jurisdiction + Plan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Municipality / Ward
            </label>
            <input
              type="text"
              value={form.jurisdiction}
              onChange={(e) => setForm((f) => ({ ...f, jurisdiction: e.target.value }))}
              placeholder="e.g. Ward 5, Whitby"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Plan
            </label>
            <select
              value={form.plan}
              onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => void handleProvision()}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity min-h-[44px]"
          style={{ background: submitting ? "#9ca3af" : GREEN }}
        >
          {submitting ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Provisioning…</>
          ) : (
            <><UserPlus className="w-4 h-4" /> Provision Client</>
          )}
        </button>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
              className="rounded-xl p-4 flex items-center gap-2"
              style={{ background: `${RED}10`, border: `1px solid ${RED}30` }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: RED }} />
              <span className="text-sm font-medium" style={{ color: RED }}>{error}</span>
            </motion.div>
          )}

          {/* Success */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
              className="rounded-xl p-4 space-y-3"
              style={{ background: `${GREEN}10`, border: `1px solid ${GREEN}30` }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: GREEN }} />
                <span className="text-sm font-bold" style={{ color: GREEN }}>
                  Client provisioned successfully
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-500 uppercase">Campaign</p>
                  <p className="text-gray-900 font-medium">{result.campaign.name}</p>
                  <code className="text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                    {result.campaign.slug}
                  </code>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-gray-500 uppercase">User</p>
                  <p className="text-gray-900 font-medium">{result.user.email}</p>
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: result.user.isNewUser ? `${NAVY}15` : `${GREEN}15`,
                      color: result.user.isNewUser ? NAVY : GREEN,
                    }}
                  >
                    {result.user.isNewUser ? "New user created" : "Existing user"}
                  </span>
                </div>
              </div>

              {/* Email status */}
              <div className="flex items-center gap-2 text-xs">
                {result.emailSent ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" style={{ color: GREEN }} />
                    <span className="text-gray-600">Invite email sent to {result.user.email}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" style={{ color: AMBER }} />
                    <span className="text-gray-600">Email not sent (RESEND_API_KEY not set) — share invite link manually</span>
                  </>
                )}
              </div>

              {/* Invite URL (only shown if email failed) */}
              {result.inviteUrl && (
                <div className="space-y-1.5">
                  <button
                    onClick={() => setShowInviteUrl(!showInviteUrl)}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: NAVY }}
                  >
                    {showInviteUrl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showInviteUrl ? "Hide" : "Show"} invite link
                  </button>
                  <AnimatePresence>
                    {showInviteUrl && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={spring}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
                          <code className="flex-1 text-xs text-gray-600 break-all">
                            {result.inviteUrl}
                          </code>
                          <button
                            onClick={() => result.inviteUrl && copyInviteUrl(result.inviteUrl)}
                            className="flex-shrink-0 p-1.5 rounded hover:bg-gray-100 transition-colors"
                            title="Copy invite link"
                          >
                            {copied ? (
                              <CheckCircle className="w-3.5 h-3.5" style={{ color: GREEN }} />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
