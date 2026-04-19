"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, MessageSquare, Megaphone, CheckCircle, XCircle,
  Globe, Link2, RefreshCw, Shield, Star, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

interface LinkedCampaign {
  id: string;
  name: string;
  candidateName: string | null;
  isActive: boolean;
}

interface Official {
  id: string;
  name: string;
  title: string;
  district: string;
  isActive: boolean;
  isClaimed: boolean;
  subscriptionStatus: string | null;
  website: string | null;
  _count: { follows: number; questions: number; politicianPosts: number; campaigns: number };
  linkedCampaign: LinkedCampaign | null;
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", color)}>
      {children}
    </span>
  );
}

export default function SocialOpsClient() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [patching, setPatching] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "claimed" | "linked">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ops/social/officials");
      const json = await res.json();
      setOfficials(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function patch(id: string, update: Record<string, unknown>) {
    setPatching(id);
    try {
      const res = await fetch("/api/ops/social/officials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...update }),
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setOfficials((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...json.data } : o))
      );
      toast.success("Updated");
    } catch {
      toast.error("Update failed");
    } finally {
      setPatching(null);
    }
  }

  const filtered = officials.filter((o) => {
    if (filter === "active") return o.isActive;
    if (filter === "inactive") return !o.isActive;
    if (filter === "claimed") return o.isClaimed;
    if (filter === "linked") return !!o.linkedCampaign;
    return true;
  });

  // Summary stats
  const total = officials.length;
  const active = officials.filter((o) => o.isActive).length;
  const claimed = officials.filter((o) => o.isClaimed).length;
  const linked = officials.filter((o) => !!o.linkedCampaign).length;
  const totalFollowers = officials.reduce((s, o) => s + o._count.follows, 0);
  const totalQuestions = officials.reduce((s, o) => s + o._count.questions, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Poll City Social — Officials</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage the Toronto City Council on Poll City Social. Control visibility, verify profiles, and see campaign conversions.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total", value: total, icon: Users, color: "text-gray-600" },
          { label: "Active", value: active, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Claimed", value: claimed, icon: Shield, color: "text-blue-600" },
          { label: "Linked ($$)", value: linked, icon: Link2, color: "text-purple-600" },
          { label: "Followers", value: totalFollowers, icon: Star, color: "text-amber-600" },
          { label: "Questions", value: totalQuestions, icon: MessageSquare, color: "text-indigo-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-3 text-center shadow-sm">
            <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter + refresh */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(["all", "active", "inactive", "claimed", "linked"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize",
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {f === "linked" ? "Linked ($$)" : f}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={cn("w-4 h-4 text-gray-500", loading && "animate-spin")} />
        </button>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} official{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-500">No officials match this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <motion.div
              key={o.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-white rounded-2xl border p-4 shadow-sm transition-opacity",
                !o.isActive && "opacity-50",
                patching === o.id && "pointer-events-none opacity-60"
              )}
            >
              <div className="flex items-start gap-4 flex-wrap">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: NAVY }}
                >
                  {o.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 text-sm">{o.name}</p>
                    {o.subscriptionStatus === "verified" && (
                      <Badge color="bg-blue-50 text-blue-600 border border-blue-200">
                        <CheckCircle className="w-2.5 h-2.5" /> Verified
                      </Badge>
                    )}
                    {o.isClaimed && (
                      <Badge color="bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Shield className="w-2.5 h-2.5" /> Claimed
                      </Badge>
                    )}
                    {o.linkedCampaign && (
                      <Badge color="bg-purple-50 text-purple-700 border border-purple-200">
                        <Link2 className="w-2.5 h-2.5" /> Paying
                      </Badge>
                    )}
                    {!o.isActive && (
                      <Badge color="bg-red-50 text-red-600 border border-red-200">
                        <XCircle className="w-2.5 h-2.5" /> Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{o.title} · {o.district}</p>

                  {/* Linked campaign */}
                  {o.linkedCampaign && (
                    <p className="text-xs text-purple-600 mt-0.5 font-medium">
                      → {o.linkedCampaign.candidateName ?? o.linkedCampaign.name} campaign
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Star className="w-3 h-3 text-amber-400" /> {o._count.follows} followers
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MessageSquare className="w-3 h-3 text-blue-400" /> {o._count.questions} questions
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Megaphone className="w-3 h-3 text-gray-400" /> {o._count.politicianPosts} posts
                    </span>
                    {o.website && (
                      <a
                        href={o.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                      >
                        <Globe className="w-3 h-3" /> Website
                      </a>
                    )}
                    <Link
                      href={`/social/politicians/${o.id}`}
                      target="_blank"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      View public →
                    </Link>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  {/* Verified toggle */}
                  <button
                    onClick={() =>
                      patch(o.id, {
                        subscriptionStatus: o.subscriptionStatus === "verified" ? "free" : "verified",
                      })
                    }
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors",
                      o.subscriptionStatus === "verified"
                        ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        : "border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
                    )}
                    title={o.subscriptionStatus === "verified" ? "Remove verification" : "Mark verified"}
                  >
                    {o.subscriptionStatus === "verified" ? "✓ Verified" : "Verify"}
                  </button>

                  {/* Claimed toggle */}
                  <button
                    onClick={() => patch(o.id, { isClaimed: !o.isClaimed })}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors",
                      o.isClaimed
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600"
                    )}
                  >
                    {o.isClaimed ? "Claimed" : "Mark Claimed"}
                  </button>

                  {/* Active toggle */}
                  <button
                    onClick={() => patch(o.id, { isActive: !o.isActive })}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors",
                      o.isActive
                        ? "border-red-200 text-red-600 hover:bg-red-50"
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    )}
                  >
                    {o.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
