"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
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
  Check,
  Layers,
  Target,
  Heart,
  Printer,
  Palette,
  Wand2,
  ArrowRight,
  Tag,
  MoreVertical,
  Repeat2,
  Folder,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Category =
  | "all"
  | "my-resources"
  | "templates"
  | "communications"
  | "social"
  | "print"
  | "field"
  | "candidate"
  | "fundraising"
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
  tags: string[];
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

// ─── Plan Logic ─────────────────────────────────────────────────────────────

const PLAN_RANK: Record<string, number> = {
  free_trial: 0,
  starter: 1,
  pro: 2,
  official: 3,
  command: 4,
};

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

// ─── Categories ──────────────────────────────────────────────────────────────

const CATEGORIES: Array<{
  id: Category;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}> = [
  { id: "all", label: "All Resources", icon: Layers },
  { id: "my-resources", label: "My Resources", icon: Folder },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "communications", label: "Communications", icon: Newspaper, section: "Content Types" },
  { id: "social", label: "Social", icon: Share2 },
  { id: "print", label: "Print", icon: Printer },
  { id: "field", label: "Field", icon: MessageCircle },
  { id: "candidate", label: "Candidate", icon: UserCircle },
  { id: "fundraising", label: "Fundraising", icon: Heart },
  { id: "premium", label: "Premium", icon: Crown, section: "Pro" },
];

// ─── Resources Data ──────────────────────────────────────────────────────────

const RESOURCES: Resource[] = [
  // Field
  { slug: "volunteer-signup", title: "Volunteer Sign-Up Sheet", description: "Collect contact info, availability, and skills from new volunteers", category: "field", format: "html", icon: Users, updatedAt: "2026-03-15", tags: ["volunteer", "form", "field"] },
  { slug: "volunteer-certificate", title: "Volunteer Certificate", description: "Official certificate of service for campaign volunteers", category: "field", format: "html", icon: FileText, updatedAt: "2026-03-15", tags: ["volunteer", "recognition"] },
  { slug: "canvasser-checklist", title: "Canvasser Pre-Shift Checklist", description: "Everything a canvasser needs before hitting the doors", category: "field", format: "html", icon: MessageCircle, updatedAt: "2026-03-20", tags: ["canvassing", "checklist", "field"] },
  { slug: "door-knock-codes", title: "Door-Knock Result Codes", description: "Standard result codes and their meaning for door-to-door", category: "field", format: "html", icon: BookOpen, updatedAt: "2026-03-20", tags: ["canvassing", "reference", "field"] },
  { slug: "script-supporter", title: "Script — Confirmed Supporter", description: "Door-knock script for voters already identified as supporters", category: "field", format: "html", icon: FileText, updatedAt: "2026-03-20", tags: ["canvassing", "script", "field"] },
  { slug: "script-persuadable", title: "Script — Persuadable Voter", description: "Door-knock script for undecided or swing voters", category: "field", format: "html", icon: FileText, updatedAt: "2026-03-20", tags: ["canvassing", "script", "field"] },
  { slug: "script-opposition", title: "Script — Opposition", description: "Brief, respectful script for known opposition voters", category: "field", format: "html", icon: FileText, updatedAt: "2026-03-20", tags: ["canvassing", "script", "field"] },
  { slug: "election-day-checklist", title: "Election Day Hour-by-Hour", description: "Full timeline from 6am to 10pm with tasks and checkpoints", category: "field", format: "html", icon: Vote, updatedAt: "2026-03-25", tags: ["election-day", "checklist", "field"] },
  { slug: "scrutineers-guide", title: "Scrutineer's Guide", description: "Complete guide for poll watchers — rules, procedures, escalation", category: "field", format: "html", icon: BookOpen, updatedAt: "2026-03-25", tags: ["election-day", "guide", "field"] },
  { slug: "poll-captain-handbook", title: "Poll Captain Handbook", description: "Manage one polling location from open to close", category: "field", format: "html", icon: BookOpen, updatedAt: "2026-03-25", tags: ["election-day", "guide", "field"] },
  { slug: "gotv-phone-script", title: "GOTV Phone Script", description: "Election day phone script — rides, polling info, turnout push", category: "field", format: "html", icon: Megaphone, updatedAt: "2026-03-28", tags: ["gotv", "script", "field"] },
  // Fundraising
  { slug: "donation-pledge", title: "Donation Pledge Card", description: "Printable pledge card for in-person fundraising", category: "fundraising", format: "html", icon: DollarSign, updatedAt: "2026-03-10", tags: ["donation", "form", "fundraising"] },
  { slug: "donation-receipt", title: "Donation Receipt (Ontario)", description: "Official donation receipt compliant with Ontario Election Finances Act", category: "fundraising", format: "html", icon: FileText, updatedAt: "2026-03-10", tags: ["donation", "receipt", "fundraising"] },
  { slug: "expense-tracker", title: "Expense Tracker", description: "CSV spreadsheet for logging campaign expenses by category", category: "fundraising", format: "csv", icon: FileSpreadsheet, updatedAt: "2026-03-10", tags: ["finance", "spreadsheet", "fundraising"] },
  { slug: "finance-checklist", title: "Finance Checklist", description: "CFO appointment through final reporting — full compliance checklist", category: "fundraising", format: "html", icon: DollarSign, updatedAt: "2026-03-10", tags: ["finance", "checklist", "fundraising"] },
  // Communications
  { slug: "social-calendar", title: "Social Calendar", description: "CSV template for planning social media posts across platforms", category: "social", format: "csv", icon: Calendar, updatedAt: "2026-03-18", tags: ["social", "planning", "communications"] },
  { slug: "press-release", title: "Press Release Template", description: "Standard press release format with placeholder sections", category: "communications", format: "html", icon: Newspaper, updatedAt: "2026-03-18", tags: ["media", "template", "communications"] },
  // Candidate
  { slug: "campaign-bio", title: "Candidate Bio", description: "Structured template for drafting your official candidate biography", category: "candidate", format: "html", icon: UserCircle, updatedAt: "2026-03-12", tags: ["bio", "template", "candidate"] },
];

// ─── Premium Tools ───────────────────────────────────────────────────────────

const PREMIUM_TOOLS: PremiumTool[] = [
  { id: "ai-creator", title: "AI Script Generator", description: "Generate press releases, canvass scripts, emails, and social calendars with Adoni AI", icon: Sparkles, href: "/resources/ai-creator", requiresPlan: "starter" },
  { id: "social-pack", title: "Social Pack Builder", description: "Create a week of branded social posts across all platforms in minutes", icon: Share2, href: "/resources/ai-creator", requiresPlan: "pro" },
  { id: "video-script", title: "Press Release Generator", description: "AI-written press releases tuned for local media with campaign context", icon: Newspaper, href: "/resources/ai-creator", requiresPlan: "pro" },
  { id: "brand-kit", title: "Brand Kit Tools", description: "Campaign design system — colors, fonts, logo guidelines, applied everywhere", icon: Palette, href: "/settings/brand", requiresPlan: "starter" },
  { id: "flyer-builder", title: "Flyer Builder", description: "Drag-and-drop builder for print-ready campaign flyers and pamphlets", icon: LayoutTemplate, href: "/print", requiresPlan: "pro" },
  { id: "print-marketplace", title: "Print Marketplace", description: "Design and order lawn signs, door hangers, flyers, and palm cards", icon: Printer, href: "/print", requiresPlan: "starter" },
];

// ─── Create Actions ──────────────────────────────────────────────────────────

const CREATE_ACTIONS = [
  {
    title: "Upload Resource",
    description: "Upload a file from your computer",
    icon: Upload,
    color: "bg-slate-100 text-slate-600",
    action: "upload" as const,
  },
  {
    title: "Generate with AI",
    description: "Press releases, scripts, emails — written by Adoni",
    icon: Sparkles,
    color: "bg-violet-50 text-violet-600",
    href: "/resources/ai-creator",
  },
  {
    title: "Start from Template",
    description: "Choose from 18 campaign-ready templates",
    icon: LayoutTemplate,
    color: "bg-blue-50 text-blue-600",
    action: "template" as const,
  },
  {
    title: "Open Print Builder",
    description: "Signs, flyers, door hangers, palm cards",
    icon: Paintbrush,
    color: "bg-emerald-50 text-emerald-600",
    href: "/print",
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ResourceLibraryClient({ campaignId, campaignName, plan }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  // Close create menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setShowCreateMenu(false);
      }
    }
    if (showCreateMenu) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showCreateMenu]);

  const filteredResources = useMemo(() => {
    let filtered = RESOURCES;
    if (activeCategory === "my-resources") {
      // Placeholder: in real implementation, filter by user-created resources
      filtered = [];
    } else if (activeCategory !== "all" && activeCategory !== "templates" && activeCategory !== "premium") {
      filtered = filtered.filter((r) => r.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.tags.some((t) => t.includes(q)),
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

  const duplicateResource = useCallback(
    (slug: string) => {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    },
    [],
  );

  const resourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: RESOURCES.length, "my-resources": 0 };
    for (const r of RESOURCES) {
      counts[r.category] = (counts[r.category] ?? 0) + 1;
    }
    counts["templates"] = RESOURCES.length;
    counts["premium"] = PREMIUM_TOOLS.length;
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Header Bar ──────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          {/* Row 1: Title + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-blue-600" />
                Resource Library
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Campaign content, templates, and tools for{" "}
                <span className="font-medium text-slate-700">{campaignName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Create New — dropdown */}
              <div className="relative" ref={createMenuRef}>
                <button
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create New
                </button>
                {showCreateMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-2">
                    {CREATE_ACTIONS.map((action) => {
                      const Icon = action.icon;
                      const inner = (
                        <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                            <p className="text-xs text-slate-500">{action.description}</p>
                          </div>
                        </div>
                      );
                      if ("href" in action && action.href) {
                        return (
                          <Link key={action.title} href={action.href} onClick={() => setShowCreateMenu(false)}>
                            {inner}
                          </Link>
                        );
                      }
                      return (
                        <button
                          key={action.title}
                          className="w-full text-left"
                          onClick={() => {
                            setShowCreateMenu(false);
                            if (action.action === "template") {
                              setActiveCategory("templates");
                            }
                            // Upload: no backend yet — category switch is the UI shell
                          }}
                        >
                          {inner}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <Link
                href="/resources/ai-creator"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 text-white text-sm font-semibold hover:from-violet-700 hover:to-violet-800 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                AI Creator
              </Link>
              <Link
                href="/print"
                className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Paintbrush className="w-4 h-4" />
                Builder
              </Link>
            </div>
          </div>

          {/* Row 2: Search + View Toggle */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources by name, category, or tag..."
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
              <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`h-10 w-10 flex items-center justify-center transition-colors ${
                    viewMode === "grid"
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-slate-200" />
                <button
                  onClick={() => setViewMode("list")}
                  className={`h-10 w-10 flex items-center justify-center transition-colors ${
                    viewMode === "list"
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Body ────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── Sidebar Nav ───────────────────────────────────────── */}
          <nav className="lg:w-52 shrink-0">
            <div className="lg:sticky lg:top-6 space-y-0.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                const count = resourceCounts[cat.id] ?? 0;
                return (
                  <div key={cat.id}>
                    {cat.section && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-5 mb-2 px-3">
                        {cat.section}
                      </p>
                    )}
                    <button
                      onClick={() => setActiveCategory(cat.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-blue-100" : "text-slate-400"}`} />
                      <span className="flex-1 text-left">{cat.label}</span>
                      <span
                        className={`text-xs tabular-nums ${
                          isActive ? "text-blue-200" : "text-slate-400"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </nav>

          {/* ─── Main Content ────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {/* ── My Resources (empty state) ─────────────────────── */}
            {activeCategory === "my-resources" && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
                <Folder className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-bold text-slate-700">No custom resources yet</p>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                  Uploaded files and AI-generated content will appear here. Start by creating or uploading your first resource.
                </p>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <Link
                    href="/resources/ai-creator"
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                  </Link>
                  <button
                    onClick={() => setActiveCategory("templates")}
                    className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <LayoutTemplate className="w-4 h-4" />
                    Browse Templates
                  </button>
                </div>
              </div>
            )}

            {/* ── Premium Tools ───────────────────────────────────── */}
            {(activeCategory === "all" || activeCategory === "premium") && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Crown className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Premium Tools</h2>
                      <p className="text-xs text-slate-500">
                        {hasPlan(plan, "starter")
                          ? `Your ${planLabel(plan)} plan`
                          : "Upgrade to unlock"}
                      </p>
                    </div>
                  </div>
                  {!hasPlan(plan, "starter") && (
                    <Link
                      href="/settings/billing"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors"
                    >
                      View plans
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {PREMIUM_TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    const unlocked = hasPlan(plan, tool.requiresPlan);
                    return (
                      <div
                        key={tool.id}
                        className={`relative group rounded-xl border p-4 transition-all ${
                          unlocked
                            ? "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"
                            : "bg-slate-50/80 border-slate-200/80"
                        }`}
                      >
                        {unlocked && (
                          <Link href={tool.href} className="absolute inset-0 rounded-xl z-0" />
                        )}
                        <div className="flex items-start gap-3 relative">
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
                                className={`font-semibold text-sm leading-tight ${
                                  unlocked ? "text-slate-900" : "text-slate-500"
                                }`}
                              >
                                {tool.title}
                              </p>
                              {!unlocked && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 shrink-0">
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
                            {!unlocked && (
                              <Link
                                href="/settings/billing"
                                className="relative z-10 inline-flex items-center gap-1 mt-2.5 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors"
                              >
                                Upgrade to unlock
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                          {unlocked && (
                            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5 group-hover:text-blue-400 transition-colors" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Resource Grid/List ──────────────────────────────── */}
            {activeCategory !== "premium" && activeCategory !== "my-resources" && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">
                    {activeCategory === "all"
                      ? "All Templates & Resources"
                      : CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "Resources"}
                  </h2>
                  <span className="text-xs text-slate-400 tabular-nums font-medium">
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
                        onDuplicate={() => duplicateResource(r.slug)}
                        duplicated={copiedSlug === r.slug}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {/* List header */}
                    <div className="grid grid-cols-[1fr_80px_100px_120px] gap-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resource</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden md:block">Updated</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {filteredResources.map((r) => (
                        <ResourceRow
                          key={r.slug}
                          resource={r}
                          onPreview={() => openPreview(r)}
                          onDownload={() => downloadResource(r.slug)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── Create & Build Section ──────────────────────────── */}
            {(activeCategory === "all" || activeCategory === "templates") && (
              <section className="mt-8">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Wand2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Create & Build</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {CREATE_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    const inner = (
                      <div className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all h-full">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${action.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <p className="font-semibold text-slate-900 text-sm">{action.title}</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{action.description}</p>
                      </div>
                    );
                    if ("href" in action && action.href) {
                      return <Link key={action.title} href={action.href}>{inner}</Link>;
                    }
                    return (
                      <button
                        key={action.title}
                        className="text-left"
                        onClick={() => {
                          if (action.action === "template") {
                            setActiveCategory("templates");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                      >
                        {inner}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      {/* ─── Preview Drawer ──────────────────────────────────────── */}
      {previewResource && (
        <PreviewDrawer
          resource={previewResource}
          html={previewHtml}
          loading={previewLoading}
          campaignId={campaignId}
          plan={plan}
          onClose={closePreview}
          onDownload={() => downloadResource(previewResource.slug)}
        />
      )}
    </div>
  );
}

// ─── Resource Card ──────────────────────────────────────────────────────────

function ResourceCard({
  resource,
  onPreview,
  onDownload,
  onDuplicate,
  duplicated,
}: {
  resource: Resource;
  onPreview: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  duplicated: boolean;
}) {
  const Icon = resource.icon;
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showMenu]);

  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-md transition-all">
      {/* Click target for preview */}
      <button
        onClick={onPreview}
        className="w-full text-left p-4 pb-0"
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              resource.format === "csv"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-blue-50 text-blue-600"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-slate-900 leading-tight">{resource.title}</p>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{resource.description}</p>
          </div>
        </div>
      </button>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 mt-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {formatDate(resource.updatedAt)}
          <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
            {resource.format}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
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
          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg border border-slate-200 shadow-lg z-30 py-1">
                <button
                  onClick={() => { onDuplicate(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  {duplicated ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {duplicated ? "Duplicated" : "Duplicate"}
                </button>
                <Link
                  href="/resources/ai-creator"
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate custom version
                </Link>
                <button
                  onClick={() => { onDownload(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in new tab
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      {resource.tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {resource.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-100"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Resource Row ───────────────────────────────────────────────────────────

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
    <div
      className="group grid grid-cols-[1fr_80px_100px_120px] gap-4 items-center px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
      onClick={onPreview}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            resource.format === "csv"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{resource.title}</p>
          <p className="text-xs text-slate-500 truncate">{resource.description}</p>
        </div>
      </div>
      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold uppercase text-[10px] w-fit">
        {resource.format}
      </span>
      <span className="hidden md:inline text-xs text-slate-400 tabular-nums whitespace-nowrap">
        {formatDate(resource.updatedAt)}
      </span>
      <div className="flex items-center justify-end gap-1">
        {resource.format === "html" && (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Preview Drawer ─────────────────────────────────────────────────────────

function PreviewDrawer({
  resource,
  html,
  loading,
  campaignId,
  plan,
  onClose,
  onDownload,
}: {
  resource: Resource;
  html: string | null;
  loading: boolean;
  campaignId: string;
  plan: string;
  onClose: () => void;
  onDownload: () => void;
}) {
  // Escape key closes drawer
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-full duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 truncate">{resource.title}</h2>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold uppercase text-[10px] shrink-0">
                {resource.format}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{resource.description}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50 flex-wrap">
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
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Tab
          </a>
          <Link
            href="/resources/ai-creator"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generate Custom
          </Link>
          <div className="hidden sm:block w-px h-5 bg-slate-200 mx-1" />
          <button
            onClick={onDownload}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <Link
            href="/print"
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            title="Open in Builder"
          >
            <Paintbrush className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-white">
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
                <FileSpreadsheet className="w-14 h-14 text-emerald-300 mx-auto mb-4" />
                <p className="font-bold text-slate-700 text-lg">CSV Template</p>
                <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">
                  Download this template and open it in Excel, Google Sheets, or any spreadsheet app.
                </p>
                <button
                  onClick={onDownload}
                  className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <FileText className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                <p className="font-bold text-slate-700 text-lg">Preview unavailable</p>
                <p className="text-sm text-slate-500 mt-1.5">
                  Download the file to view its contents.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              Format: <strong className="text-slate-700 uppercase">{resource.format}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Updated: <strong className="text-slate-700">{formatDate(resource.updatedAt)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Tag className="w-3 h-3" />
              {resource.tags.map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-medium">
                  {t}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
