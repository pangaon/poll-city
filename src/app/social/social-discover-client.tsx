"use client";
import { useState, useEffect } from "react";
import { MapPin, ChevronRight, BarChart2, Users, Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Official {
  id: string; name: string; title: string; level: string; district: string;
  party: string | null; photoUrl: string | null; subscriptionStatus: string | null;
  _count: { follows: number };
}

interface Poll {
  id: string; question: string; type: string; totalResponses: number;
  options: { id: string; text: string }[];
}

const LEVEL_COLORS: Record<string, string> = {
  municipal: "bg-emerald-100 text-emerald-700",
  provincial: "bg-blue-100 text-blue-700",
  federal: "bg-purple-100 text-purple-700",
};

export default function SocialDiscover() {
  const [postalCode, setPostalCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(false);

  // Load featured polls on mount
  useEffect(() => {
    fetch("/api/polls?featured=true")
      .then(r => r.json())
      .then(d => setPolls(d.data?.slice(0, 3) ?? []));
  }, []);

  async function lookup() {
    if (postalCode.length < 3) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/officials?postalCode=${postalCode.replace(/\s/g, "")}`);
      const data = await res.json();
      setOfficials(data.data ?? []);
      setSubmitted(true);
      // Load geo-targeted polls
      const pRes = await fetch(`/api/polls?postalCode=${postalCode.replace(/\s/g, "")}`);
      const pData = await pRes.json();
      setPolls(pData.data?.slice(0, 3) ?? []);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 pt-12 pb-8 text-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🗳️</span>
          <span className="text-sm font-semibold text-blue-200 uppercase tracking-widest">Poll City Social</span>
        </div>
        <h1 className="text-2xl font-bold mt-3 mb-1">Your civic life, simplified.</h1>
        <p className="text-blue-200 text-sm">Find your reps, vote on issues, make your voice heard.</p>

        {/* Postal code input */}
        <div className="mt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && lookup()}
                placeholder="Enter postal code (e.g. M4C 1A1)"
                maxLength={7}
                className="w-full pl-9 pr-3 py-3 bg-white/15 border border-white/25 rounded-xl text-white placeholder:text-blue-300 focus:outline-none focus:bg-white/20 text-sm font-medium tracking-wide"
              />
            </div>
            <button
              onClick={lookup}
              disabled={loading || postalCode.length < 3}
              className="px-5 py-3 bg-white text-blue-700 font-semibold rounded-xl text-sm disabled:opacity-50 hover:bg-blue-50 transition-colors"
            >
              {loading ? "…" : "Find"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* My Officials */}
        {submitted && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" />Your Representatives</h2>
              <Link href="/social/officials" className="text-xs text-blue-600 font-medium">See all</Link>
            </div>
            {officials.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4 text-center">No officials found for postal code <strong>{postalCode}</strong></p>
            ) : (
              <div className="space-y-2">
                {officials.map((o) => <OfficialCard key={o.id} official={o} />)}
              </div>
            )}
          </section>
        )}

        {/* Active Polls */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-600" />Active Polls</h2>
            <Link href="/social/polls" className="text-xs text-blue-600 font-medium">See all</Link>
          </div>
          {polls.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No polls available yet</p>
          ) : (
            <div className="space-y-3">
              {polls.map((p) => <PollPreviewCard key={p.id} poll={p} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function OfficialCard({ official: o }: { official: Official }) {
  return (
    <Link href={`/social/officials/${o.id}`} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="w-11 h-11 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0 text-blue-700 font-bold text-lg">
        {o.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-gray-900 text-sm truncate">{o.name}</p>
          {o.subscriptionStatus === "verified" && <span className="text-blue-500 text-xs">✓</span>}
        </div>
        <p className="text-xs text-gray-500 truncate">{o.title} · {o.district}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", LEVEL_COLORS[o.level] ?? "bg-gray-100 text-gray-600")}>{o.level}</span>
          {o.party && <span className="text-xs text-gray-400">{o.party}</span>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </Link>
  );
}

function PollPreviewCard({ poll: p }: { poll: Poll }) {
  return (
    <Link href={`/social/polls/${p.id}`} className="block p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all">
      <p className="text-sm font-semibold text-gray-900 leading-snug">{p.question}</p>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-xs text-gray-400">{p.totalResponses} responses</span>
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{p.type.replace("_", " ")}</span>
      </div>
    </Link>
  );
}
