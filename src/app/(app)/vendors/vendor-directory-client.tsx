"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search, Star, CheckCircle, ChevronRight, Filter, X,
  Users, Briefcase, Clock, DollarSign,
} from "lucide-react";

type VendorSummary = {
  id: string;
  name: string;
  contactName: string | null;
  categories: string[];
  provincesServed: string[];
  serviceAreas: string[];
  isVerified: boolean;
  isFeatured: boolean;
  rating: number | null;
  reviewCount: number;
  logoUrl: string | null;
  yearsExperience: number | null;
  rateFrom: number | null;
  avgResponseHours: number | null;
  tags: string[];
  bio: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  print_shop:           "Print Shop",
  sign_crew:            "Sign Crew",
  video_production:     "Video Production",
  photography:          "Photography",
  graphic_design:       "Graphic Design",
  digital_advertising:  "Digital Ads",
  phone_banking:        "Phone Banking",
  canvassing_crew:      "Canvassing",
  campaign_manager:     "Campaign Mgr",
  financial_agent:      "Financial Agent",
  accountant:           "Accountant",
  election_lawyer:      "Election Law",
  polling_firm:         "Polling",
  opposition_research:  "Opp Research",
  event_planning:       "Events",
  translation_services: "Translation",
  speaking_coach:       "Speaking Coach",
  media_trainer:        "Media Training",
  mail_house:           "Mail House",
  merchandise:          "Merchandise",
  data_analytics:       "Data & Analytics",
  website_tech:         "Web & Tech",
  other:                "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  print_shop:           "bg-blue-100 text-blue-700",
  sign_crew:            "bg-green-100 text-green-700",
  video_production:     "bg-purple-100 text-purple-700",
  photography:          "bg-pink-100 text-pink-700",
  graphic_design:       "bg-violet-100 text-violet-700",
  digital_advertising:  "bg-cyan-100 text-cyan-700",
  phone_banking:        "bg-orange-100 text-orange-700",
  canvassing_crew:      "bg-lime-100 text-lime-700",
  campaign_manager:     "bg-amber-100 text-amber-700",
  financial_agent:      "bg-emerald-100 text-emerald-700",
  accountant:           "bg-teal-100 text-teal-700",
  election_lawyer:      "bg-indigo-100 text-indigo-700",
  polling_firm:         "bg-sky-100 text-sky-700",
  opposition_research:  "bg-red-100 text-red-700",
  event_planning:       "bg-fuchsia-100 text-fuchsia-700",
  translation_services: "bg-rose-100 text-rose-700",
  speaking_coach:       "bg-yellow-100 text-yellow-700",
  media_trainer:        "bg-orange-100 text-orange-700",
  mail_house:           "bg-blue-100 text-blue-700",
  merchandise:          "bg-purple-100 text-purple-700",
  data_analytics:       "bg-emerald-100 text-emerald-700",
  website_tech:         "bg-gray-100 text-gray-700",
  other:                "bg-gray-100 text-gray-600",
};

const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];

function VendorInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const init = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0].slice(0, 2);
  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A2342] to-[#1D4678] flex items-center justify-center text-white text-sm font-bold shrink-0">
      {init.toUpperCase()}
    </div>
  );
}

export default function VendorDirectoryClient({ initialTotal }: { initialTotal: number }) {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [province, setProvince] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (province) params.set("province", province);
    if (verifiedOnly) params.set("verified", "true");
    const res = await fetch(`/api/vendors?${params}`).then((r) => r.json());
    if (res.data) { setVendors(res.data); setTotal(res.total ?? 0); }
    setLoading(false);
  }, [search, category, province, verifiedOnly, page]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const activeFilters = [category, province, verifiedOnly ? "verified" : ""].filter(Boolean).length;
  const totalPages = Math.ceil(total / 20);

  function clearFilters() {
    setCategory("");
    setProvince("");
    setVerifiedOnly(false);
    setPage(1);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-[#1D9E75]" />
          <h1 className="text-2xl font-bold text-gray-900">Vendor Network</h1>
        </div>
        <p className="text-gray-500 text-sm">
          {total} vendor{total !== 1 ? "s" : ""} across all campaign service categories
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search vendors by name, service, or keyword…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm font-medium transition-colors ${
            showFilters || activeFilters > 0
              ? "bg-[#0A2342] text-white border-[#0A2342]"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
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
            className="overflow-hidden mb-3"
          >
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap gap-3 items-center">
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
              >
                <option value="">All categories</option>
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <select
                value={province}
                onChange={(e) => { setProvince(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
              >
                <option value="">All provinces</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => { setVerifiedOnly(e.target.checked); setPage(1); }}
                  className="rounded"
                />
                Verified only
              </label>
              {activeFilters > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 ml-auto">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vendor list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-16 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-600">No vendors found</p>
          <p className="text-sm text-gray-400 mt-1">
            {activeFilters > 0 || search ? "Try adjusting your filters." : "Vendors will appear here once they register."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {vendors.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.03 }}
            >
              <Link
                href={`/vendors/${v.id}`}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#0A2342]/30 hover:shadow-sm transition-all group"
              >
                {v.logoUrl ? (
                  <img src={v.logoUrl} alt={v.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                ) : (
                  <VendorInitials name={v.name} />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{v.name}</span>
                    {v.isVerified && (
                      <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    )}
                    {v.isFeatured && (
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {v.categories.slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                    ))}
                    {v.categories.length > 3 && (
                      <span className="text-xs text-gray-400">+{v.categories.length - 3}</span>
                    )}
                  </div>
                  {v.bio && (
                    <p className="text-xs text-gray-500 line-clamp-1">{v.bio}</p>
                  )}
                </div>

                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 min-w-[100px]">
                  {v.rating !== null && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-semibold text-gray-900">{v.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 justify-end">
                    {v.yearsExperience !== null && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Briefcase className="w-3 h-3" />{v.yearsExperience}yr
                      </span>
                    )}
                    {v.rateFrom !== null && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <DollarSign className="w-3 h-3" />${v.rateFrom}/hr
                      </span>
                    )}
                    {v.avgResponseHours !== null && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />~{v.avgResponseHours}h
                      </span>
                    )}
                  </div>
                  {v.provincesServed.length > 0 && (
                    <span className="text-xs text-gray-400">{v.provincesServed.slice(0, 3).join(", ")}</span>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 shrink-0 transition-colors" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">Page {page} of {totalPages} · {total} vendors</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
