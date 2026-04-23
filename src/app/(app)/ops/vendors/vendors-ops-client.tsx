"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Search,
  Printer,
  Star,
  Globe,
  CreditCard,
  Package,
  ShieldCheck,
  ShieldOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Shop = {
  id: string;
  name: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  provincesServed: string[];
  specialties: string[];
  isVerified: boolean;
  isActive: boolean;
  stripeOnboarded: boolean;
  rating: number | null;
  reviewCount: number;
  averageResponseHours: number | null;
  createdAt: string;
  _count: { bids: number };
  jobsWon: number;
};

const SPECIALTY_LABELS: Record<string, string> = {
  lawn_signs: "Lawn Signs",
  door_hangers: "Door Hangers",
  flyers: "Flyers",
  palm_cards: "Palm Cards",
  mailers: "Mailers",
  buttons: "Buttons",
  banners: "Banners",
  posters: "Posters",
  brochures: "Brochures",
  other: "Other",
};

export default function VendorsOpsClient() {
  const [shops, setShops] = useState<Shop[]>([]);
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
        setShops(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, search, verified]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function toggleVerified(shop: Shop) {
    setActing(shop.id);
    try {
      const res = await fetch(`/api/ops/vendors/${shop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !shop.isVerified }),
      });
      if (res.ok) {
        setShops((prev) =>
          prev.map((s) => (s.id === shop.id ? { ...s, isVerified: !s.isVerified } : s))
        );
      }
    } finally {
      setActing(null);
    }
  }

  async function toggleActive(shop: Shop) {
    setActing(shop.id);
    try {
      const res = await fetch(`/api/ops/vendors/${shop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !shop.isActive }),
      });
      if (res.ok) {
        setShops((prev) =>
          prev.map((s) => (s.id === shop.id ? { ...s, isActive: !s.isActive } : s))
        );
      }
    } finally {
      setActing(null);
    }
  }

  async function setRating(shop: Shop, rating: number) {
    setActing(shop.id);
    try {
      const res = await fetch(`/api/ops/vendors/${shop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (res.ok) {
        setShops((prev) =>
          prev.map((s) => (s.id === shop.id ? { ...s, rating } : s))
        );
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
          <Printer className="w-5 h-5 text-[#1D9E75]" />
          <h1 className="text-2xl font-bold text-gray-900">Print Vendors</h1>
        </div>
        <p className="text-gray-500">
          {total} vendor{total !== 1 ? "s" : ""} registered — verify, rate, and manage access
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
          { label: "Verified", value: shops.filter((s) => s.isVerified).length },
          { label: "Stripe Ready", value: shops.filter((s) => s.stripeOnboarded).length },
          { label: "Jobs Won (this page)", value: shops.reduce((a, s) => a + (s.jobsWon ?? 0), 0) },
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
      ) : shops.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <Printer className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No vendors found</p>
          <p className="text-sm text-gray-400 mt-1">Adjust filters or wait for shops to register.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shops.map((shop) => {
            const isExpanded = expanded === shop.id;
            return (
              <div key={shop.id} className="bg-white rounded-xl border border-gray-200">
                {/* Row */}
                <div className="p-5 flex items-start gap-4">
                  {/* Left: name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{shop.name}</span>
                      {shop.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                      {!shop.isVerified && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          Unverified
                        </span>
                      )}
                      {!shop.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Inactive
                        </span>
                      )}
                      {shop.stripeOnboarded && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          <CreditCard className="w-3 h-3" /> Stripe
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>{shop.email}</span>
                      {shop.contactName && <span>{shop.contactName}</span>}
                      {shop.phone && <span>{shop.phone}</span>}
                      {shop.provincesServed.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {shop.provincesServed.join(", ")}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {shop._count.bids} bids · {shop.jobsWon} won
                      </span>
                      {shop.rating !== null && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400" />
                          {shop.rating.toFixed(1)}
                        </span>
                      )}
                      <span>
                        Joined {new Date(shop.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleVerified(shop)}
                      disabled={acting === shop.id}
                      title={shop.isVerified ? "Remove verification" : "Verify this vendor"}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                        shop.isVerified
                          ? "text-green-700 bg-green-100 hover:bg-green-200"
                          : "text-gray-400 bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleActive(shop)}
                      disabled={acting === shop.id}
                      title={shop.isActive ? "Deactivate vendor" : "Reactivate vendor"}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                        shop.isActive
                          ? "text-red-600 bg-red-50 hover:bg-red-100"
                          : "text-gray-500 bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      <ShieldOff className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : shop.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                    {shop.description && (
                      <p className="text-sm text-gray-600">{shop.description}</p>
                    )}

                    {shop.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {shop.specialties.map((s) => (
                          <span key={s} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {SPECIALTY_LABELS[s] ?? s}
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
                          onClick={() => setRating(shop, n)}
                          disabled={acting === shop.id}
                          className={`w-7 h-7 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
                            shop.rating === n
                              ? "bg-amber-400 text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-amber-100"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      {shop.rating !== null && (
                        <button
                          onClick={() => setRating(shop, 0)}
                          disabled={acting === shop.id}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {shop.website && (
                      <a
                        href={shop.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-[#1D9E75] hover:underline"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {shop.website}
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
