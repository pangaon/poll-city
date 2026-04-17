"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Printer, ChevronRight, Package, Search, AlertTriangle, DollarSign, Clock } from "lucide-react";
import { Button, Badge, Card, CardContent, PageHeader, EmptyState } from "@/components/ui";
import { toast } from "sonner";

interface PrintJobRow {
  id: string;
  productType: string;
  title: string;
  quantity: number;
  status: string;
  deadline: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  createdAt: string;
  _count: { bids: number };
}

interface Props { campaignId: string; }

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  posted: "Posted",
  bidding: "Bidding",
  awarded: "Awarded",
  in_production: "In Production",
  quality_check: "Quality Check",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_VARIANTS: Record<string, "default" | "info" | "warning" | "success" | "danger"> = {
  draft: "default",
  posted: "info",
  bidding: "warning",
  awarded: "success",
  in_production: "info",
  quality_check: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
};

const PRODUCT_LABELS: Record<string, string> = {
  door_hanger: "Door Hangers",
  lawn_sign: "Lawn Signs",
  flyer: "Flyers",
  palm_card: "Palm Cards",
  mailer_postcard: "Postcards",
  banner: "Banners",
  button_pin: "Buttons",
  window_sign: "Window Clings",
  bumper_sticker: "Bumper Stickers",
  t_shirt: "T-Shirts",
  hat: "Hats",
  tote_bag: "Tote Bags",
  yard_stake: "Yard Stakes",
  table_cover: "Table Covers",
  lanyard: "Lanyards",
};

const ACTIVE_STATUSES = ["posted", "bidding", "awarded", "in_production", "quality_check", "shipped"];

const PAGE_SIZE = 20;

function deadlineSeverity(deadline: string | null): "none" | "urgent" | "overdue" {
  if (!deadline) return "none";
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 7) return "urgent";
  return "none";
}

export default function PrintJobsClient({ campaignId }: Props) {
  const [jobs, setJobs] = useState<PrintJobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(PAGE_SIZE) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/print/jobs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load jobs");
      setJobs(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, statusFilter]);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtered = search.trim()
    ? jobs.filter((j) => j.title.toLowerCase().includes(search.toLowerCase()) || PRODUCT_LABELS[j.productType]?.toLowerCase().includes(search.toLowerCase()))
    : jobs;

  // Derived stats
  const activeCount = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length;
  const draftCount = jobs.filter((j) => j.status === "draft").length;
  const urgentCount = jobs.filter((j) => {
    const sev = deadlineSeverity(j.deadline);
    return (sev === "urgent" || sev === "overdue") && j.status !== "delivered" && j.status !== "cancelled";
  }).length;
  const totalBudget = jobs.reduce((sum, j) => sum + (j.budgetMax ?? j.budgetMin ?? 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Print Jobs"
        description={`${total} job${total !== 1 ? "s" : ""}`}
        actions={
          <Link href="/print/jobs/new">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              New Job
            </Button>
          </Link>
        }
      />

      {/* Stats bar */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500 font-medium">Active</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Drafts</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{draftCount}</p>
          </div>
          <div className={`rounded-xl border p-3 ${urgentCount > 0 ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-white"}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${urgentCount > 0 ? "text-amber-500" : "text-gray-400"}`} />
              <span className="text-xs text-gray-500 font-medium">Urgent</span>
            </div>
            <p className={`text-xl font-bold ${urgentCount > 0 ? "text-amber-700" : "text-gray-900"}`}>{urgentCount}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-gray-500 font-medium">Budget</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{totalBudget > 0 ? `$${totalBudget.toLocaleString()}` : "—"}</p>
          </div>
        </div>
      )}

      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs…"
            className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "draft", "posted", "bidding", "awarded", "in_production", "quality_check", "shipped", "delivered", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs list */}
      <Card>
        {loading ? (
          <CardContent className="space-y-3 py-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </CardContent>
        ) : filtered.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={<Printer className="w-10 h-10" />}
              title={search ? "No matching jobs" : "No print jobs yet"}
              description={search ? "Try a different search term." : "Post your first job to get quotes from local print shops."}
              action={
                !search ? (
                  <Link href="/print/jobs/new">
                    <Button size="sm">
                      <Plus className="w-4 h-4" />
                      New Print Job
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((job) => {
              const severity = deadlineSeverity(job.deadline);
              const daysLeft = job.deadline
                ? Math.ceil((new Date(job.deadline).getTime() - Date.now()) / 86400000)
                : null;

              return (
                <Link key={job.id} href={`/print/jobs/${job.id}`} className="block hover:bg-gray-50 transition-colors">
                  <div className="px-6 py-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      severity === "overdue" ? "bg-red-50" : severity === "urgent" ? "bg-amber-50" : "bg-blue-50"
                    }`}>
                      {severity !== "none" && !["delivered", "cancelled"].includes(job.status)
                        ? <AlertTriangle className={`w-5 h-5 ${severity === "overdue" ? "text-red-500" : "text-amber-500"}`} />
                        : <Package className="w-5 h-5 text-blue-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-gray-900 truncate">{job.title}</p>
                        <Badge variant={STATUS_VARIANTS[job.status] ?? "default"}>
                          {STATUS_LABELS[job.status] ?? job.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{PRODUCT_LABELS[job.productType] ?? job.productType}</span>
                        <span>·</span>
                        <span>{job.quantity.toLocaleString()} units</span>
                        {job.deadline && (
                          <>
                            <span>·</span>
                            <span className={
                              severity === "overdue" ? "text-red-600 font-semibold" :
                              severity === "urgent" ? "text-amber-600 font-semibold" : ""
                            }>
                              {severity === "overdue"
                                ? `Overdue ${Math.abs(daysLeft!)}d`
                                : severity === "urgent"
                                ? `Due in ${daysLeft}d`
                                : `Due ${new Date(job.deadline).toLocaleDateString()}`}
                            </span>
                          </>
                        )}
                        {job._count.bids > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-blue-600 font-medium">{job._count.bids} bid{job._count.bids !== 1 ? "s" : ""}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {(job.budgetMin || job.budgetMax) && (
                      <div className="text-right text-xs text-gray-500 flex-shrink-0">
                        <p className="font-semibold text-gray-700">
                          {job.budgetMin && job.budgetMax
                            ? `$${job.budgetMin.toLocaleString()}–$${job.budgetMax.toLocaleString()}`
                            : job.budgetMax
                              ? `Budget $${job.budgetMax.toLocaleString()}`
                              : `From $${job.budgetMin!.toLocaleString()}`}
                        </p>
                        <p>budget</p>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
