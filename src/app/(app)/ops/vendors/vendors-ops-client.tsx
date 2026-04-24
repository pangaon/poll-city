"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle, Search, Star, Globe, CreditCard, Package,
  ShieldCheck, ShieldOff, ChevronDown, ChevronUp, Users,
} from "lucide-react";

type NormalisedVendor = {
  id: string;
  name: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  bio: string | null;
  categories: string[];
  provincesServed: string[];
  isVerified: boolean;
  isActive: boolean;
  isFeatured: boolean;
  stripeOnboarded: boolean;
  rating: number | null;
  reviewCount: number;
  avgResponseHours: number | null;
  yearsExperience: number | null;
  rateFrom: number | null;
  createdAt: string;
  _count: { bids: number };
  jobsWon: number;
  _legacy?: boolean;
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

export default function VendorsOpsClient() {
  const [vendors, setVendors] = useState<NormalisedVendor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verified, setVerified] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      ...(search ? { search } : {}),
      ...(verified ? { verified } : {}),
    });
    fetch(`/api/ops/vendors?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setVendors(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, search, verified]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function toggleVerified(v: NormalisedVendor) {
    setActing(v.id);
    try {
      const res = await fetch(`/api/ops/vendors/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !v.isVerified }),
      });
      if (res.ok) {
        setVendors((prev) =>
          prev.map((x) => (x.id === v.id ? { ...x, isVerified: !v.isVerified } : x))
        );
      }
    } finally {
      setActing(null);
    }
  }

  async function toggleActive(v: NormalisedVendor) {
    setActing(v.id);
    try {
      const res = await fetch(`/api/ops/vendors/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !v.isActive }),
      });
      if (res.ok) {
        setVendors((prev) =>
          prev.map((x) => (x.id === v.id ? { ...x, isActive: !v.isActive } : x))
        );
      }
    } finally {
      setActing(null);
    }
  }

  async function setRating(v: NormalisedVendor, rating: number) {
    setActing(v.id);
    try {
      const res = await fetch(`/api/ops/vendors/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (res.ok) {
        setVendors((prev) => prev.map((x) => (x.id === v.id ? { ...x, rating } : x)));
      }
    } finally {
      setActing(null);
    }
  }

  const pageSize = 25;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-[#1D9E75]" />
          <h1 className="text-2xl font-bold text-gray-900">Vendor Network</h1>
        </div>
        <p className="text-gray-500">
          {total} vendor{total !== 1 ? "s" : ""} registered across all service categories
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, contact…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          value={verified}
          onChange={(e) => { setVerified(e.target.value as "" | "true" | "false"); setPage(1); }}
        >
          <option value="">All verification statuses</option>
          <option value="true">Verified only</option>
          <option value="false">Unverified only</option>
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Vendors", value: total },
          { label: "Verified", value: vendors.filter((v) => v.isVerified).length },
          { label: "Stripe Ready", value: vendors.filter((v) => v.stripeOnboarded).length },
          { label: "Jobs Won", value: vendors.reduce((a, v) => a + (v.jobsWon ?? 0), 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-16" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No vendors found</p>
          <p className="text-sm text-gray-400 mt-1">Adjust filters or wait for vendors to register.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {vendors.map((v) => {
            const isExpanded = expanded === v.id;
            return (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200">
                {/* Row */}
                <div className="p-5 flex items-start gap-4">
                  {/* Left: name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{v.name}</span>
                      {v.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                      {!v.isVerified && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          Unverified
                        </span>
                      )}
                      {!v.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Inactive
                        </span>
                      )}
                      {v.stripeOnboarded && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          <CreditCard className="w-3 h-3" /> Stripe
                        </span>
                      )}
                      {v._legacy && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          Legacy
                        </span>
                      )}
                    </div>

                    {/* Category badges */}
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {v.categories.slice(0, 4).map((cat) => (
                        <span
                          key={cat}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {CATEGORY_LABELS[cat] ?? cat}
                        </span>
                      ))}
                      {v.categories.length > 4 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          +{v.categories.length - 4} more
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>{v.email}</span>
                      {v.contactName && <span>{v.contactName}</span>}
                      {v.phone && <span>{v.phone}</span>}
                      {v.provincesServed.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {v.provincesServed.join(", ")}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {v._count.bids} bids · {v.jobsWon} won
                      </span>
                      {v.yearsExperience !== null && (
                        <span>{v.yearsExperience} yrs experience</span>
                      )}
                      {v.rateFrom !== null && (
                        <span>From ${v.rateFrom}/hr</span>
                      )}
                      {v.rating !== null && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400" />
                          {v.rating.toFixed(1)}
                        </span>
                      )}
                      <span>
                        Joined {new Date(v.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleVerified(v)}
                      disabled={acting === v.id}
                      title={v.isVerified ? "Remove verification" : "Verify this vendor"}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                        v.isVerified
                          ? "text-green-700 bg-green-100 hover:bg-green-200"
                          : "text-gray-400 bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleActive(v)}
                      disabled={acting === v.id}
                      title={v.isActive ? "Deactivate vendor" : "Reactivate vendor"}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                        v.isActive
                          ? "text-red-600 bg-red-50 hover:bg-red-100"
                          : "text-gray-500 bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      <ShieldOff className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : v.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                    {v.bio && (
                      <p className="text-sm text-gray-600">{v.bio}</p>
                    )}

                    {/* All categories */}
                    {v.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {v.categories.map((cat) => (
                          <span
                            key={cat}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {CATEGORY_LABELS[cat] ?? cat}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Rating control */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 font-medium">Set rating:</span>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setRating(v, n)}
                          disabled={acting === v.id}
                          className={`w-7 h-7 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
                            v.rating === n
                              ? "bg-amber-400 text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-amber-100"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      {v.rating !== null && (
                        <button
                          onClick={() => setRating(v, 0)}
                          disabled={acting === v.id}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {v.website && (
                      <a
                        href={v.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-[#1D9E75] hover:underline"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {v.website}
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
