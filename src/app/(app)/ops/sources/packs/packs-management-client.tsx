"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Plus, Search, RefreshCw, ArrowLeft, X, Loader2, Globe, Users } from "lucide-react";
import { PACK_TYPE_LABELS } from "@/lib/sources/types";

interface Pack {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  packType: string;
  municipality: string | null;
  geographyScope: string | null;
  officeScope: string | null;
  visibility: string;
  isActive: boolean;
  isRecommended: boolean;
  _count: { items: number; campaignActivations: number };
}

interface CreateForm {
  name: string;
  slug: string;
  description: string;
  packType: string;
  municipality: string;
  geographyScope: string;
  officeScope: string;
  isRecommended: boolean;
}

export default function PacksManagementClient() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    name: "", slug: "", description: "", packType: "municipality",
    municipality: "", geographyScope: "", officeScope: "", isRecommended: false,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    const res = await fetch(`/api/sources/packs?${p}`);
    const d = await res.json();
    setPacks(d.packs ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreateError("");
    if (!form.name || !form.slug || !form.packType) {
      setCreateError("Name, slug, and pack type are required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/sources/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setCreateError(d.error ?? "Failed"); return; }
      setShowCreate(false);
      setForm({ name: "", slug: "", description: "", packType: "municipality", municipality: "", geographyScope: "", officeScope: "", isRecommended: false });
      load();
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (pack: Pack) => {
    await fetch(`/api/sources/packs/${pack.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !pack.isActive }),
    });
    load();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <a href="/ops/sources" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </a>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#0A2342]">Source Packs</h1>
          <p className="text-sm text-gray-500 mt-1">Platform-managed bundles of related sources</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Pack
        </button>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
            placeholder="Search packs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Packs grid */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          Loading packs…
        </div>
      ) : packs.length === 0 ? (
        <div className="py-12 text-center">
          <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 font-medium">No packs yet</p>
          <p className="text-gray-400 text-xs mt-1">Create packs to bundle related sources for campaigns.</p>
          <button onClick={() => setShowCreate(true)} className="mt-3 px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm">
            Create First Pack
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packs.map((pack) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white border rounded-xl p-5 space-y-3 ${pack.isActive ? "border-gray-100" : "border-gray-200 opacity-60"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#0A2342]">{pack.name}</h3>
                    {pack.isRecommended && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">★ Rec</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {PACK_TYPE_LABELS[pack.packType] ?? pack.packType}
                    {pack.municipality ? ` · ${pack.municipality}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(pack)}
                  className={`px-2 py-1 rounded text-xs font-medium ${pack.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {pack.isActive ? "Active" : "Inactive"}
                </button>
              </div>

              {pack.description && (
                <p className="text-xs text-gray-600">{pack.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  {pack._count.items} sources
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {pack._count.campaignActivations} campaigns
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-[#0A2342]">Create Source Pack</h2>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pack Name *</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="Whitby Local Media Pack"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pack Type *</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={form.packType}
                    onChange={(e) => setForm((f) => ({ ...f, packType: e.target.value }))}
                  >
                    {Object.entries(PACK_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Municipality</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="Whitby"
                    value={form.municipality}
                    onChange={(e) => setForm((f) => ({ ...f, municipality: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRecommended}
                    onChange={(e) => setForm((f) => ({ ...f, isRecommended: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Mark as recommended</span>
                </label>
                {createError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{createError}</div>
                )}
              </div>
              <div className="flex gap-3 p-6 border-t border-gray-100">
                <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Pack
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
