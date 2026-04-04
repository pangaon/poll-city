"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Pencil, ChevronLeft, ChevronRight, BarChart3, Clock, Eye, EyeOff, Users } from "lucide-react";
import { Button, Card, CardContent, Input, PageHeader } from "@/components/ui";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

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

interface Props { campaignId: string; }

const pageSize = 20;

const TYPE_COLORS: Record<string, string> = {
  binary: "bg-blue-100 text-blue-700",
  multiple_choice: "bg-indigo-100 text-indigo-700",
  ranked: "bg-purple-100 text-purple-700",
  slider: "bg-cyan-100 text-cyan-700",
  swipe: "bg-pink-100 text-pink-700",
  image_swipe: "bg-rose-100 text-rose-700",
  emoji_react: "bg-amber-100 text-amber-700",
  priority_rank: "bg-violet-100 text-violet-700",
};

const GRADIENTS = [
  "from-blue-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-pink-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-indigo-600",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-blue-700",
];
function getGradient(id: string) {
  const sum = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return GRADIENTS[sum % GRADIENTS.length];
}

function StatusBadge({ endsAt, totalResponses }: { endsAt: string | null; totalResponses: number }) {
  if (!endsAt) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active
    </span>
  );
  const isEnded = new Date(endsAt) < new Date();
  return isEnded ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">Ended</span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
      <Clock className="w-3 h-3" />Closing
    </span>
  );
}

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
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(pageSize) });
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Polls"
        description="Create and manage polls to understand voter sentiment."
        actions={
          <Button onClick={() => router.push("/polls/new")}>
            <Plus className="w-4 h-4" /> New Poll
          </Button>
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
              onChange={e => setSearch(e.target.value)}
              placeholder="Search polls by question or region…"
            />
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {!loading && polls.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No polls yet</h3>
          <p className="text-gray-500 text-sm mb-6">Create your first poll to start gathering voter insights.</p>
          <Button onClick={() => router.push("/polls/new")}>
            <Plus className="w-4 h-4" /> Create Your First Poll
          </Button>
        </div>
      )}

      {/* Poll cards grid */}
      {(loading || polls.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-48" />
              ))
            : polls.map(poll => (
                <div
                  key={poll.id}
                  className="group rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                >
                  {/* Gradient stripe */}
                  <div className={`h-1.5 bg-gradient-to-r ${getGradient(poll.id)}`} />

                  <div className="p-5 flex-1 flex flex-col">
                    {/* Type + status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${TYPE_COLORS[poll.type] ?? "bg-gray-100 text-gray-600"}`}>
                        {poll.type.replace(/_/g, " ")}
                      </span>
                      <StatusBadge endsAt={poll.endsAt} totalResponses={poll.totalResponses} />
                    </div>

                    {/* Question */}
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-3 flex-1 mb-3">
                      {poll.question}
                    </h3>

                    {/* Options preview */}
                    {poll.options.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {poll.options.slice(0, 3).map(opt => (
                          <span key={opt.id} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-lg">
                            {opt.text}
                          </span>
                        ))}
                        {poll.options.length > 3 && (
                          <span className="text-xs text-gray-400">+{poll.options.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />{poll.totalResponses}
                        </span>
                        <span className="flex items-center gap-1">
                          {poll.visibility === "public" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {poll.visibility.replace("_", " ")}
                        </span>
                        <span>{formatDateTime(poll.createdAt)}</span>
                      </div>
                      <button
                        onClick={() => router.push(`/polls/new?edit=${poll.id}`)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total} polls
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(v => Math.max(1, v - 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(v => Math.min(totalPages, v + 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
