"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Clock, EyeOff, Users, Globe,
  Lock, ChevronLeft, ChevronRight, Vote, MoreVertical, Star,
  StarOff, Archive, ExternalLink, Copy, XCircle, Sparkles,
  Loader2, RefreshCw, CheckCircle, Pencil,
} from "lucide-react";
import { Button, Card, CardContent, FieldHelp, Input, PageHeader } from "@/components/ui";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import PollTicker from "@/components/polls/PollTicker";

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
  isFeatured: boolean;
  isActive: boolean;
}

interface AISuggestion {
  question: string;
  description: string;
  type: "binary" | "multiple_choice" | "slider" | "ranked";
  options?: string[];
  tags: string[];
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

/* ── Poll context menu ────────────────────────────────────────── */

function PollMenu({
  poll,
  onFeature,
  onArchive,
  onClose,
  onCopyLink,
  onLiveResults,
  onEdit,
}: {
  poll: PollRow;
  onFeature: () => void;
  onArchive: () => void;
  onClose: () => void;
  onCopyLink: () => void;
  onLiveResults: () => void;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const items = [
    {
      icon: Pencil,
      label: "Edit",
      onClick: () => { onEdit(); setOpen(false); },
    },
    {
      icon: poll.isFeatured ? StarOff : Star,
      label: poll.isFeatured ? "Unfeature" : "Feature",
      onClick: () => { onFeature(); setOpen(false); },
    },
    {
      icon: ExternalLink,
      label: "Live Results",
      onClick: () => { onLiveResults(); setOpen(false); },
    },
    {
      icon: Copy,
      label: "Copy Voter Link",
      onClick: () => { onCopyLink(); setOpen(false); },
    },
    {
      icon: XCircle,
      label: "Close Poll",
      onClick: () => { onClose(); setOpen(false); },
      danger: false,
    },
    {
      icon: Archive,
      label: "Archive",
      onClick: () => { onArchive(); setOpen(false); },
      danger: true,
    },
  ];

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -6 }}
            transition={spring}
            className="absolute right-0 top-9 z-50 w-44 bg-white border border-gray-100 rounded-2xl shadow-xl py-1.5 overflow-hidden"
          >
            {items.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                  item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── AI Suggest modal ─────────────────────────────────────────── */

function AISuggestModal({
  campaignId,
  onSelect,
  onClose,
}: {
  campaignId: string;
  onSelect: (s: AISuggestion) => void;
  onClose: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [source, setSource] = useState("");
  const [fetched, setFetched] = useState(false);

  async function fetchSuggestions() {
    setLoading(true);
    try {
      const res = await fetch("/api/polls/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() || undefined, region: "Toronto" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch suggestions");
      setSuggestions(data.data ?? []);
      setSource(data.source ?? "");
      setFetched(true);
    } catch (e) {
      toast.error((e as Error).message || "AI suggestion failed");
    } finally {
      setLoading(false);
    }
  }

  const TYPE_PILL: Record<string, string> = {
    binary: "bg-blue-100 text-blue-700",
    multiple_choice: "bg-indigo-100 text-indigo-700",
    slider: "bg-cyan-100 text-cyan-700",
    ranked: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${GREEN}20` }}>
              <Sparkles className="w-5 h-5" style={{ color: GREEN }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: NAVY }}>AI Poll Generator</h2>
              <p className="text-xs text-gray-500">Pulls from Canadian news headlines to suggest civic polls</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <div className="flex-1 relative">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Optional: focus on a topic — e.g. housing affordability, transit, climate..."
                className="w-full pr-8"
                onKeyDown={(e) => e.key === "Enter" && !loading && fetchSuggestions()}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <FieldHelp
                  content="Tell the AI what local issue to focus on. Leave blank and it will pull from today's Canadian headlines automatically."
                  example="housing affordability, protected bike lanes, downtown development"
                  tip="The more specific you are, the more relevant the poll suggestions."
                />
              </span>
            </div>
            <Button
              onClick={fetchSuggestions}
              disabled={loading}
              style={{ backgroundColor: GREEN }}
              className="min-w-[110px]"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating</>
              ) : fetched ? (
                <><RefreshCw className="w-4 h-4" /> Refresh</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate</>
              )}
            </Button>
          </div>
          {source && (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" /> {source}
            </p>
          )}
        </div>

        {/* Suggestions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!fetched && !loading && (
            <div className="text-center py-12">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm">Click Generate to pull AI-suggested polls from Canadian news.</p>
              <p className="text-gray-400 text-xs mt-1">Uses live CBC and Globe & Mail headlines when available.</p>
            </div>
          )}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Shimmer key={i} className="h-24" />)}
            </div>
          )}
          {!loading && suggestions.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="group border border-gray-100 rounded-2xl p-4 hover:border-[#1D9E75] hover:bg-emerald-50/40 transition-all cursor-pointer"
              onClick={() => onSelect(s)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_PILL[s.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {s.type.replace(/_/g, " ")}
                    </span>
                    {s.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{s.question}</p>
                  <p className="text-xs text-gray-500">{s.description}</p>
                  {s.options && s.options.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.options.slice(0, 3).map((o) => (
                        <span key={o} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-lg">
                          {o.length > 25 ? o.slice(0, 24) + "…" : o}
                        </span>
                      ))}
                      {s.options.length > 3 && <span className="text-xs text-gray-400">+{s.options.length - 3}</span>}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="text-xs font-medium text-[#1D9E75] opacity-0 group-hover:opacity-100 transition-opacity">
                    Use this →
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </motion.div>
    </div>
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
  const [showAI, setShowAI] = useState(false);

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

  useEffect(() => { loadPolls(); }, [loadPolls]);
  useEffect(() => { setPage(1); }, [search]);

  async function patchPoll(pollId: string, updates: Record<string, unknown>) {
    const res = await fetch(`/api/polls/${pollId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Update failed");
      return false;
    }
    return true;
  }

  async function handleFeature(poll: PollRow) {
    const ok = await patchPoll(poll.id, { isFeatured: !poll.isFeatured });
    if (ok) {
      toast.success(poll.isFeatured ? "Poll unfeatured" : "Poll featured");
      setPolls((prev) => prev.map((p) => p.id === poll.id ? { ...p, isFeatured: !p.isFeatured } : p));
    }
  }

  async function handleArchive(poll: PollRow) {
    const ok = await patchPoll(poll.id, { isActive: false });
    if (ok) {
      toast.success("Poll archived");
      setPolls((prev) => prev.filter((p) => p.id !== poll.id));
    }
  }

  async function handleClose(poll: PollRow) {
    const ok = await patchPoll(poll.id, { closeNow: true });
    if (ok) {
      toast.success("Poll closed");
      setPolls((prev) => prev.map((p) => p.id === poll.id ? { ...p, endsAt: new Date().toISOString() } : p));
    }
  }

  function handleCopyLink(poll: PollRow) {
    // Public / unlisted polls: voters go to the social page (no login required)
    // Campaign-only polls: share the campaign app URL (requires member login)
    const origin = window.location.origin;
    const url = poll.visibility === "campaign_only"
      ? `${origin}/polls/${poll.id}`
      : `${origin}/social/polls/${poll.id}`;
    navigator.clipboard.writeText(url);
    toast.success(poll.visibility === "campaign_only" ? "Campaign link copied" : "Voter link copied");
  }

  function handleAISelect(suggestion: AISuggestion) {
    setShowAI(false);
    // Build query params for the new poll wizard pre-filled with AI suggestion
    const params = new URLSearchParams({
      ai: "1",
      question: suggestion.question,
      description: suggestion.description,
      type: suggestion.type,
      tags: suggestion.tags.join(","),
    });
    if (suggestion.options?.length) params.set("options", suggestion.options.join("||"));
    router.push(`/polls/new?${params}`);
  }

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
          <div className="flex gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
              <Button
                variant="outline"
                onClick={() => setShowAI(true)}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-violet-500" />
                AI Suggest
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
              <Button onClick={() => router.push("/polls/new")} style={{ backgroundColor: GREEN }}>
                <Plus className="w-4 h-4" /> New Poll
              </Button>
            </motion.div>
          </div>
        }
      />

      {/* Live ticker */}
      <PollTicker campaignId={campaignId} className="mb-2" />

      {/* Search */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by question text, tag, or region (e.g. transit, Ward 12)..."
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
          <h3 className="text-lg font-semibold mb-1" style={{ color: NAVY }}>No polls yet</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Polls let you gauge voter sentiment on local issues, test campaign messaging, and prioritize platform topics. Use AI Suggest to generate poll ideas from today&apos;s news.
          </p>
          <div className="flex items-center justify-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
              <Button variant="outline" onClick={() => setShowAI(true)}>
                <Sparkles className="w-4 h-4 text-violet-500" /> AI Suggest
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
              <Button onClick={() => router.push("/polls/new")} style={{ backgroundColor: GREEN }}>
                <Plus className="w-4 h-4" /> Create Your First Poll
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Poll cards grid */}
      {(loading || polls.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} className="h-52" />)
            : polls.map((poll, i) => (
                <motion.div
                  key={poll.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  whileHover={{ scale: 1.015, y: -2 }}
                  className="group rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col relative"
                >
                  {/* Gradient header */}
                  <div
                    className="h-2"
                    style={{ background: `linear-gradient(to right, ${NAVY}, ${GREEN})` }}
                  />

                  {/* Featured star */}
                  {poll.isFeatured && (
                    <div className="absolute top-4 left-4">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col">
                    {/* Type + status + menu */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                            TYPE_COLORS[poll.type] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {poll.type.replace(/_/g, " ")}
                        </span>
                        <StatusBadge endsAt={poll.endsAt} />
                      </div>
                      <PollMenu
                        poll={poll}
                        onFeature={() => handleFeature(poll)}
                        onArchive={() => handleArchive(poll)}
                        onClose={() => handleClose(poll)}
                        onCopyLink={() => handleCopyLink(poll)}
                        onLiveResults={() => router.push(`/polls/${poll.id}/live`)}
                        onEdit={() => router.push(`/polls/${poll.id}`)}
                      />
                    </div>

                    {/* Question — clickable to navigate */}
                    <h3
                      className="font-semibold text-sm leading-snug line-clamp-3 flex-1 mb-3 cursor-pointer hover:text-[#1D9E75] transition-colors"
                      style={{ color: NAVY }}
                      onClick={() => router.push(`/polls/${poll.id}`)}
                    >
                      {poll.question}
                    </h3>

                    {/* Options preview */}
                    {poll.options.length > 0 && (
                      <div
                        className="flex flex-wrap gap-1.5 mb-3 cursor-pointer"
                        onClick={() => router.push(`/polls/${poll.id}`)}
                      >
                        {poll.options.slice(0, 3).map((opt) => (
                          <span
                            key={opt.id}
                            className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-lg"
                          >
                            {opt.text}
                          </span>
                        ))}
                        {poll.options.length > 3 && (
                          <span className="text-xs text-gray-400">+{poll.options.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div
                      className="flex items-center gap-3 pt-3 border-t border-gray-50 text-xs text-gray-400 cursor-pointer"
                      onClick={() => router.push(`/polls/${poll.id}`)}
                    >
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
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      )}

      {/* AI Suggest modal */}
      <AnimatePresence>
        {showAI && (
          <AISuggestModal
            campaignId={campaignId}
            onSelect={handleAISelect}
            onClose={() => setShowAI(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
