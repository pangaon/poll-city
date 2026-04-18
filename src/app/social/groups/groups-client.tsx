"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Home, Users, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GREEN = "#1D9E75";
const NAVY = "#0A2342";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

type CivicGroupTopic = "housing" | "transit" | "parks" | "safety" | "environment" | "budget" | "general";

interface Group {
  id: string;
  name: string;
  description: string | null;
  topic: CivicGroupTopic;
  municipality: string | null;
  memberCount: number;
  isJoined: boolean;
}

const TOPIC_CONFIG: Record<CivicGroupTopic, { emoji: string; color: string; bg: string }> = {
  housing:     { emoji: "🏠", color: "text-orange-700", bg: "bg-orange-50" },
  transit:     { emoji: "🚌", color: "text-blue-700",   bg: "bg-blue-50" },
  parks:       { emoji: "🌳", color: "text-emerald-700", bg: "bg-emerald-50" },
  safety:      { emoji: "🛡️", color: "text-red-700",    bg: "bg-red-50" },
  environment: { emoji: "🌱", color: "text-green-700",  bg: "bg-green-50" },
  budget:      { emoji: "💰", color: "text-amber-700",  bg: "bg-amber-50" },
  general:     { emoji: "🏛️", color: "text-gray-700",   bg: "bg-gray-50" },
};

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-200", className)} />;
}

export default function GroupsClient() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/social/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleJoin(group: Group) {
    if (!session?.user) {
      toast.error("Sign in to join groups");
      return;
    }
    setJoiningId(group.id);
    try {
      const method = group.isJoined ? "DELETE" : "POST";
      const res = await fetch(`/api/social/groups/${group.id}/join`, { method });
      if (!res.ok) throw new Error();
      setGroups((prev) =>
        prev.map((g) =>
          g.id === group.id
            ? { ...g, isJoined: !g.isJoined, memberCount: g.memberCount + (g.isJoined ? -1 : 1) }
            : g
        )
      );
      toast.success(group.isJoined ? "Left group" : `Joined ${group.name}`);
    } catch {
      toast.error("Failed to update membership");
    } finally {
      setJoiningId(null);
    }
  }

  const joined = groups.filter((g) => g.isJoined);
  const available = groups.filter((g) => !g.isJoined);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY}, #143A6B)` }} className="px-5 pt-10 pb-6 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Home className="w-4 h-4 text-blue-300" />
          <span className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Interest Groups</span>
        </div>
        <h1 className="text-xl font-bold">Civic Groups</h1>
        <p className="text-blue-200 text-sm mt-1">Join groups to follow issues that matter to you.</p>
      </div>

      <div className="px-4 py-4 space-y-5 max-w-2xl mx-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-24 w-full" />
          ))
        ) : (
          <>
            {/* Joined groups */}
            {joined.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Your Groups</p>
                <div className="space-y-3">
                  {joined.map((g, i) => (
                    <GroupCard key={g.id} group={g} index={i} onToggle={() => toggleJoin(g)} joining={joiningId === g.id} />
                  ))}
                </div>
              </section>
            )}

            {/* Available groups */}
            <section>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                {joined.length > 0 ? "More Groups" : "All Groups"}
              </p>
              {available.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Home className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">You have joined all available groups.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {available.map((g, i) => (
                    <GroupCard key={g.id} group={g} index={i} onToggle={() => toggleJoin(g)} joining={joiningId === g.id} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function GroupCard({
  group: g,
  index,
  onToggle,
  joining,
}: {
  group: Group;
  index: number;
  onToggle: () => void;
  joining: boolean;
}) {
  const cfg = TOPIC_CONFIG[g.topic] ?? TOPIC_CONFIG.general;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: index * 0.04 }}
      className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-4"
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0", cfg.bg)}>
        {cfg.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{g.name}</p>
        {g.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{g.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
            {g.topic}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-0.5">
            <Users className="w-3 h-3" />
            {g.memberCount.toLocaleString()}
          </span>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={joining}
        className={cn(
          "flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[36px] disabled:opacity-50",
          g.isJoined
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "text-white"
        )}
        style={!g.isJoined ? { background: GREEN } : undefined}
      >
        {joining ? "..." : g.isJoined ? (
          <><Check className="w-3.5 h-3.5" /> Joined</>
        ) : (
          <>Join <ArrowRight className="w-3.5 h-3.5" /></>
        )}
      </button>
    </motion.div>
  );
}
