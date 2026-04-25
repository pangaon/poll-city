"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Landmark, CheckCircle, XCircle, Users, RefreshCw,
  ExternalLink, ShieldCheck, ShieldOff, ChevronDown, Pencil, X, Save,
} from "lucide-react";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

interface Official {
  id: string;
  name: string;
  title: string;
  level: string;
  district: string;
  province: string | null;
  isClaimed: boolean;
  isActive: boolean;
  partyName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  externalId: string | null;
  campaignSlug: string | null;
  _count: { follows: number };
}

interface DirectoryResponse {
  officials: Official[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
  filterOptions: { provinces: string[]; levels: string[] };
}

const LEVEL_LABELS: Record<string, string> = {
  federal: "Federal",
  provincial: "Provincial",
  municipal: "Municipal",
};

const LEVEL_COLORS: Record<string, string> = {
  federal: "#0A2342",
  provincial: "#1D9E75",
  municipal: "#EF9F27",
};

// ── Edit panel ────────────────────────────────────────────────────────────────

interface EditForm {
  name: string;
  title: string;
  level: string;
  district: string;
  province: string;
  partyName: string;
  email: string;
  phone: string;
  website: string;
  isActive: boolean;
}

function EditPanel({
  official,
  onClose,
  onSaved,
}: {
  official: Official;
  onClose: () => void;
  onSaved: (updated: Partial<Official>) => void;
}) {
  const [form, setForm] = useState<EditForm>({
    name: official.name,
    title: official.title,
    level: official.level,
    district: official.district,
    province: official.province ?? "",
    partyName: official.partyName ?? "",
    email: official.email ?? "",
    phone: official.phone ?? "",
    website: official.website ?? "",
    isActive: official.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof EditForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, string | boolean | null> = {
        name: form.name.trim(),
        title: form.title.trim(),
        level: form.level,
        district: form.district.trim(),
        province: form.province.trim() || null,
        partyName: form.partyName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        isActive: form.isActive,
      };
      const res = await fetch(`/api/ops/officials/${official.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { data?: Partial<Official>; error?: string };
      if (!res.ok) { setError(json.error ?? "Save failed"); return; }
      onSaved(json.data ?? payload as Partial<Official>);
      onClose();
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={spring}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900">Edit Official</h2>
            <p className="text-xs text-gray-500 mt-0.5">{official.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Full name</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Mayor, MP, Councillor"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
              <select
                value={form.level}
                onChange={(e) => set("level", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
              >
                <option value="federal">Federal</option>
                <option value="provincial">Provincial</option>
                <option value="municipal">Municipal</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">District / Ward / Riding</label>
              <input
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Province</label>
              <input
                value={form.province}
                onChange={(e) => set("province", e.target.value)}
                placeholder="ON"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Party</label>
              <input
                value={form.partyName}
                onChange={(e) => set("partyName", e.target.value)}
                placeholder="Liberal, Conservative…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
              />
            </div>

            <div className="col-span-2 flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => set("isActive", !form.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? "bg-green-500" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm text-gray-700">{form.isActive ? "Active — visible on public site" : "Inactive — hidden from public site"}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
            style={{ backgroundColor: NAVY }}
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OfficialsOpsClient() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [data, setData] = useState<DirectoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [allOfficials, setAllOfficials] = useState<Official[]>([]);
  const [editing, setEditing] = useState<Official | null>(null);

  const fetchOfficials = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50" });
      if (search) params.set("search", search);
      if (levelFilter) params.set("level", levelFilter);
      if (provinceFilter) params.set("province", provinceFilter);
      if (!reset && cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/officials/directory?${params}`);
      if (!res.ok) return;
      const json: DirectoryResponse = await res.json();
      if (reset) {
        setAllOfficials(json.officials);
      } else {
        setAllOfficials((prev) => [...prev, ...json.officials]);
      }
      setData(json);
      setCursor(json.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [search, levelFilter, provinceFilter, cursor]);

  useEffect(() => {
    const t = setTimeout(() => fetchOfficials(true), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, levelFilter, provinceFilter]);

  async function toggleActive(official: Official) {
    setToggling(official.id);
    try {
      const res = await fetch(`/api/ops/officials/${official.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !official.isActive }),
      });
      if (res.ok) {
        setAllOfficials((prev) =>
          prev.map((o) => o.id === official.id ? { ...o, isActive: !o.isActive } : o)
        );
      }
    } finally {
      setToggling(null);
    }
  }

  function handleSaved(updated: Partial<Official>) {
    setAllOfficials((prev) =>
      prev.map((o) => o.id === editing?.id ? { ...o, ...updated } : o)
    );
  }

  const claimed = allOfficials.filter((o) => o.isClaimed).length;
  const unclaimed = allOfficials.filter((o) => !o.isClaimed).length;
  const inactive = allOfficials.filter((o) => !o.isActive).length;

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Officials Directory</h1>
            <p className="text-sm text-gray-500 mt-1">
              {data ? `${data.total.toLocaleString()} total officials` : "Loading…"}
            </p>
          </div>
          <button
            onClick={() => fetchOfficials(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total shown", value: allOfficials.length, color: NAVY },
            { label: "Claimed", value: claimed, color: GREEN },
            { label: "Unclaimed", value: unclaimed, color: AMBER },
            { label: "Inactive", value: inactive, color: "#E24B4A" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, title, district…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none"
          >
            <option value="">All levels</option>
            <option value="federal">Federal</option>
            <option value="provincial">Provincial</option>
            <option value="municipal">Municipal</option>
          </select>
          {data?.filterOptions.provinces && data.filterOptions.provinces.length > 0 && (
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none"
            >
              <option value="">All provinces</option>
              {data.filterOptions.provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Official</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Level</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">District / Province</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Claimed</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Followers</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading && allOfficials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading officials…
                    </td>
                  </tr>
                ) : allOfficials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      <Landmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No officials found
                    </td>
                  </tr>
                ) : (
                  allOfficials.map((official) => (
                    <motion.tr
                      key={official.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={spring}
                      className={`hover:bg-gray-50 transition-colors ${!official.isActive ? "opacity-50" : ""}`}
                    >
                      {/* Name + title */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{official.name}</div>
                        <div className="text-xs text-gray-500">{official.title}</div>
                        {official.partyName && (
                          <div className="text-xs text-gray-400">{official.partyName}</div>
                        )}
                      </td>

                      {/* Level badge */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: LEVEL_COLORS[official.level] ?? "#6b7280" }}
                        >
                          {LEVEL_LABELS[official.level] ?? official.level}
                        </span>
                      </td>

                      {/* District + province */}
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                        <div>{official.district}</div>
                        {official.province && (
                          <div className="text-xs text-gray-400">{official.province}</div>
                        )}
                      </td>

                      {/* Claimed */}
                      <td className="px-4 py-3 text-center">
                        {official.isClaimed ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <CheckCircle className="w-4 h-4" style={{ color: GREEN }} />
                            {official.campaignSlug && (
                              <span className="text-xs text-gray-400">{official.campaignSlug}</span>
                            )}
                          </div>
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                        )}
                      </td>

                      {/* Followers */}
                      <td className="px-4 py-3 text-center hidden md:table-cell text-gray-600">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-3 h-3 text-gray-400" />
                          {official._count.follows}
                        </div>
                      </td>

                      {/* Active toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActive(official)}
                          disabled={toggling === official.id}
                          title={official.isActive ? "Deactivate" : "Activate"}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                          style={
                            official.isActive
                              ? { background: "#dcfce7", color: "#166534" }
                              : { background: "#fee2e2", color: "#991b1b" }
                          }
                        >
                          {toggling === official.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : official.isActive ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <ShieldOff className="w-3 h-3" />
                          )}
                          {official.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditing(official)}
                            title="Edit"
                            className="p-1.5 text-gray-400 hover:text-[#0A2342] hover:bg-gray-100 rounded"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`/officials/${official.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View public profile"
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {data?.hasMore && (
            <div className="px-4 py-3 border-t border-gray-100 text-center">
              <button
                onClick={() => fetchOfficials(false)}
                disabled={loading}
                className="flex items-center gap-2 mx-auto text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <ChevronDown className="w-4 h-4" />
                Load more
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit panel */}
      <AnimatePresence>
        {editing && (
          <EditPanel
            official={editing}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </>
  );
}
