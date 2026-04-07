"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Search, BarChart3, Clock, Eye, EyeOff, Users, Globe,
  Lock, ChevronLeft, ChevronRight, Vote,
} from "lucide-react";
import { Button, Card, CardContent, Input, PageHeader } from "@/components/ui";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

/* ── Types ────────────────────────────────────────────────────── */

interface PollRow {
  id: string;
  question: string;
  description: string | null;
  type: string;
  visibility: string;
  targetRegion: string | null;
  totalResponses: number;
  createdAt: string;
  endsAt: string | null;
  tags: string[];
  options: { id: string; text: string }[];
}

interface Props {
  campaignId: string;
}

/* ── Constants ────────────────────────────────────────────────── */

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const pageSize = 20;
const spring = { type: "spring" as const, stiffness: 300, damping: 24 };

const TYPE_COLORS: Record<string, string> = {
  binary: "bg-blue-100 text-blue-700",
  multiple_choice: "bg-indigo-100 text-indigo-700",
  ranked: "bg-purple-100 text-purple-700",
  slider: "bg-cyan-100 text-cyan-700",
  swipe: "bg-pink-100 text-pink-700",
  image_swipe: "bg-rose-100 text-rose-700",
  flash_poll: "bg-amber-100 text-amber-700",
  emoji_react: "bg-amber-100 text-amber-700",
  priority_rank: "bg-violet-100 text-violet-700",
};

/* ── Shimmer ──────────────────────────────────────────────────── */

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gray-100 ${className ?? ""}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

/* ── Status badge ─────────────────────────────────────────────── */

function StatusBadge({ endsAt }: { endsAt: string | null }) {
  if (!endsAt)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    );
  const isEnded = new Date(endsAt) < new Date();
  return isEnded ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
      Ended
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
      <Clock className="w-3 h-3" />
      Closing
    </span>
  );
}

/* ── Main component ───────────────────────────────────────────── */

export default function PollsClient({ campaignId }: Props) {
  const router = useRouter();
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const loadPolls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        campaignId,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/polls?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load polls");
      setPolls(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      toast.error((error as Error).message || "Unable to load polls");
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, search]);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <PageHeader
        title="Polls"
        description="Create and manage polls to understand voter sentiment."
        actions={
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
            <Button onClick={() => router.push("/polls/new")} style={{ backgroundColor: GREEN }}>
              <Plus className="w-4 h-4" /> New Poll
            </Button>
          </motion.div>
        }
      />

      {/* Search */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search polls by question or region..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {!loading && polls.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${NAVY}10` }}
          >
            <Vote className="w-8 h-8" style={{ color: NAVY }} />
          </div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: NAVY }}>
            No polls yet
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            Create your first poll to start gathering voter insights.
          </p>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
            <Button onClick={() => router.push("/polls/new")} style={{ backgroundColor: GREEN }}>
              <Plus className="w-4 h-4" /> Create Your First Poll
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* Poll cards grid */}
      {(loading || polls.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Shimmer key={i} className="h-52" />
              ))
            : polls.map((poll, i) => (
                <motion.div
                  key={poll.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push(`/polls/${poll.id}`)}
                  className="group rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col cursor-pointer"
                >
                  {/* Gradient header */}
                  <div
                    className="h-2"
                    style={{
                      background: `linear-gradient(to right, ${NAVY}, ${GREEN})`,
                    }}
                  />

                  <div className="p-5 flex-1 flex flex-col">
                    {/* Type + status */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                          TYPE_COLORS[poll.type] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {poll.type.replace(/_/g, " ")}
                      </span>
                      <StatusBadge endsAt={poll.endsAt} />
                    </div>

                    {/* Question */}
                    <h3
                      className="font-semibold text-sm leading-snug line-clamp-3 flex-1 mb-3"
                      style={{ color: NAVY }}
                    >
                      {poll.question}
                    </h3>

                    {/* Options preview */}
                    {poll.options.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {poll.options.slice(0, 3).map((opt) => (
                          <span
                            key={opt.id}
                            className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-lg"
                          >
                            {opt.text}
                          </span>
                        ))}
                        {poll.options.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{poll.options.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {poll.totalResponses}
                      </span>
                      <span className="flex items-center gap-1">
                        {poll.visibility === "public" ? (
                          <Globe className="w-3.5 h-3.5" />
                        ) : poll.visibility === "campaign_only" ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                        {poll.visibility.replace("_", " ")}
                      </span>
                      <span>{formatDateTime(poll.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {Math.min((page - 1) * pageSize + 1, total)}–
            {Math.min(page * pageSize, total)} of {total} polls
          </p>
          <div className="flex gap-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((v) => Math.max(1, v - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
