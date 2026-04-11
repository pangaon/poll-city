"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SignpostBig, Clock, CheckCircle2, Trash2, ChevronLeft,
  ChevronRight, RefreshCw, User2, MapPin, AlertTriangle,
  Search, SlidersHorizontal, ArrowLeft,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState, FormField,
  Input, PageHeader, Select, Spinner,
} from "@/components/ui";
import { toast } from "sonner";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type SignStatus = "requested" | "scheduled" | "installed" | "removed" | "declined";

interface FollowUpSnap {
  id: string;
  fieldAttempt: {
    id: string;
    attemptedAt: string;
    attemptedBy: { id: string; name: string };
  } | null;
}

interface SignRow {
  id: string;
  address1: string;
  city: string | null;
  postalCode: string | null;
  signType: string;
  status: SignStatus;
  quantity: number;
  notes: string | null;
  photoUrl: string | null;
  requestedAt: string;
  installedAt: string | null;
  removedAt: string | null;
  isOpponent: boolean;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    address1: string | null;
    city: string | null;
    postalCode: string | null;
  } | null;
  assignedUser: { id: string; name: string } | null;
  followUpActions: FollowUpSnap[];
}

interface Summary {
  requested?: number;
  scheduled?: number;
  installed?: number;
  removed?: number;
  declined?: number;
}

type TabView = "queue" | "board";

interface Props {
  campaignId: string;
  campaignName: string;
  teamMembers: { id: string; name: string }[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<SignStatus, { label: string; badge: "default" | "success" | "warning" | "danger" | "info" }> = {
  requested: { label: "Requested", badge: "warning" },
  scheduled: { label: "Scheduled", badge: "info" },
  installed: { label: "Installed", badge: "success" },
  removed:   { label: "Removed",   badge: "default" },
  declined:  { label: "Declined",  badge: "danger" },
};

const SIGN_TYPE_LABEL: Record<string, string> = {
  standard: "Lawn",
  large: "Large",
  window: "Window",
};

const PAGE_SIZE = 25;

const SLIDE = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
  transition: { type: "spring" as const, stiffness: 300, damping: 30 },
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className ?? "h-4 w-full"}`} />;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SignsFieldClient({ campaignId, teamMembers }: Props) {
  const [tab, setTab] = useState<TabView>("queue");
  const [signs, setSigns] = useState<SignRow[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [tab, statusFilter, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        campaignId,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (tab === "queue") params.set("queue", "1");
      if (tab === "board" && statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/field/signs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setSigns(data.data ?? []);
      setTotal(data.total ?? 0);
      setSummary(data.summary ?? {});
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [campaignId, tab, page, statusFilter, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const updateSign = useCallback(async (signId: string, patch: Record<string, unknown>) => {
    setUpdatingId(signId);
    try {
      const res = await fetch(`/api/field/signs/${signId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setSigns((prev) => prev.map((s) => (s.id === signId ? { ...s, ...data.data } : s)));
      setSummary((prev) => {
        // Recalculate summary from updated list
        return prev; // will refresh on next load
      });
      toast.success("Sign updated");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const totalInstalled = summary.installed ?? 0;
  const totalRequested = summary.requested ?? 0;
  const totalScheduled = summary.scheduled ?? 0;
  const totalRemoved = summary.removed ?? 0;

  // ── Stats strip ────────────────────────────────────────────────────────────

  function StatsStrip() {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Requested",  value: totalRequested,  color: "text-amber-600",  icon: <AlertTriangle className="h-5 w-5 text-amber-500" /> },
          { label: "Scheduled",  value: totalScheduled,  color: "text-blue-600",   icon: <Clock className="h-5 w-5 text-blue-500" /> },
          { label: "Installed",  value: totalInstalled,  color: "text-green-600",  icon: <CheckCircle2 className="h-5 w-5 text-green-500" /> },
          { label: "Removed",    value: totalRemoved,    color: "text-gray-500",   icon: <Trash2 className="h-5 w-5 text-gray-400" /> },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              {s.icon}
              <div>
                <div className={`text-2xl font-bold leading-none ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // ── Queue view: pending sign requests from canvassers ─────────────────────

  function QueueView() {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex gap-4 p-4">
                <Shimmer className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Shimmer className="h-4 w-1/3" />
                  <Shimmer className="h-3 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (signs.length === 0) {
      return (
        <EmptyState
          icon={<CheckCircle2 className="h-8 w-8 text-green-500" />}
          title="Queue is clear"
          description="No pending sign requests from canvassers. New requests appear here automatically when a canvasser logs sign_requested on a door."
        />
      );
    }

    return (
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {signs.map((sign) => {
            const requester = sign.followUpActions[0]?.fieldAttempt?.attemptedBy;
            const requestedAt = sign.followUpActions[0]?.fieldAttempt?.attemptedAt ?? sign.requestedAt;
            const isUpdating = updatingId === sign.id;
            return (
              <motion.div key={sign.id} {...SLIDE}>
                <Card className="border-l-4 border-l-amber-400">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      {/* Address block */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900 leading-snug">{sign.address1}</p>
                            {(sign.city || sign.postalCode) && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {[sign.city, sign.postalCode].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                        {sign.contact && (
                          <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-600">
                            <User2 className="h-3.5 w-3.5 text-gray-400" />
                            {sign.contact.firstName} {sign.contact.lastName}
                            {sign.contact.phone && (
                              <span className="text-gray-400 text-xs">· {sign.contact.phone}</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>{SIGN_TYPE_LABEL[sign.signType] ?? sign.signType} sign × {sign.quantity}</span>
                          {requester && (
                            <span>· Requested by <span className="font-medium text-gray-600">{requester.name}</span> {relTime(requestedAt)}</span>
                          )}
                        </div>
                        {sign.notes && (
                          <p className="mt-2 text-sm text-gray-500 italic">{sign.notes}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdating}
                          onClick={() => updateSign(sign.id, { status: "scheduled" })}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          {isUpdating ? <Spinner className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          <span className="ml-1.5">Schedule</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdating}
                          onClick={() => updateSign(sign.id, { status: "installed" })}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          {isUpdating ? <Spinner className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          <span className="ml-1.5">Installed</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isUpdating}
                          onClick={() => updateSign(sign.id, { status: "declined" })}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  }

  // ── Board view: full sign status table ────────────────────────────────────

  function BoardView() {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Search address, contact, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
          <Button variant="ghost" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Shimmer className="h-5 w-1/3" />
                    <Shimmer className="h-5 w-1/6" />
                    <Shimmer className="h-5 w-1/6" />
                    <Shimmer className="h-5 w-1/6" />
                  </div>
                ))}
              </div>
            ) : signs.length === 0 ? (
              <EmptyState
                icon={<SignpostBig className="h-8 w-8" />}
                title="No signs yet"
                description="Sign requests from canvassers appear here automatically."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                      <th className="px-4 py-3">Address</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Assignee</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <AnimatePresence initial={false}>
                    <tbody>
                      {signs.map((sign) => {
                        const isUpdating = updatingId === sign.id;
                        return (
                          <motion.tr
                            key={sign.id}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="border-b last:border-0 hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{sign.address1}</div>
                              {(sign.city || sign.postalCode) && (
                                <div className="text-xs text-gray-400">{[sign.city, sign.postalCode].filter(Boolean).join(", ")}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {sign.contact
                                ? `${sign.contact.firstName} ${sign.contact.lastName}`
                                : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {SIGN_TYPE_LABEL[sign.signType] ?? sign.signType} × {sign.quantity}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={STATUS_META[sign.status].badge}>
                                {STATUS_META[sign.status].label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {sign.assignedUser?.name ?? <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {sign.status === "requested" && (
                                  <Button
                                    size="sm" variant="ghost"
                                    disabled={isUpdating}
                                    onClick={() => updateSign(sign.id, { status: "scheduled" })}
                                    title="Mark scheduled"
                                    className="text-blue-500 hover:text-blue-700 text-xs"
                                  >
                                    Schedule
                                  </Button>
                                )}
                                {(sign.status === "requested" || sign.status === "scheduled") && (
                                  <Button
                                    size="sm" variant="ghost"
                                    disabled={isUpdating}
                                    onClick={() => updateSign(sign.id, { status: "installed" })}
                                    title="Confirm installed"
                                    className="text-green-600 hover:text-green-800 text-xs"
                                  >
                                    {isUpdating ? <Spinner className="h-3 w-3" /> : "Installed"}
                                  </Button>
                                )}
                                {sign.status === "installed" && (
                                  <Button
                                    size="sm" variant="ghost"
                                    disabled={isUpdating}
                                    onClick={() => updateSign(sign.id, { status: "removed" })}
                                    title="Confirm removed"
                                    className="text-amber-600 hover:text-amber-800 text-xs"
                                  >
                                    Remove
                                  </Button>
                                )}
                                {!["installed", "removed", "declined"].includes(sign.status) && (
                                  <Button
                                    size="sm" variant="ghost"
                                    disabled={isUpdating}
                                    onClick={() => updateSign(sign.id, { status: "declined" })}
                                    title="Decline"
                                    className="text-red-400 hover:text-red-600 text-xs"
                                  >
                                    Decline
                                  </Button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </AnimatePresence>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
            <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>{page} / {pages}</span>
            <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/field-ops" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <PageHeader
          title="Sign Operations"
          description="Sign requests from canvassers, crew assignments, and installation tracking."
          actions={
            <Button variant="ghost" size="sm" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          }
        />
      </div>

      <StatsStrip />

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {[
            { key: "queue" as TabView, label: "Sign Queue", icon: <AlertTriangle className="h-4 w-4" />, desc: "Pending requests from canvassers" },
            { key: "board" as TabView, label: "Sign Board",  icon: <SlidersHorizontal className="h-4 w-4" />, desc: "All signs — filter by status" },
          ].map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-[#0A2342] text-[#0A2342]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className={isActive ? "text-[#0A2342]" : "text-gray-400"}>{t.icon}</span>
                {t.label}
                {t.key === "queue" && totalRequested > 0 && (
                  <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                    {totalRequested}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === "queue" && (
          <motion.div key="queue" {...SLIDE}>
            <FormField label="">
              <Input
                placeholder="Search address, contact…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </FormField>
            <div className="mt-3">
              <QueueView />
            </div>
          </motion.div>
        )}
        {tab === "board" && (
          <motion.div key="board" {...SLIDE}>
            <BoardView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
