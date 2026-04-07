"use client";
import { useState, useEffect } from "react";
import { Users, Search, Star, MessageSquare, ChevronRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Official { id: string; name: string; title: string; level: string; district: string; party: string | null; bio: string | null; email: string | null; phone: string | null; subscriptionStatus: string | null; _count: { follows: number; questions: number }; }

const LEVEL_COLORS: Record<string, string> = {
  municipal: "bg-emerald-100 text-emerald-700 border-emerald-200",
  provincial: "bg-blue-100 text-blue-700 border-blue-200",
  federal: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function SocialOfficials() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const url = search ? `/api/officials?search=${encodeURIComponent(search)}` : "/api/officials";
    setLoading(true);
    fetch(url).then(r => r.json()).then(d => { setOfficials(d.data ?? []); setLoading(false); });
  }, [search]);

  async function sendSignal(officialId: string, type: string) {
    try {
      await fetch("/api/social/signal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ officialId, type }) });
      setFollowed(prev => new Set(Array.from(prev).concat(officialId)));
      toast.success("Signal sent!");
    } catch { toast.error("Failed to send signal"); }
  }

  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" />Your Representatives</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, district, or title…"
          className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
      </div>

      {loading ? (
        Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)
      ) : officials.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No officials found{search ? ` for "${search}"` : ""}</p></div>
      ) : officials.map((o) => (
        <div key={o.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
              {o.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-bold text-gray-900">{o.name}</p>
                {o.subscriptionStatus === "verified" && <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{o.title}</p>
              <p className="text-xs text-gray-400">{o.district}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", LEVEL_COLORS[o.level] ?? "bg-gray-100 text-gray-600 border-gray-200")}>{o.level}</span>
                {o.party && <span className="text-xs text-gray-500">{o.party}</span>}
                <span className="text-xs text-gray-400">{o._count.follows} followers</span>
              </div>
            </div>
          </div>

          {o.bio && <p className="text-xs text-gray-600 mt-3 line-clamp-2">{o.bio}</p>}

          <div className="flex gap-2 mt-4">
            <button onClick={() => sendSignal(o.id, "strong_support")} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95", followed.has(o.id) ? "bg-blue-50 border-blue-300 text-blue-600" : "border-gray-200 text-gray-600 hover:border-blue-300")}>
              <Star className="w-3.5 h-3.5" />{followed.has(o.id) ? "Following" : "Support"}
            </button>
            <Link href={`/social/officials/${o.id}`} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border-2 border-gray-200 text-gray-600 hover:border-blue-300 transition-all">
              <MessageSquare className="w-3.5 h-3.5" />Ask a question
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
