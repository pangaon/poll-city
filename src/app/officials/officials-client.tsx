"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search, Filter, Globe, Twitter, Facebook, Instagram, Linkedin,
  ShieldCheck, AlertCircle, ChevronLeft, ChevronRight, Users,
} from "lucide-react";

interface Official {
  id: string;
  name: string;
  title: string | null;
  level: string;
  district: string;
  province: string | null;
  isClaimed: boolean;
  photoUrl: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedIn: string | null;
  website: string | null;
  externalId: string | null;
  email: string | null;
  phone: string | null;
  campaignSlug: string | null;
}

const LEVEL_LABELS: Record<string, string> = {
  federal: "Federal",
  provincial: "Provincial",
  municipal: "Municipal",
};

const LEVEL_COLOURS: Record<string, string> = {
  federal: "bg-blue-100 text-blue-700 border-blue-200",
  provincial: "bg-emerald-100 text-emerald-700 border-emerald-200",
  municipal: "bg-orange-100 text-orange-700 border-orange-200",
};

function OfficialCard({ official }: { official: Official }) {
  const initials = official.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const profileSlug = official.campaignSlug ?? official.externalId ?? official.id;
  const levelCls = LEVEL_COLOURS[official.level] ?? "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      {/* Header band */}
      <div className="h-1.5 w-full" style={{ background: official.isClaimed ? "#059669" : "#9ca3af" }} />

      <div className="p-5 flex flex-col flex-1">
        {/* Photo + name */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0">
            {official.photoUrl ? (
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-100">
                <Image
                  src={official.photoUrl}
                  alt={official.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized={official.photoUrl.startsWith("http")}
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center border-2 border-gray-100">
                <span className="text-sm font-bold text-white">{initials}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 flex-wrap">
              <h3 className="font-bold text-gray-900 text-sm leading-tight">{official.name}</h3>
              {official.isClaimed && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">{official.title}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-tight">{official.district}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${levelCls}`}>
            {LEVEL_LABELS[official.level] ?? official.level}
          </span>
          {official.province && (
            <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
              {official.province}
            </span>
          )}
          {official.isClaimed && (
            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ Verified
            </span>
          )}
          {!official.isClaimed && (
            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Unclaimed
            </span>
          )}
        </div>

        {/* District */}
        <p className="text-xs text-gray-600 mb-3 flex-1 leading-relaxed">
          <span className="font-medium">District:</span> {official.district}
        </p>

        {/* Social icons */}
        {(official.twitter || official.facebook || official.instagram || official.linkedIn || official.website) && (
          <div className="flex items-center gap-2 mb-3">
            {official.website && (
              <a href={official.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors" title="Website">
                <Globe className="w-3.5 h-3.5" />
              </a>
            )}
            {official.twitter && (
              <a href={official.twitter.startsWith("http") ? official.twitter : `https://twitter.com/${official.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors" title="Twitter">
                <Twitter className="w-3.5 h-3.5" />
              </a>
            )}
            {official.facebook && (
              <a href={official.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-700 transition-colors" title="Facebook">
                <Facebook className="w-3.5 h-3.5" />
              </a>
            )}
            {official.instagram && (
              <a href={official.instagram.startsWith("http") ? official.instagram : `https://instagram.com/${official.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-600 transition-colors" title="Instagram">
                <Instagram className="w-3.5 h-3.5" />
              </a>
            )}
            {official.linkedIn && (
              <a href={official.linkedIn} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-800 transition-colors" title="LinkedIn">
                <Linkedin className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2 border-t border-gray-50">
          <Link
            href={`/candidates/${profileSlug}`}
            className="flex-1 text-center text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-blue-900 px-3 py-1.5 rounded-lg transition-colors"
          >
            View Profile
          </Link>
          {!official.isClaimed && (
            <Link
              href={`/claim/${profileSlug}`}
              className="flex-1 text-center text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Claim Profile
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OfficialsClient() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("");
  const [level, setLevel] = useState("");
  const [role, setRole] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [provinceOptions, setProvinceOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, province, level, role, municipality]);

  const fetchOfficials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (province) params.set("province", province);
      if (level) params.set("level", level);
      if (role) params.set("role", role);
      if (municipality) params.set("municipality", municipality);

      const res = await fetch(`/api/officials/directory?${params}`);
      if (res.ok) {
        const d = await res.json();
        setOfficials(d.data ?? []);
        setTotal(d.total ?? 0);
        setPages(d.pages ?? 1);
        setProvinceOptions(d.filters?.provinces ?? []);
        setRoleOptions(d.filters?.roles ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, debouncedSearch, province, level, role, municipality]);

  useEffect(() => { fetchOfficials(); }, [fetchOfficials]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1E3A8A] to-blue-700 text-white py-14 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white text-sm font-semibold px-4 py-2 rounded-full mb-5">
            <Users className="w-4 h-4" /> 1,100+ Officials Tracked
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">Find Your Elected Officials</h1>
          <p className="text-blue-200 max-w-xl mx-auto text-lg">
            Search federal MPs, provincial MPPs, and municipal councillors across Ontario and BC.
            Claim your profile to engage with constituents on Poll City Social.
          </p>
          {/* Search bar */}
          <div className="mt-8 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, title, or district…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>
        </div>
      </div>

      {/* Filters + results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {[
            {
              value: province, onChange: setProvince, placeholder: "Province",
              options: provinceOptions.map((p) => [p, p]),
            },
            {
              value: level, onChange: setLevel, placeholder: "Level",
              options: [["federal", "Federal"], ["provincial", "Provincial"], ["municipal", "Municipal"]],
            },
            {
              value: role, onChange: setRole, placeholder: "Role",
              options: roleOptions.map((r) => [r, r]),
            },
          ].map(({ value, onChange, placeholder, options }) => (
            <select
              key={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{placeholder}: All</option>
              {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          <input
            type="text"
            placeholder="Municipality…"
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
          />
          {(search || province || level || role || municipality) && (
            <button
              onClick={() => { setSearch(""); setProvince(""); setLevel(""); setRole(""); setMunicipality(""); }}
              className="text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            {loading ? "Loading…" : `${total.toLocaleString()} official${total !== 1 ? "s" : ""} found`}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Verified profile</span>
            <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Unclaimed</span>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-52 animate-pulse" />
            ))}
          </div>
        ) : officials.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-gray-600">No officials found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {officials.map((o) => <OfficialCard key={o.id} official={o} />)}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CTA for officials */}
        <div className="mt-12 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="font-extrabold text-gray-900 text-xl mb-2">Are you an elected official?</h2>
          <p className="text-gray-600 max-w-lg mx-auto mb-5 text-sm leading-relaxed">
            Your Poll City profile is waiting for you. Claim it to manage your public presence,
            engage with constituents, respond to questions, and reach opted-in voters with
            election day notifications.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-[#1E3A8A] text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-900 transition-colors text-sm"
          >
            Claim Your Profile — Free <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
