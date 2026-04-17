"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import {
  Plus, Search, UtensilsCrossed, Star, MapPin, Phone, Mail,
  CheckCircle2, Clock, Filter, X, ChevronRight,
} from "lucide-react";

interface PricingTier {
  id: string;
  name: string;
  pricePerHead: number;
  minHeads: number | null;
  maxHeads: number | null;
  leadTimeDays: number;
}

interface Vendor {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  province: string;
  sameDay: boolean;
  status: string;
  reliabilityScore: number;
  partnershipTier: number;
  dietaryOptions: string[];
  serviceTags: string[];
  cuisineTypes: string[];
  pricingTiers: PricingTier[];
  isSeeded: boolean;
  _count?: { quotes: number; outreachLogs: number };
}

const DIETARY_OPTIONS = ["vegetarian", "vegan", "halal", "kosher", "gluten_free", "nut_free"];
const CITIES = ["Toronto", "Mississauga", "Brampton", "Vaughan", "Markham", "Hamilton", "Ottawa", "London", "Kitchener", "Windsor"];

function PartnershipBadge({ tier }: { tier: number }) {
  if (tier === 2) return <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">Partner</span>;
  if (tier === 1) return <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">Preferred</span>;
  return null;
}

function ReliabilityBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-[#1D9E75]" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-500 dark:text-slate-400">{score}</span>
    </div>
  );
}

export default function VendorsClient({ campaignId }: { campaignId: string }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sameDayOnly, setSameDayOnly] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", contactName: "", email: "", phone: "", city: "", province: "ON",
    website: "", sameDay: false, partnershipTier: 0,
    cuisineTypes: [] as string[], serviceTags: [] as string[], dietaryOptions: [] as string[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ campaignId });
    if (search) params.set("q", search);
    if (cityFilter) params.set("city", cityFilter);
    if (sameDayOnly) params.set("sameDay", "true");
    if (dietaryFilter) params.set("dietary", dietaryFilter);
    const res = await fetch(`/api/fuel/vendors?${params}`).then((r) => r.json());
    if (res.data) setVendors(res.data);
    setLoading(false);
  }, [campaignId, search, cityFilter, sameDayOnly, dietaryFilter]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    const res = await fetch("/api/fuel/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...form, email: form.email || undefined }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.data) {
      toast.success("Vendor added");
      setShowAdd(false);
      setForm({ name: "", contactName: "", email: "", phone: "", city: "", province: "ON", website: "", sameDay: false, partnershipTier: 0, cuisineTypes: [], serviceTags: [], dietaryOptions: [] });
      load();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  const activeFilters = [cityFilter, sameDayOnly ? "Same-day" : "", dietaryFilter].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Vendor Network</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{vendors.length} vendors in network</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90"
        >
          <Plus className="w-3.5 h-3.5" /> Add Vendor
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${
            showFilters || activeFilters > 0
              ? "bg-[#0A2342] text-white border-[#0A2342]"
              : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-wrap gap-3">
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="px-2 py-1 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="">All cities</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={dietaryFilter}
                onChange={(e) => setDietaryFilter(e.target.value)}
                className="px-2 py-1 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="">Any dietary</option>
                {DIETARY_OPTIONS.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={sameDayOnly} onChange={(e) => setSameDayOnly(e.target.checked)} className="rounded" />
                Same-day only
              </label>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setCityFilter(""); setSameDayOnly(false); setDietaryFilter(""); }}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vendor table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
          <UtensilsCrossed className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">No vendors found</p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Add your first vendor or clear filters</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {vendors.map((vendor) => (
              <Link
                key={vendor.id}
                href={`/fuel/vendors/${vendor.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-[#0A2342]/10 flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="w-4 h-4 text-[#0A2342]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{vendor.name}</p>
                    {vendor.isSeeded && (
                      <span className="text-xs text-gray-400 dark:text-slate-500">(demo)</span>
                    )}
                    <PartnershipBadge tier={vendor.partnershipTier} />
                    {vendor.sameDay && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">Same-day</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {vendor.city && (
                      <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3" />{vendor.city}
                      </span>
                    )}
                    {vendor.email && (
                      <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-slate-400">
                        <Mail className="w-3 h-3" />{vendor.email}
                      </span>
                    )}
                    {vendor.phone && (
                      <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-slate-400">
                        <Phone className="w-3 h-3" />{vendor.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="hidden md:flex flex-col items-end gap-1 min-w-[100px]">
                  <ReliabilityBar score={vendor.reliabilityScore} />
                  {vendor.pricingTiers.length > 0 && (
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      from ${Math.min(...vendor.pricingTiers.map((t) => Number(t.pricePerHead)))}/head
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Add vendor modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Vendor</h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Business name *", field: "name", type: "text" },
                  { label: "Contact name", field: "contactName", type: "text" },
                  { label: "Email", field: "email", type: "email" },
                  { label: "Phone", field: "phone", type: "tel" },
                  { label: "City", field: "city", type: "text" },
                  { label: "Website", field: "website", type: "url" },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
                    <input
                      type={type}
                      value={(form as Record<string, unknown>)[field] as string}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                    />
                  </div>
                ))}
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.sameDay} onChange={(e) => setForm((f) => ({ ...f, sameDay: e.target.checked }))} className="rounded" />
                    <span className="text-gray-700 dark:text-slate-300">Same-day capable</span>
                  </label>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-slate-300 mr-1.5">Partnership</label>
                    <select
                      value={form.partnershipTier}
                      onChange={(e) => setForm((f) => ({ ...f, partnershipTier: Number(e.target.value) }))}
                      className="px-2 py-1 border border-gray-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none"
                    >
                      <option value={0}>None</option>
                      <option value={1}>Preferred</option>
                      <option value={2}>Partner</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button
                  onClick={create}
                  disabled={saving}
                  className="flex-1 px-3 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add Vendor"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
