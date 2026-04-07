"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Plus,
  Upload,
  Sparkles,
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  Copy,
  Pencil,
  Archive,
  MoreHorizontal,
  X,
  ExternalLink,
  BookOpen,
  Users,
  MessageCircle,
  Vote,
  DollarSign,
  Megaphone,
  UserCircle,
  LayoutTemplate,
  Lock,
  Crown,
  Paintbrush,
  Newspaper,
  Share2,
  Film,
  Calendar,
  ChevronRight,
  FolderOpen,
  Grid3X3,
  List,
  Clock,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Category =
  | "all"
  | "templates"
  | "canvassing"
  | "election-day"
  | "gotv"
  | "finance"
  | "comms"
  | "candidate"
  | "volunteers"
  | "premium";

type ResourceFormat = "html" | "csv";

interface Resource {
  slug: string;
  title: string;
  description: string;
  category: Category;
  format: ResourceFormat;
  icon: React.ComponentType<{ className?: string }>;
  updatedAt: string;
}

interface PremiumTool {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  requiresPlan: "starter" | "pro" | "official" | "command";
}

interface Props {
  campaignId: string;
  campaignName: string;
  plan: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const PLAN_RANK: Record<string, number> = {
  free_trial: 0,
  starter: 1,
  pro: 2,
  official: 3,
  command: 4,
};

const CATEGORIES: Array<{ id: Category; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "all", label: "All Resources", icon: Grid3X3 },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "canvassing", label: "Canvassing", icon: MessageCircle },
  { id: "election-day", label: "Election Day", icon: Vote },
  { id: "gotv", label: "GOTV", icon: Megaphone },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "comms", label: "Communications", icon: Share2 },
  { id: "candidate", label: "Candidate", icon: UserCircle },
  { id: "volunteers", label: "Volunteers", icon: Users },
  { id: "premium", label: "Pro Tools", icon: Crown },
];

const RESOURCES: Resource[] = [
  { slug: "volunteer-signup", title: "Volunteer Sign-Up Sheet", description: "Collect contact info, availability, and skills from new volunteers", category: "volunteers", format: "html", icon: Users, updatedAt: "2026-03-15" },
  { slug: "volunteer-certificate", title: "Volunteer Certificate", description: "Official certificate of service for campaign volunteers", category: "volunteers", format: "html", icon: FileText, updatedAt: "2026-03-15" },
  { slug: "canvasser-checklist", title: "Canvasser Pre-Shift Checklist", description: "Everything a canvasser needs before hitting the doors", category: "canvassing", format: "html", icon: MessageCircle, updatedAt: "2026-03-20" },
  { slug: "door-knock-codes", title: "Door-Knock Result Codes", description: "Standard result codes and their meaning for door-to-door", category: "canvassing", format: "html", icon: BookOpen, updatedAt: "2026-03-20" },
  { slug: "script-supporter", title: "Script — Confirmed Supporter", description: "Door-knock script for voters already identified as supporters", category: "canvassing", format: "html", icon: FileText, updatedAt: "2026-03-20" },
  { slug: "script-persuadable", title: "Script — Persuadable Voter", description: "Door-knock script for undecided or swing voters", category: "canvassing", format: "html", icon: FileText, updatedAt: "2026-03-20" },
  { slug: "script-opposition", title: "Script — Opposition", description: "Brief, respectful script for known opposition voters", category: "canvassing", format: "html", icon: FileText, updatedAt: "2026-03-20" },
  { slug: "election-day-checklist", title: "Election Day Hour-by-Hour", description: "Full timeline from 6am to 10pm with tasks and checkpoints", category: "election-day", format: "html", icon: Vote, updatedAt: "2026-03-25" },
  { slug: "scrutineers-guide", title: "Scrutineer's Guide", description: "Complete guide for poll watchers — rules, procedures, escalation", category: "election-day", format: "html", icon: BookOpen, updatedAt: "2026-03-25" },
  { slug: "poll-captain-handbook", title: "Poll Captain Handbook", description: "Manage one polling location from open to close", category: "election-day", format: "html", icon: BookOpen, updatedAt: "2026-03-25" },
  { slug: "gotv-phone-script", title: "GOTV Phone Script", description: "Election day phone script — rides, polling info, turnout push", category: "gotv", format: "html", icon: Megaphone, updatedAt: "2026-03-28" },
  { slug: "donation-pledge", title: "Donation Pledge Card", description: "Printable pledge card for in-person fundraising", category: "finance", format: "html", icon: DollarSign, updatedAt: "2026-03-10" },
  { slug: "donation-receipt", title: "Donation Receipt (Ontario)", description: "Official donation receipt compliant with Ontario Election Finances Act", category: "finance", format: "html", icon: FileText, updatedAt: "2026-03-10" },
  { slug: "expense-tracker", title: "Expense Tracker", description: "CSV spreadsheet for logging campaign expenses by category", category: "finance", format: "csv", icon: FileSpreadsheet, updatedAt: "2026-03-10" },
  { slug: "finance-checklist", title: "Finance Checklist", description: "CFO appointment through final reporting — full compliance checklist", category: "finance", format: "html", icon: DollarSign, updatedAt: "2026-03-10" },
  { slug: "social-calendar", title: "Social Calendar", description: "CSV template for planning social media posts across platforms", category: "comms", format: "csv", icon: Calendar, updatedAt: "2026-03-18" },
  { slug: "press-release", title: "Press Release Template", description: "Standard press release format with placeholder sections", category: "comms", format: "html", icon: Newspaper, updatedAt: "2026-03-18" },
  { slug: "campaign-bio", title: "Candidate Bio", description: "Structured template for drafting your official candidate biography", category: "candidate", format: "html", icon: UserCircle, updatedAt: "2026-03-12" },
];

const PREMIUM_TOOLS: PremiumTool[] = [
  { id: "ai-creator", title: "AI Content Creator", description: "Generate press releases, scripts, emails, and social calendars with Adoni AI", icon: Sparkles, href: "/resources/ai-creator", requiresPlan: "starter" },
  { id: "social-pack", title: "Social Media Pack Builder", description: "Create a week of branded social posts across all platforms", icon: Share2, href: "/resources/ai-creator", requiresPlan: "pro" },
  { id: "video-script", title: "Video Script Generator", description: "AI-written video scripts for campaign ads and social clips", icon: Film, href: "/resources/ai-creator", requiresPlan: "pro" },
  { id: "brand-kit", title: "Brand Kit Studio", description: "Design system for your campaign — colors, fonts, logo guidelines", icon: Paintbrush, href: "/settings/brand", requiresPlan: "starter" },
  { id: "print-marketplace", title: "Print Marketplace", description: "Design and order lawn signs, door hangers, flyers, and palm cards", icon: LayoutTemplate, href: "/print", requiresPlan: "starter" },
  { id: "flyer-builder", title: "Flyer & Pamphlet Builder", description: "Drag-and-drop builder for print-ready campaign materials", icon: FileText, href: "/print", requiresPlan: "pro" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function planLabel(plan: string): string {
  const map: Record<string, string> = {
    free_trial: "Free Trial",
    starter: "Starter",
    pro: "Pro",
    official: "Official",
    command: "Command",
  };
  return map[plan] ?? plan;
}

function hasPlan(userPlan: string, required: string): boolean {
  return (PLAN_RANK[userPlan] ?? 0) >= (PLAN_RANK[required] ?? 0);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ResourceLibraryClient({ campaignId, campaignName, plan }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const filteredResources = useMemo(() => {
    let filtered = RESOURCES;
    if (activeCategory !== "all" && activeCategory !== "templates" && activeCategory !== "premium") {
      filtered = filtered.filter((r) => r.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [activeCategory, searchQuery]);

  const openPreview = useCallback(
    async (resource: Resource) => {
      setPreviewResource(resource);
      setPreviewHtml(null);
      if (resource.format === "html") {
        setPreviewLoading(true);
        try {
          const res = await fetch(
            `/api/resources/templates/${resource.slug}?campaignId=${campaignId}`,
          );
          if (res.ok) {
            const html = await res.text();
            setPreviewHtml(html);
          }
        } catch {
          // Preview unavailable — user can still download
        } finally {
          setPreviewLoading(false);
        }
      }
    },
    [campaignId],
  );

  const closePreview = useCallback(() => {
    setPreviewResource(null);
    setPreviewHtml(null);
    setPreviewLoading(false);
  }, []);

  const downloadResource = useCallback(
    (slug: string) => {
      window.open(`/api/resources/templates/${slug}?campaignId=${campaignId}`, "_blank");
    },
    [campaignId],
  );

  const resourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: RESOURCES.length };
    for (const r of RESOURCES) {
      counts[r.category] = (counts[r.category] ?? 0) + 1;
    }
    counts["templates"] = RESOURCES.length;
    counts["premium"] = PREMIUM_TOOLS.length;
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-blue-600" />
                Resource Library
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Campaign content, templates, and tools for{" "}
                <span className="font-medium text-slate-700">{campaignName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/resources/ai-creator"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                AI Creator
              </Link>
              <Link
                href="/print"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Paintbrush className="w-4 h-4" />
                Print Builder
              </Link>
            </div>
          </div>

          {/* Search + Filter Bar */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates, scripts, checklists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`h-10 w-10 rounded-lg border flex items-center justify-center transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-50 border-blue-200 text-blue-600"
                    : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`h-10 w-10 rounded-lg border flex items-center justify-center transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-50 border-blue-200 text-blue-600"
                    : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── Category Sidebar ─────────────────────────────────── */}
          <nav className="lg:w-56 shrink-0">
            <div className="lg:sticky lg:top-6 space-y-1">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                const count = resourceCounts[cat.id] ?? 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                    <span className="flex-1 text-left">{cat.label}</span>
                    <span
                      className={`text-xs tabular-nums ${
                        isActive ? "text-blue-500" : "text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ─── Main Content ─────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {/* Premium Tools Section */}
            {(activeCategory === "all" || activeCategory === "premium") && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-slate-900">Pro Tools & Builders</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {PREMIUM_TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    const unlocked = hasPlan(plan, tool.requiresPlan);
                    return (
                      <div
                        key={tool.id}
                        className={`relative rounded-xl border p-4 transition-all ${
                          unlocked
                            ? "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        {unlocked ? (
                          <Link href={tool.href} className="absolute inset-0 rounded-xl" />
                        ) : null}
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              unlocked
                                ? "bg-blue-50 text-blue-600"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={`font-semibold text-sm ${
                                  unlocked ? "text-slate-900" : "text-slate-500"
                                }`}
                              >
                                {tool.title}
                              </p>
                              {!unlocked && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                                  <Lock className="w-2.5 h-2.5" />
                                  {planLabel(tool.requiresPlan)}
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-xs mt-1 leading-relaxed ${
                                unlocked ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              {tool.description}
                            </p>
                          </div>
                          {unlocked ? (
                            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                          ) : (
                            <Link
                              href="/settings/billing"
                              className="relative z-10 shrink-0 mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition-all"
                            >
                              Upgrade
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Resource Grid/List */}
            {activeCategory !== "premium" && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    {activeCategory === "all"
                      ? "All Templates & Resources"
                      : CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "Resources"}
                  </h2>
                  <span className="text-sm text-slate-400 tabular-nums">
                    {filteredResources.length} resource{filteredResources.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {filteredResources.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">No resources found</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {searchQuery
                        ? `No results for "${searchQuery}". Try a different search.`
                        : "No resources in this category yet."}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredResources.map((r) => (
                      <ResourceCard
                        key={r.slug}
                        resource={r}
                        onPreview={() => openPreview(r)}
                        onDownload={() => downloadResource(r.slug)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    {filteredResources.map((r) => (
                      <ResourceRow
                        key={r.slug}
                        resource={r}
                        onPreview={() => openPreview(r)}
                        onDownload={() => downloadResource(r.slug)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Quick Create Section */}
            {(activeCategory === "all" || activeCategory === "templates") && (
              <section className="mt-8">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Create & Build</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link
                    href="/resources/ai-creator"
                    className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center mb-3">
                      <Sparkles className="w-5 h-5 text-violet-600" />
                    </div>
                    <p className="font-semibold text-slate-900 text-sm">Generate with AI</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Press releases, scripts, emails, social calendars — written by Adoni
                    </p>
                  </Link>
                  <Link
                    href="/print"
                    className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
                      <Paintbrush className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="font-semibold text-slate-900 text-sm">Print Builder</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Design lawn signs, door hangers, flyers, and palm cards
                    </p>
                  </Link>
                  <Link
                    href="/settings/brand"
                    className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                      <LayoutTemplate className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="font-semibold text-slate-900 text-sm">Brand Kit</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Set campaign colors, fonts, and logo — applied to all templates
                    </p>
                  </Link>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      {/* ─── Preview Drawer ─────────────────────────────────────── */}
      {previewResource && (
        <PreviewDrawer
          resource={previewResource}
          html={previewHtml}
          loading={previewLoading}
          campaignId={campaignId}
          onClose={closePreview}
          onDownload={() => downloadResource(previewResource.slug)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ResourceCard({
  resource,
  onPreview,
  onDownload,
}: {
  resource: Resource;
  onPreview: () => void;
  onDownload: () => void;
}) {
  const Icon = resource.icon;
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            resource.format === "csv"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-900 leading-tight">{resource.title}</p>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{resource.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {formatDate(resource.updatedAt)}
          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium uppercase text-[10px]">
            {resource.format}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {resource.format === "html" && (
            <button
              onClick={onPreview}
              className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              title="Preview"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onDownload}
            className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ResourceRow({
  resource,
  onPreview,
  onDownload,
}: {
  resource: Resource;
  onPreview: () => void;
  onDownload: () => void;
}) {
  const Icon = resource.icon;
  return (
    <div className="group flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          resource.format === "csv"
            ? "bg-emerald-50 text-emerald-600"
            : "bg-blue-50 text-blue-600"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-900">{resource.title}</p>
        <p className="text-xs text-slate-500 truncate">{resource.description}</p>
      </div>
      <span className="hidden sm:inline px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium uppercase text-[10px]">
        {resource.format}
      </span>
      <span className="hidden md:inline text-xs text-slate-400 tabular-nums whitespace-nowrap">
        {formatDate(resource.updatedAt)}
      </span>
      <div className="flex items-center gap-1">
        {resource.format === "html" && (
          <button
            onClick={onPreview}
            className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        )}
        <button
          onClick={onDownload}
          className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Download</span>
        </button>
      </div>
    </div>
  );
}

function PreviewDrawer({
  resource,
  html,
  loading,
  campaignId,
  onClose,
  onDownload,
}: {
  resource: Resource;
  html: string | null;
  loading: boolean;
  campaignId: string;
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">{resource.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{resource.description}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50">
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <a
            href={`/api/resources/templates/${resource.slug}?campaignId=${campaignId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Tab
          </a>
          <Link
            href="/resources/ai-creator"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generate Custom Version
          </Link>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-sm text-slate-500 mt-3">Loading preview...</p>
              </div>
            </div>
          ) : html ? (
            <iframe
              srcDoc={html}
              className="w-full h-full border-0"
              title={`Preview: ${resource.title}`}
              sandbox="allow-same-origin"
            />
          ) : resource.format === "csv" ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <FileSpreadsheet className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">CSV Template</p>
                <p className="text-sm text-slate-500 mt-1">
                  Download this template and open it in Excel or Google Sheets.
                </p>
                <button
                  onClick={onDownload}
                  className="mt-4 inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">Preview unavailable</p>
                <p className="text-sm text-slate-500 mt-1">
                  Download the file to view its contents.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-4 text-xs text-slate-500">
          <span>Format: <strong className="text-slate-700 uppercase">{resource.format}</strong></span>
          <span>Updated: <strong className="text-slate-700">{formatDate(resource.updatedAt)}</strong></span>
          <span>Category: <strong className="text-slate-700 capitalize">{resource.category.replace("-", " ")}</strong></span>
        </div>
      </div>
    </>
  );
}
