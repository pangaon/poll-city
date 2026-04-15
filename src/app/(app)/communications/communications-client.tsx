"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Send,
  Users,
  Search,
  Filter,
  Plus,
  Clock,
  Check,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  X,
  Eye,
  Copy,
  Pencil,
  Archive,
  MoreVertical,
  ChevronRight,
  ArrowRight,
  Globe,
  Inbox,
  FileText,
  History,
  Calendar,
  Zap,
  Settings,
  Target,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  Hash,
  AtSign,
  Phone,
  Radio,
  Layers,
  MessageCircle,
  Bot,
  Share2,
  Sparkles,
  Bell,
  Shield,
  UserCircle,
  Tag,
  ChevronDown,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab =
  | "overview"
  | "compose"
  | "campaigns"
  | "inbox"
  | "templates"
  | "automations"
  | "scheduled"
  | "history"
  | "audiences"
  | "subscribers"
  | "settings";

type Channel = "email" | "sms" | "all";

type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";

interface Props {
  campaignId: string;
  campaignName: string;
  tags: Array<{ id: string; name: string; color: string | null }>;
  wards: string[];
}

interface AudienceResult {
  count: number;
  sample: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  }>;
}

interface HistoryItem {
  id: string;
  title: string;
  body: string;
  status: string;
  sentAt: string | null;
  totalSubscribers: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
}

interface ScheduledItem {
  id: string;
  channel: "email" | "sms" | "push";
  subject: string | null;
  bodyText: string;
  sendAt: string;
  timezone: string;
  status: "queued" | "processing" | "sent" | "cancelled" | "failed";
  sentAt: string | null;
  sentCount: number;
  failedCount: number;
  errorMessage: string | null;
  sendKey: string;
  segment: { id: string; name: string } | null;
  createdBy: { id: string; name: string | null };
  createdAt: string;
}

// Legacy: kept for backward compatibility during migration
interface CustomTemplate {
  slug: string;
  name: string;
  channel: "email" | "sms";
  subject?: string;
  body: string;
  createdAt: string;
}

interface MessageTemplate {
  id: string;
  channel: "email" | "sms" | "push";
  name: string;
  subject?: string | null;
  bodyHtml?: string | null;
  bodyText: string;
  previewText?: string | null;
  tokensUsed: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string | null };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "compose", label: "Compose", icon: Pencil },
  { id: "campaigns", label: "Campaigns", icon: Radio },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "automations", label: "Automations", icon: Zap },
  { id: "scheduled", label: "Scheduled", icon: Clock },
  { id: "history", label: "History", icon: History },
  { id: "audiences", label: "Audiences", icon: Target },
  { id: "subscribers", label: "Subscribers", icon: UserCircle },
  { id: "settings", label: "Settings", icon: Settings },
];

const SUPPORT_LEVELS = [
  { value: "strong_support", label: "Strong Support" },
  { value: "leaning_support", label: "Leaning Support" },
  { value: "undecided", label: "Undecided" },
  { value: "leaning_opposition", label: "Leaning Against" },
  { value: "strong_opposition", label: "Strong Against" },
  { value: "unknown", label: "Unknown" },
];

const EMAIL_TEMPLATES = [
  { slug: "canvassing-invite", name: "Canvassing Invite", subject: "{{firstName}}, we need you this Saturday", body: `<p>Hi {{firstName}},</p><p>We're knocking doors across {{ward}} this Saturday morning and I'd love to have you on the team.</p><p>Two hours. Snacks provided. You'll meet great people and move this campaign forward.</p><p><a href="#">Sign up for a shift</a></p><p>Thank you,<br>{{candidateName}}</p>` },
  { slug: "gotv-reminder", name: "GOTV Reminder", subject: "Tomorrow is election day. Here's your polling station.", body: `<p>Hi {{firstName}},</p><p>Tomorrow is election day. Polls are open 10am to 8pm.</p><p>Find your polling station at <a href="https://www.elections.on.ca">elections.on.ca</a>. Bring ID.</p><p>Let's finish this together.</p><p>-- {{candidateName}}</p>` },
  { slug: "thank-you", name: "Thank You", subject: "Thank you, {{firstName}}", body: `<p>Hi {{firstName}},</p><p>I wanted to thank you personally for your support in this campaign. It meant everything.</p><p>Whatever comes next, I'm grateful you trusted me with your vote.</p><p>-- {{candidateName}}</p>` },
  { slug: "event-invite", name: "Event Invitation", subject: "Coffee and conversation -- this Thursday", body: `<p>Hi {{firstName}},</p><p>I'm hosting a small community meetup this Thursday at 7pm. Coffee, questions, real conversation about {{ward}}.</p><p>Hope you'll join us.</p><p><a href="#">RSVP</a></p><p>-- {{candidateName}}</p>` },
];

const SMS_TEMPLATES = [
  { slug: "gotv", name: "GOTV Reminder", body: "Hi {{firstName}}, tomorrow is election day. Polls are open 10-8. Find your polling station at elections.on.ca. Let's finish this together!" },
  { slug: "canvassing", name: "Canvassing Invite", body: "Hi {{firstName}}, quick reminder: knock doors with us this Sat 10am in {{ward}}. Reply YES to join." },
  { slug: "thanks", name: "Thank You", body: "{{firstName}}, thank you for your support. It means the world. -- {{candidateName}}" },
  { slug: "event", name: "Event Invite", body: "Hi {{firstName}}, coffee meetup Thursday 7pm. Hope you'll come. Reply for details." },
];

const MERGE_FIELDS = [
  { token: "{{firstName}}", label: "First name" },
  { token: "{{lastName}}", label: "Last name" },
  { token: "{{ward}}", label: "Ward" },
  { token: "{{candidateName}}", label: "Candidate name" },
  { token: "{{campaignName}}", label: "Campaign name" },
];

const AUTOMATION_PRESETS = [
  { id: "gotv-reminder", name: "GOTV Reminder", trigger: "3 days before election", channel: "sms", description: "Auto-send GOTV reminders to confirmed supporters" },
  { id: "event-reminder", name: "Event Reminder", trigger: "24h before event", channel: "email", description: "Remind RSVPs about upcoming events" },
  { id: "volunteer-followup", name: "Volunteer Follow-up", trigger: "After first shift", channel: "email", description: "Thank volunteers and invite to next shift" },
  { id: "donation-thankyou", name: "Donation Thank You", trigger: "On donation received", channel: "email", description: "Immediate thank-you with tax receipt" },
  { id: "new-supporter", name: "New Supporter Welcome", trigger: "On contact identified", channel: "email", description: "Welcome message with campaign info" },
  { id: "canvass-debrief", name: "Canvass Debrief", trigger: "End of canvass shift", channel: "sms", description: "Quick survey for canvasser after each shift" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
    scheduled: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    sending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    in_progress: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    sent: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
    completed: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
    delivered: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
    failed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    cancelled: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
    active: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
    paused: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.replace("_", " ")}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CommunicationsClient({ campaignId, campaignName, tags, wards }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<Channel>("all");

  // Compose pre-fill state (for Reply / Use Template navigation)
  const [composePrefill, setComposePrefill] = useState<{ channel?: "email" | "sms"; subject?: string; body?: string } | null>(null);

  function navigateToCompose(prefill?: { channel?: "email" | "sms"; subject?: string; body?: string }) {
    if (prefill) setComposePrefill(prefill);
    setActiveTab("compose");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <Mail className="w-6 h-6 text-blue-600" />
                Communications
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Command center for{" "}
                <span className="font-medium text-slate-700">{campaignName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("compose")}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Message
              </button>
              <button
                onClick={() => setActiveTab("campaigns")}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Radio className="w-4 h-4" />
                New Campaign
              </button>
              <button
                onClick={() => setActiveTab("templates")}
                className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Templates
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search messages, campaigns, contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Channel filter pills */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
              {(["all", "email", "sms"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch)}
                  className={`h-10 px-3 text-xs font-semibold transition-colors capitalize ${
                    channelFilter === ch
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {ch === "all" ? "All" : ch.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 -mb-px flex gap-0.5 overflow-x-auto scrollbar-thin">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Body ──────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "overview" && (
          <OverviewTab campaignId={campaignId} channelFilter={channelFilter} onNavigate={setActiveTab} />
        )}
        {activeTab === "compose" && (
          <ComposeTab
            campaignId={campaignId}
            campaignName={campaignName}
            tags={tags}
            wards={wards}
            channelFilter={channelFilter}
            prefill={composePrefill}
            onPrefillConsumed={() => setComposePrefill(null)}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === "campaigns" && (
          <CampaignsTab campaignId={campaignId} channelFilter={channelFilter} />
        )}
        {activeTab === "inbox" && (
          <InboxTab campaignId={campaignId} onNavigateCompose={navigateToCompose} />
        )}
        {activeTab === "templates" && (
          <TemplatesTab campaignId={campaignId} channelFilter={channelFilter} onNavigateCompose={navigateToCompose} />
        )}
        {activeTab === "automations" && (
          <AutomationsTab campaignId={campaignId} />
        )}
        {activeTab === "scheduled" && (
          <ScheduledTab campaignId={campaignId} />
        )}
        {activeTab === "history" && (
          <HistoryTab campaignId={campaignId} channelFilter={channelFilter} />
        )}
        {activeTab === "audiences" && (
          <AudiencesTab campaignId={campaignId} tags={tags} wards={wards} />
        )}
        {activeTab === "subscribers" && (
          <SubscribersTab campaignId={campaignId} />
        )}
        {activeTab === "settings" && (
          <SettingsTab />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ campaignId, channelFilter, onNavigate }: { campaignId: string; channelFilter: Channel; onNavigate: (tab: Tab) => void }) {
  const [stats, setStats] = useState<{ total: number; delivered: number; failed: number; deliveryRate: number }>({ total: 0, delivered: 0, failed: 0, deliveryRate: 0 });
  const [recentSends, setRecentSends] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([
          fetch(`/api/notifications/stats?campaignId=${campaignId}`),
          fetch(`/api/notifications/history?campaignId=${campaignId}&limit=10`),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const t = statsData.data?.totals ?? { total: 0, delivered: 0, failed: 0 };
          setStats({
            total: t.total ?? 0,
            delivered: t.delivered ?? 0,
            failed: t.failed ?? 0,
            deliveryRate: statsData.data?.deliveryRate ?? 0,
          });
        }

        if (historyRes.ok) {
          const histData = await historyRes.json();
          setRecentSends(histData.data ?? []);
        }
      } catch (err) {
        console.error("Failed to load overview:", err);
      }
      setLoading(false);
    })();
  }, [campaignId]);

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Sends", value: stats.total, icon: Send, color: "text-blue-600 bg-blue-50" },
          { label: "Delivery Rate", value: `${(stats.deliveryRate * 100).toFixed(1)}%`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
          { label: "Delivered", value: stats.delivered.toLocaleString(), icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "Failed", value: stats.failed.toLocaleString(), icon: AlertTriangle, color: "text-red-600 bg-red-50" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{m.value}</p>
                  <p className="text-xs text-slate-500 font-medium">{m.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Send Email", desc: "Compose to segments", icon: Mail, tab: "compose" as Tab, color: "bg-blue-50 text-blue-600" },
          { label: "Send SMS", desc: "Text blast", icon: MessageSquare, tab: "compose" as Tab, color: "bg-violet-50 text-violet-600" },
          { label: "View Inbox", desc: "Messages + replies", icon: Inbox, tab: "inbox" as Tab, color: "bg-emerald-50 text-emerald-600" },
          { label: "Subscribers", desc: "Newsletter + questions", icon: UserCircle, tab: "subscribers" as Tab, color: "bg-amber-50 text-amber-600" },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => onNavigate(a.tab)}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all text-left"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${a.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="font-semibold text-xs text-slate-900">{a.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{a.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Recent Sends */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3">Recent Sends</h3>
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          </div>
        ) : recentSends.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <Send className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No sends yet</p>
            <p className="text-sm text-slate-500 mt-1">Compose your first message to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_80px_80px_80px] gap-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Message</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Sent</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Delivered</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Failed</span>
            </div>
            <div className="divide-y divide-slate-100">
              {recentSends.slice(0, 10).map((h) => (
                <div key={h.id} className="grid grid-cols-[1fr_100px_80px_80px_80px] gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{h.title || "Untitled"}</p>
                    <p className="text-xs text-slate-500 truncate">{h.body?.replace(/<[^>]*>/g, "").slice(0, 60)}</p>
                  </div>
                  <div>{statusBadge(h.status)}</div>
                  <p className="text-xs text-slate-500 tabular-nums text-right">{h.totalSubscribers}</p>
                  <p className="text-xs text-green-600 tabular-nums text-right font-medium">{h.deliveredCount}</p>
                  <p className="text-xs text-red-500 tabular-nums text-right font-medium">{h.failedCount}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: COMPOSE
// ═══════════════════════════════════════════════════════════════════════════════

function ComposeTab({
  campaignId,
  campaignName,
  tags,
  wards,
  channelFilter,
  prefill,
  onPrefillConsumed,
  onNavigate,
}: {
  campaignId: string;
  campaignName: string;
  tags: Array<{ id: string; name: string; color: string | null }>;
  wards: string[];
  channelFilter: Channel;
  prefill: { channel?: "email" | "sms"; subject?: string; body?: string } | null;
  onPrefillConsumed: () => void;
  onNavigate: (tab: Tab) => void;
}) {
  const [channel, setChannel] = useState<"email" | "sms">(channelFilter === "sms" ? "sms" : "email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [supportLevels, setSupportLevels] = useState<string[]>([]);
  const [wardFilter, setWardFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [excludeDnc, setExcludeDnc] = useState(true);
  const [excludeEmailBounced, setExcludeEmailBounced] = useState(true);
  const [excludeSmsOptOut, setExcludeSmsOptOut] = useState(true);
  const [audience, setAudience] = useState<AudienceResult | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [result, setResult] = useState<{ sent?: number; failed?: number; error?: string; message?: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [showMergeFields, setShowMergeFields] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [volunteerOnly, setVolunteerOnly] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [lastContactedFilter, setLastContactedFilter] = useState("");

  async function generateWithAi() {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const kind = channel === "email" ? "fundraising-email" : "social-post";
      const res = await fetch("/api/adoni/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, brief: aiPrompt, campaignId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setBody(data.text);
          if (channel === "email" && !subject) {
            const firstLine = data.text.split("\n")[0].replace(/<[^>]*>/g, "").slice(0, 100);
            setSubject(firstLine);
          }
          setResult({ message: "AI content generated. Review and edit before sending." });
        } else {
          setResult({ error: "AI returned empty content. Try a more specific prompt." });
        }
      } else {
        const err = await res.json().catch(() => ({ error: "AI generation failed" }));
        setResult({ error: err.error || "AI generation failed. Check your ANTHROPIC_API_KEY." });
      }
    } catch {
      setResult({ error: "Network error connecting to AI. Try again." });
    }
    setAiGenerating(false);
    setShowAiPrompt(false);
    setAiPrompt("");
  }

  // Apply prefill when it changes
  useEffect(() => {
    if (prefill) {
      if (prefill.channel) setChannel(prefill.channel);
      if (prefill.subject !== undefined) setSubject(prefill.subject);
      if (prefill.body !== undefined) setBody(prefill.body);
      onPrefillConsumed();
    }
  }, [prefill, onPrefillConsumed]);

  // Live audience count
  useEffect(() => {
    const timer = setTimeout(async () => {
      setAudienceLoading(true);
      try {
        const res = await fetch("/api/communications/audience", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            campaignId,
            channel,
            supportLevels: supportLevels.length ? supportLevels : undefined,
            wards: wardFilter.length ? wardFilter : undefined,
            tagIds: tagFilter.length ? tagFilter : undefined,
            excludeDnc,
            excludeEmailBounced,
            excludeSmsOptOut,
            volunteerOnly: volunteerOnly || undefined,
            hasEmail: hasEmail || undefined,
            hasPhone: hasPhone || undefined,
            lastContactedDays: lastContactedFilter || undefined,
          }),
        });
        if (res.ok) setAudience(await res.json());
        else setAudience(null);
      } catch {
        setAudience(null);
      }
      setAudienceLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [campaignId, channel, supportLevels, wardFilter, tagFilter, excludeDnc, excludeEmailBounced, excludeSmsOptOut, volunteerOnly, hasEmail, hasPhone, lastContactedFilter]);

  function toggle(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function loadTemplate(slug: string) {
    if (channel === "email") {
      const t = EMAIL_TEMPLATES.find((x) => x.slug === slug);
      if (t) { setSubject(t.subject); setBody(t.body); }
    } else {
      const t = SMS_TEMPLATES.find((x) => x.slug === slug);
      if (t) setBody(t.body);
    }
  }

  function insertMergeField(token: string) {
    setBody((prev) => prev + token);
    setShowMergeFields(false);
  }

  async function saveDraft() {
    if (!body) return;
    setSavingDraft(true);
    setResult(null);
    try {
      const res = await fetch("/api/notifications/schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          title: subject || "SMS",
          body,
          scheduledFor: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      if (res.ok) {
        setResult({ message: "Draft saved as scheduled send (tomorrow). View it in the Scheduled tab." });
      } else {
        const data = await res.json();
        setResult({ error: data.error ?? "Failed to save draft" });
      }
    } catch {
      setResult({ error: "Network error saving draft" });
    }
    setSavingDraft(false);
  }

  async function saveAsTemplate() {
    if (!body) return;
    setSavingTemplate(true);
    setResult(null);
    try {
      const res = await fetch("/api/comms/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          channel,
          name: (channel === "email" && subject) ? subject : `${channel.toUpperCase()} Template`,
          subject: channel === "email" ? subject : undefined,
          bodyHtml: channel === "email" ? body : undefined,
          bodyText: body.replace(/<[^>]*>/g, ""),
        }),
      });
      if (res.ok) {
        setResult({ message: "Template saved. View it in the Templates tab." });
      } else {
        const data = await res.json();
        setResult({ error: data.error ?? "Failed to save template" });
      }
    } catch {
      setResult({ error: "Network error saving template" });
    }
    setSavingTemplate(false);
  }

  async function send(testOnly: boolean) {
    if (channel === "email" && (!subject || !body)) {
      setResult({ error: "Subject and body required" });
      return;
    }
    if (channel === "sms" && !body) {
      setResult({ error: "Message body required" });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const endpoint = channel === "email" ? "/api/communications/email" : "/api/communications/sms";
      const payload: Record<string, unknown> = {
        campaignId,
        ...(channel === "email" ? { subject, bodyHtml: body } : { body }),
        supportLevels: supportLevels.length ? supportLevels : undefined,
        wards: wardFilter.length ? wardFilter : undefined,
        tagIds: tagFilter.length ? tagFilter : undefined,
        excludeDnc,
        ...(channel === "email" ? { excludeEmailBounced } : { excludeSmsOptOut }),
        testOnly,
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? "Send failed" });
      } else {
        const sentCount = data.sent ?? data.delivered ?? 0;
        const failedCount = data.failed ?? 0;
        setResult({
          sent: sentCount,
          failed: failedCount,
          message: testOnly
            ? `Test send complete: ${sentCount} delivered.`
            : `Successfully sent to ${sentCount} recipient${sentCount !== 1 ? "s" : ""} via ${channel.toUpperCase()}.${failedCount ? ` ${failedCount} failed.` : " All delivered."}`,
        });
      }
    } catch {
      setResult({ error: "Network error" });
    }
    setSending(false);
  }

  const smsCharCount = channel === "sms" ? body.length : 0;
  const smsSegments = Math.ceil(smsCharCount / 160) || 0;
  const templates = channel === "email" ? EMAIL_TEMPLATES : SMS_TEMPLATES;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── Left: Composer ─────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Channel Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Channel</p>
          <div className="flex gap-2">
            {(["email", "sms"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`flex-1 h-11 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 border transition-colors ${
                  channel === ch
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                }`}
              >
                {ch === "email" ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                {ch === "email" ? "Email" : "SMS"}
              </button>
            ))}
          </div>
        </div>

        {/* Message Editor */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Message</p>
            <div className="flex gap-1">
              {/* Merge fields */}
              <div className="relative">
                <button
                  onClick={() => setShowMergeFields(!showMergeFields)}
                  className="h-7 px-2.5 rounded-md text-[11px] font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                >
                  <Hash className="w-3 h-3" />
                  Merge fields
                </button>
                {showMergeFields && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-slate-200 shadow-lg z-30 py-1">
                    {MERGE_FIELDS.map((f) => (
                      <button
                        key={f.token}
                        onClick={() => insertMergeField(f.token)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50"
                      >
                        <span className="text-slate-700">{f.label}</span>
                        <code className="text-[10px] text-blue-600 font-mono">{f.token}</code>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* AI Write */}
              <button
                onClick={() => setShowAiPrompt(!showAiPrompt)}
                className="h-7 px-2.5 rounded-md text-[11px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 hover:bg-violet-100 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> AI Write
              </button>
              {/* Template picker */}
              <select
                onChange={(e) => { if (e.target.value) loadTemplate(e.target.value); e.target.value = ""; }}
                className="h-7 px-2 rounded-md text-[11px] font-semibold text-slate-500 border border-slate-200 bg-white cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>Use template...</option>
                {templates.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {showAiPrompt && (
            <div className="flex gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Tell Adoni what to write..."
                className="flex-1 h-9 px-3 rounded-lg border border-violet-200 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none bg-white"
                onKeyDown={(e) => e.key === "Enter" && generateWithAi()}
              />
              <button
                onClick={generateWithAi}
                disabled={aiGenerating || !aiPrompt.trim()}
                className="h-9 px-4 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {aiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate
              </button>
            </div>
          )}

          {channel === "email" && (
            <input
              type="text"
              placeholder="Subject line..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          )}

          <textarea
            rows={channel === "email" ? 10 : 5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={channel === "email" ? "Write your email body (HTML supported)..." : "Write your SMS message..."}
            className="w-full px-3 py-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none font-mono"
          />

          {channel === "sms" && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{smsCharCount} characters</span>
              <span>{smsSegments} SMS segment{smsSegments !== 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Schedule */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Clock className="w-3.5 h-3.5" />
              Schedule:
            </label>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="h-8 px-2 rounded-md border border-slate-200 text-xs"
            />
            {scheduleDate && (
              <button onClick={() => setScheduleDate("")} className="text-xs text-slate-400 hover:text-red-500">
                Clear
              </button>
            )}
          </div>

          {/* Compliance warning */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
            <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold">CASL Compliance</p>
              <p className="mt-0.5">
                {channel === "email"
                  ? "An unsubscribe footer and campaign identification will be added automatically."
                  : "\"Reply STOP to opt out\" + campaign name will be appended (max 320 chars = 2 segments)."}
              </p>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg border px-3 py-2 text-sm ${
              result.error
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-green-50 border-green-200 text-green-800"
            }`}>
              {result.error
                ? result.error
                : result.message
                  ? result.message
                  : `Sent to ${result.sent} recipients. ${result.failed ? `${result.failed} failed.` : "All delivered."}`}
            </div>
          )}

          {/* Send buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => send(false)}
              disabled={sending || !body}
              className="flex-1 h-11 rounded-lg bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {scheduleDate ? "Schedule Send" : "Send Now"}
            </button>
            <button
              onClick={() => send(true)}
              disabled={sending || !body}
              className="h-11 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Test Send
            </button>
            <button
              onClick={saveDraft}
              disabled={!body || savingDraft}
              className="h-11 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Draft"}
            </button>
            <button
              onClick={saveAsTemplate}
              disabled={!body || savingTemplate}
              className="h-11 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-3.5 h-3.5" /> Save as Template</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Audience Panel ─────────────────────────── */}
      <div className="lg:w-80 shrink-0 space-y-4">
        {/* Audience count */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Audience</p>
          </div>
          <div className="flex items-center gap-2">
            {audienceLoading ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : (
              <p className="text-3xl font-bold text-slate-900 tabular-nums">{audience?.count?.toLocaleString() ?? "—"}</p>
            )}
            <span className="text-xs text-slate-500">recipients</span>
          </div>
          {audience && audience.sample.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Sample</p>
              {audience.sample.map((s) => (
                <p key={s.id} className="text-xs text-slate-600 truncate">
                  {s.firstName} {s.lastName} — {channel === "email" ? s.email : s.phone}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Segment Filters</p>

          {/* Support levels */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1.5">Support Level</p>
            <div className="flex flex-wrap gap-1">
              {SUPPORT_LEVELS.map((sl) => (
                <button
                  key={sl.value}
                  onClick={() => toggle(supportLevels, sl.value, setSupportLevels)}
                  className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                    supportLevels.includes(sl.value)
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-white border-slate-200 text-slate-500 hover:border-blue-200"
                  }`}
                >
                  {sl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wards */}
          {wards.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">Ward</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {wards.map((w) => (
                  <button
                    key={w}
                    onClick={() => toggle(wardFilter, w, setWardFilter)}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      wardFilter.includes(w)
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-200"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => toggle(tagFilter, t.id, setTagFilter)}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      tagFilter.includes(t.id)
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-200"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DNC toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeDnc}
              onChange={(e) => setExcludeDnc(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-600">Exclude Do-Not-Contact</span>
          </label>

          {/* Bounce / opt-out exclusions */}
          {channel === "email" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeEmailBounced}
                onChange={(e) => setExcludeEmailBounced(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-600">Exclude bounced emails</span>
            </label>
          )}
          {channel === "sms" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeSmsOptOut}
                onChange={(e) => setExcludeSmsOptOut(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-600">Exclude SMS opt-outs</span>
            </label>
          )}

          {/* Volunteer only */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={volunteerOnly}
              onChange={(e) => setVolunteerOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-600">Volunteers only</span>
          </label>

          {/* Has email / Has phone */}
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasEmail}
                onChange={(e) => setHasEmail(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-600">Has email</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasPhone}
                onChange={(e) => setHasPhone(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-600">Has phone</span>
            </label>
          </div>

          {/* Last contacted */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1.5">Last Contacted</p>
            <select
              value={lastContactedFilter}
              onChange={(e) => setLastContactedFilter(e.target.value)}
              className="w-full h-8 px-2 rounded-md border border-slate-200 text-xs"
            >
              <option value="">Any time</option>
              <option value="7">Within 7 days</option>
              <option value="30">Within 30 days</option>
              <option value="90">Within 90 days</option>
              <option value="never">Never contacted</option>
            </select>
          </div>
        </div>

        {/* Live Preview (email) */}
        {channel === "email" && (subject || body) && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Preview</p>
            {subject && <p className="font-semibold text-sm text-slate-900 mb-2">{subject}</p>}
            <div
              className="text-xs text-slate-600 leading-relaxed prose prose-xs max-w-none"
              dangerouslySetInnerHTML={{ __html: body.slice(0, 500) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: CAMPAIGNS / BROADCASTS
// ═══════════════════════════════════════════════════════════════════════════════

function CampaignsTab({ campaignId, channelFilter }: { campaignId: string; channelFilter: Channel }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/notifications?campaignId=${campaignId}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.data ?? data ?? []);
        }
      } catch (e) { /* graceful degradation */ }
      setLoading(false);
    })();
  }, [campaignId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-16 text-center">
        <Radio className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-lg font-bold text-slate-700">No campaigns yet</p>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Create your first email or SMS campaign to reach your supporters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-[1fr_100px_80px_80px_100px_80px] gap-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Campaign</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Recipients</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Delivered</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sent</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</span>
      </div>
      <div className="divide-y divide-slate-100">
        {history.map((h) => (
          <div key={h.id} className="grid grid-cols-[1fr_100px_80px_80px_100px_80px] gap-4 items-center px-4 py-3 hover:bg-slate-50 transition-colors">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-900 truncate">{h.title || "Untitled campaign"}</p>
              <p className="text-xs text-slate-500 truncate">{h.body?.replace(/<[^>]*>/g, "").slice(0, 50)}</p>
            </div>
            <div>{statusBadge(h.status)}</div>
            <p className="text-xs text-slate-700 tabular-nums text-right font-medium">{h.totalSubscribers}</p>
            <p className="text-xs text-green-600 tabular-nums text-right font-medium">{h.deliveredCount}</p>
            <p className="text-xs text-slate-500 tabular-nums">{formatDate(h.sentAt)}</p>
            <div className="flex items-center justify-end gap-1">
              <button className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="Duplicate this campaign to use as a template">
                <Copy className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Duplicate</span>
              </button>
              <button className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="Archive this campaign">
                <Archive className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Archive</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: INBOX
// ═══════════════════════════════════════════════════════════════════════════════

function InboxTab({ campaignId, onNavigateCompose }: { campaignId: string; onNavigateCompose: (prefill?: { channel?: "email" | "sms"; subject?: string; body?: string }) => void }) {
  const [items, setItems] = useState<Array<{ id: string; type: string; title: string; body: string; date: string; meta: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Aggregate inbox items from multiple sources
        const [logsRes, mentionsRes] = await Promise.all([
          fetch(`/api/notifications?campaignId=${campaignId}&limit=20`),
          fetch(`/api/communications/social/mentions?campaignId=${campaignId}&needsResponse=true`),
        ]);

        const entries: typeof items = [];

        if (logsRes.ok) {
          const data = await logsRes.json();
          const logs = data.data ?? data ?? [];
          for (const l of logs) {
            entries.push({
              id: l.id,
              type: l.title?.toLowerCase().includes("sms") ? "sms" : "email",
              title: l.title || "Message",
              body: l.body?.replace(/<[^>]*>/g, "").slice(0, 100) ?? "",
              date: l.sentAt ?? l.createdAt,
              meta: `${l.deliveredCount} delivered`,
            });
          }
        }

        if (mentionsRes.ok) {
          const mentionData = await mentionsRes.json();
          const mentions = mentionData.data ?? mentionData ?? [];
          for (const m of mentions) {
            entries.push({
              id: m.id,
              type: "mention",
              title: `@${m.authorHandle ?? "unknown"} on ${m.platform}`,
              body: m.content?.slice(0, 100) ?? "",
              date: m.mentionedAt,
              meta: m.sentiment ?? "",
            });
          }
        }

        entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setItems(entries);
      } catch (e) { /* graceful degradation */ }
      setLoading(false);
    })();
  }, [campaignId]);

  const selectedItem = items.find((i) => i.id === selected);

  const typeIcon = (type: string) => {
    if (type === "email") return <Mail className="w-4 h-4 text-blue-600" />;
    if (type === "sms") return <MessageSquare className="w-4 h-4 text-violet-600" />;
    if (type === "mention") return <Globe className="w-4 h-4 text-emerald-600" />;
    return <MessageCircle className="w-4 h-4 text-slate-400" />;
  };

  function handleReply() {
    if (!selectedItem) return;
    const channel = selectedItem.type === "sms" ? "sms" : "email";
    onNavigateCompose({
      channel: channel as "email" | "sms",
      subject: channel === "email" ? `Re: ${selectedItem.title}` : undefined,
      body: "",
    });
  }

  function handleArchive() {
    if (!selectedItem) return;
    setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
    setSelected(null);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 min-h-[600px]">
      {/* Conversation list */}
      <div className="w-full lg:w-96 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {items.length} conversation{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">Inbox empty</p>
              <p className="text-xs text-slate-500 mt-1">No messages or mentions to display.</p>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item.id)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                  selected === item.id ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {typeIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{item.body}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatDate(item.date)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="hidden lg:flex flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex-col">
        {selectedItem ? (
          <>
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {typeIcon(selectedItem.type)}
                <h3 className="font-bold text-slate-900">{selectedItem.title}</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">{formatDate(selectedItem.date)} · {selectedItem.meta}</p>
            </div>
            <div className="flex-1 p-6">
              <p className="text-sm text-slate-700 leading-relaxed">{selectedItem.body}</p>
            </div>
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex gap-2">
              <button
                onClick={handleReply}
                className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Reply
              </button>
              <button
                onClick={handleArchive}
                className="h-9 px-4 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive
              </button>
              <button className="h-9 px-4 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Tag
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-500">Select a conversation</p>
              <p className="text-xs text-slate-400 mt-1">Click an item on the left to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

function TemplatesTab({ campaignId, channelFilter, onNavigateCompose }: { campaignId: string; channelFilter: Channel; onNavigateCompose: (prefill?: { channel?: "email" | "sms"; subject?: string; body?: string }) => void }) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New template modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createChannel, setCreateChannel] = useState<"email" | "sms">("email");
  const [createName, setCreateName] = useState("");
  const [createSubject, setCreateSubject] = useState("");
  const [createBody, setCreateBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId });
      if (channelFilter !== "all") params.set("channel", channelFilter);
      const res = await fetch(`/api/comms/templates?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      }
    } catch { /* graceful degradation */ }
    setLoading(false);
  }, [campaignId, channelFilter]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  async function handleDelete(templateId: string) {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setDeletingId(templateId);
    try {
      await fetch(`/api/comms/templates/${templateId}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch { /* noop */ }
    setDeletingId(null);
  }

  async function handleDuplicate(t: MessageTemplate) {
    try {
      const res = await fetch("/api/comms/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          channel: t.channel,
          name: `${t.name} (copy)`,
          subject: t.subject,
          bodyHtml: t.bodyHtml,
          bodyText: t.bodyText,
          previewText: t.previewText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates((prev) => [data.template, ...prev]);
      }
    } catch { /* noop */ }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim() || !createBody.trim()) return;
    setSaving(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/comms/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          channel: createChannel,
          name: createName,
          subject: createChannel === "email" ? createSubject : undefined,
          bodyHtml: createChannel === "email" ? createBody : undefined,
          bodyText: createChannel === "sms" ? createBody : createBody.replace(/<[^>]*>/g, ""),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates((prev) => [data.template, ...prev]);
        setShowCreate(false);
        setCreateName(""); setCreateSubject(""); setCreateBody("");
      } else {
        const data = await res.json();
        setCreateError(data.error ?? "Failed to create template");
      }
    } catch {
      setCreateError("Network error");
    }
    setSaving(false);
  }

  const builtInEmail = channelFilter !== "sms" ? EMAIL_TEMPLATES : [];
  const builtInSms = channelFilter !== "email" ? SMS_TEMPLATES : [];
  const savedFiltered = templates.filter((t) =>
    channelFilter === "all" ? true : t.channel === channelFilter,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Templates</h2>
          <p className="text-xs text-slate-500 mt-0.5">Reusable messages for email and SMS</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="h-9 px-4 rounded-lg bg-[#1D9E75] text-white text-sm font-medium flex items-center gap-1.5 hover:bg-[#17886a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">New Template</h3>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="flex gap-2">
                {(["email", "sms"] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setCreateChannel(ch)}
                    className={`flex-1 h-9 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors border ${
                      createChannel === ch
                        ? "bg-[#0A2342] text-white border-[#0A2342]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {ch === "email" ? <Mail className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    {ch.toUpperCase()}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Template name</label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Strong Supporter Thank You"
                  className="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
                />
              </div>
              {createChannel === "email" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Subject line</label>
                  <input
                    value={createSubject}
                    onChange={(e) => setCreateSubject(e.target.value)}
                    placeholder="e.g. Thank you for your support, {{firstName}}!"
                    className="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
                  />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">
                    {createChannel === "email" ? "Body" : "Message"}
                  </label>
                  {createChannel === "sms" && (
                    <span className={`text-[10px] font-mono ${createBody.length > 320 ? "text-red-500" : "text-slate-400"}`}>
                      {createBody.length}/320
                    </span>
                  )}
                </div>
                <textarea
                  value={createBody}
                  onChange={(e) => setCreateBody(e.target.value)}
                  rows={createChannel === "sms" ? 4 : 8}
                  placeholder={createChannel === "sms"
                    ? "Hi {{firstName}}, just a reminder to vote on Oct 27. Reply STOP to opt out."
                    : "Dear {{firstName}},\n\nThank you for your support..."
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] resize-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tokens: {"{{"+"firstName"+"}}"}  {"{{"+"lastName"+"}}"}  {"{{"+"ward"+"}}"}  {"{{"+"candidateName"+"}}"}
                </p>
              </div>
              {createError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !createName.trim() || !createBody.trim()}
                  className="flex-1 h-9 rounded-lg bg-[#1D9E75] text-white text-sm font-medium hover:bg-[#17886a] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saved templates (from DB) */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : savedFiltered.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#1D9E75]" />
            <h3 className="text-base font-bold text-slate-900">Saved Templates</h3>
            <span className="text-xs text-slate-400">{savedFiltered.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {savedFiltered.map((t) => {
              const isEmail = t.channel === "email";
              const preview = isEmail
                ? (t.subject ?? t.bodyText.slice(0, 80))
                : t.bodyText.slice(0, 80);
              return (
                <div
                  key={t.id}
                  className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all ${
                    isEmail ? "hover:border-blue-200" : "hover:border-violet-200"
                  } border-slate-200`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isEmail ? "bg-blue-50" : "bg-violet-50"}`}>
                      {isEmail
                        ? <Mail className="w-4 h-4 text-blue-600" />
                        : <MessageSquare className="w-4 h-4 text-violet-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{t.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{preview}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(t.createdAt)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-1 flex-wrap">
                    <button
                      onClick={() => setPreviewId(previewId === t.id ? null : t.id)}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                        isEmail ? "text-slate-500 hover:bg-blue-50 hover:text-blue-600" : "text-slate-500 hover:bg-violet-50 hover:text-violet-600"
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                    <button
                      onClick={() => onNavigateCompose({
                        channel: t.channel === "push" ? "email" : t.channel,
                        subject: t.subject ?? undefined,
                        body: t.bodyHtml ?? t.bodyText,
                      })}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                        isEmail ? "text-slate-500 hover:bg-blue-50 hover:text-blue-600" : "text-slate-500 hover:bg-violet-50 hover:text-violet-600"
                      }`}
                    >
                      <Send className="w-3 h-3" />
                      Use
                    </button>
                    <button
                      onClick={() => handleDuplicate(t)}
                      className="h-7 px-2.5 rounded-md text-[11px] font-medium text-slate-500 hover:bg-slate-100 flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Dupe
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="h-7 px-2.5 rounded-md text-[11px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 flex items-center gap-1 transition-colors ml-auto"
                    >
                      {deletingId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                  {previewId === t.id && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-700 whitespace-pre-wrap">
                      {t.bodyHtml
                        ? <div dangerouslySetInnerHTML={{ __html: t.bodyHtml }} />
                        : t.bodyText
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-500">No saved templates yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Create one above, or save any message from the Compose tab.
          </p>
        </div>
      )}

      {/* Built-in starters */}
      {builtInEmail.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Email Starters</h3>
            <span className="text-xs text-slate-400">{builtInEmail.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {builtInEmail.map((t) => (
              <div key={t.slug} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{t.subject}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-1.5">
                  <button
                    onClick={() => onNavigateCompose({ channel: "email", subject: t.subject, body: t.body })}
                    className="h-7 px-2.5 rounded-md text-[11px] font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-1 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {builtInSms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-violet-600" />
            <h3 className="text-base font-bold text-slate-900">SMS Starters</h3>
            <span className="text-xs text-slate-400">{builtInSms.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {builtInSms.map((t) => (
              <div key={t.slug} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-violet-200 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.body}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-1.5">
                  <button
                    onClick={() => onNavigateCompose({ channel: "sms", body: t.body })}
                    className="h-7 px-2.5 rounded-md text-[11px] font-medium text-slate-500 hover:bg-violet-50 hover:text-violet-600 flex items-center gap-1 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: AUTOMATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function AutomationsTab({ campaignId }: { campaignId: string }) {
  const [activeAutomations, setActiveAutomations] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // Load saved automation states from campaign customization
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/campaigns/current");
        if (res.ok) {
          const data = await res.json();
          const automations = data.data?.customization?.automations ?? data.customization?.automations ?? {};
          setActiveAutomations(automations);
        }
      } catch (e) { /* graceful degradation */ }
      setLoading(false);
    })();
  }, []);

  async function toggleAutomation(id: string) {
    setToggling(id);
    const newState = !activeAutomations[id];
    const updated = { ...activeAutomations, [id]: newState };
    setActiveAutomations(updated);

    try {
      await fetch("/api/campaigns/current", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customization: { automations: updated } }),
      });
    } catch (e) { /* graceful degradation */ }
    setToggling(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">Automation Workflows</h3>
          <p className="text-xs text-slate-500 mt-0.5">Triggered messages and tasks that run automatically when events occur</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> {Object.values(activeAutomations).filter(Boolean).length} active</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" /> {AUTOMATION_PRESETS.length - Object.values(activeAutomations).filter(Boolean).length} inactive</span>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
        <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800">
          <p className="font-semibold">How automations work</p>
          <p className="mt-1 leading-relaxed">Active automations run via the daily lifecycle cron job at 8am, plus real-time triggers on form submissions. When a trigger fires, the system creates tasks, sends notifications, and updates contact records automatically.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {AUTOMATION_PRESETS.map((auto) => {
          const isActive = activeAutomations[auto.id] ?? false;
          const isToggling = toggling === auto.id;
          return (
            <div key={auto.id} className={`bg-white rounded-xl border p-4 transition-all ${isActive ? "border-green-200 shadow-sm" : "border-slate-200"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-green-50" : "bg-slate-100"}`}>
                  <Zap className={`w-5 h-5 ${isActive ? "text-green-600" : "text-slate-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-slate-900">{auto.name}</p>
                    {/* Toggle switch */}
                    <button
                      onClick={() => toggleAutomation(auto.id)}
                      disabled={isToggling}
                      className={`relative w-10 h-5.5 rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${isActive ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{auto.description}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{auto.trigger}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold uppercase">{auto.channel}</span>
                </div>
                {statusBadge(isActive ? "active" : "draft")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: SCHEDULED
// ═══════════════════════════════════════════════════════════════════════════════

function ScheduledTab({ campaignId }: { campaignId: string }) {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchScheduled = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comms/scheduled?campaignId=${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.messages ?? []);
      }
    } catch { /* graceful degradation */ }
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { fetchScheduled(); }, [fetchScheduled]);

  async function cancelScheduled(id: string) {
    setCancelling(id);
    try {
      const res = await fetch(`/api/comms/scheduled/${id}`, { method: "DELETE" });
      if (res.ok) {
        // Optimistic: remove immediately, then refresh
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch { /* graceful degradation */ }
    setCancelling(null);
  }

  const statusBadge = (status: ScheduledItem["status"]) => {
    const map: Record<ScheduledItem["status"], { label: string; cls: string }> = {
      queued:     { label: "Queued",     cls: "bg-blue-50 text-blue-700" },
      processing: { label: "Sending…",   cls: "bg-amber-50 text-amber-700" },
      sent:       { label: "Sent",       cls: "bg-green-50 text-green-700" },
      cancelled:  { label: "Cancelled",  cls: "bg-slate-100 text-slate-500" },
      failed:     { label: "Failed",     cls: "bg-red-50 text-red-700" },
    };
    const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500" };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-16 text-center">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-lg font-bold text-slate-700">No scheduled sends</p>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          When you schedule a message for later, it will appear here. You can cancel or reschedule from this view.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-[32px_1fr_1fr_130px_80px_100px] gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <span />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Subject / Body</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Audience</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Send At</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-[32px_1fr_1fr_130px_80px_100px] gap-3 items-center px-4 py-3 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-center">
              {item.channel === "email"
                ? <Mail className="w-4 h-4 text-blue-500" />
                : <MessageSquare className="w-4 h-4 text-violet-500" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-900 truncate">
                {item.subject ?? item.bodyText.slice(0, 60)}
              </p>
              {item.subject && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{item.bodyText.slice(0, 60)}</p>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {item.segment?.name ?? "All contacts"}
            </p>
            <p className="text-xs text-slate-600 tabular-nums">{formatDate(item.sendAt)}</p>
            <div>{statusBadge(item.status)}</div>
            <div className="flex items-center justify-end">
              {(item.status === "queued") && (
                <button
                  onClick={() => cancelScheduled(item.id)}
                  disabled={cancelling === item.id}
                  className="h-7 px-3 rounded-md text-[11px] font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  {cancelling === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Cancel
                </button>
              )}
              {item.status === "sent" && (
                <span className="text-[11px] text-green-600 font-semibold tabular-nums">
                  {item.sentCount} sent
                </span>
              )}
              {item.status === "failed" && (
                <span className="text-[11px] text-red-500 font-semibold truncate max-w-[90px]" title={item.errorMessage ?? ""}>
                  Error
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

function HistoryTab({ campaignId, channelFilter }: { campaignId: string; channelFilter: Channel }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/notifications/history?campaignId=${campaignId}&limit=100`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.data ?? []);
        }
      } catch (e) { /* graceful degradation */ }
      setLoading(false);
    })();
  }, [campaignId]);

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" /></div>;
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-16 text-center">
        <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-lg font-bold text-slate-700">No send history</p>
        <p className="text-sm text-slate-500 mt-2">Past sends will appear here with full delivery metrics.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-[1fr_100px_80px_80px_80px_120px] gap-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Message</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Sent</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Delivered</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Failed</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</span>
      </div>
      <div className="divide-y divide-slate-100">
        {history.map((h) => (
          <div key={h.id} className="grid grid-cols-[1fr_100px_80px_80px_80px_120px] gap-4 items-center px-4 py-3 hover:bg-slate-50 transition-colors">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-900 truncate">{h.title || "Untitled"}</p>
            </div>
            <div>{statusBadge(h.status)}</div>
            <p className="text-xs text-slate-700 tabular-nums text-right font-medium">{h.totalSubscribers}</p>
            <p className="text-xs text-green-600 tabular-nums text-right font-medium">{h.deliveredCount}</p>
            <p className="text-xs text-red-500 tabular-nums text-right font-medium">{h.failedCount}</p>
            <p className="text-xs text-slate-500 tabular-nums">{formatDate(h.sentAt ?? h.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: AUDIENCES
// ═══════════════════════════════════════════════════════════════════════════════

interface SavedSegmentFilter {
  supportLevels?: string[];
  wards?: string[];
  tagIds?: string[];
  channel?: "email" | "sms" | "all";
  volunteerOnly?: boolean;
  hasEmail?: boolean;
  hasPhone?: boolean;
  excludeDnc?: boolean;
}

interface SavedSegment {
  id: string;
  name: string;
  description?: string | null;
  filterDefinition: SavedSegmentFilter;
  isDynamic: boolean;
  lastCount?: number | null;
  lastCountedAt?: string | null;
  createdAt: string;
}

function AudiencesTab({
  campaignId,
  tags,
  wards,
}: {
  campaignId: string;
  tags: Array<{ id: string; name: string; color: string | null }>;
  wards: string[];
}) {
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [audience, setAudience] = useState<AudienceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedSegments, setSavedSegments] = useState<SavedSegment[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  // Create segment form state
  const [segName, setSegName] = useState("");
  const [segSupportLevels, setSegSupportLevels] = useState<string[]>([]);
  const [segWards, setSegWards] = useState<string[]>([]);
  const [segTags, setSegTags] = useState<string[]>([]);
  const [segVolunteerOnly, setSegVolunteerOnly] = useState(false);
  const [segHasEmail, setSegHasEmail] = useState(false);
  const [segHasPhone, setSegHasPhone] = useState(false);
  const [segPreviewCount, setSegPreviewCount] = useState<number | null>(null);
  const [segPreviewLoading, setSegPreviewLoading] = useState(false);
  const [savingSegment, setSavingSegment] = useState(false);

  function segToggle(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  const fetchAudience = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/communications/audience", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campaignId, channel }),
      });
      if (res.ok) setAudience(await res.json());
    } catch (e) { /* graceful degradation */ }
    setLoading(false);
  }, [campaignId, channel]);

  useEffect(() => { fetchAudience(); }, [fetchAudience]);

  // Load saved segments from real API
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/comms/segments?campaignId=${campaignId}`);
        if (res.ok) {
          const data = await res.json();
          setSavedSegments(data.segments ?? []);
        }
      } catch (e) { /* graceful degradation */ }
    })();
  }, [campaignId]);

  // Live preview count for segment builder
  useEffect(() => {
    if (!showCreateForm) return;
    const timer = setTimeout(async () => {
      setSegPreviewLoading(true);
      try {
        const res = await fetch("/api/communications/audience", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            campaignId,
            channel,
            supportLevels: segSupportLevels.length ? segSupportLevels : undefined,
            wards: segWards.length ? segWards : undefined,
            tagIds: segTags.length ? segTags : undefined,
            volunteerOnly: segVolunteerOnly || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSegPreviewCount(data.count ?? 0);
        }
      } catch (e) { /* graceful degradation */ }
      setSegPreviewLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [campaignId, channel, showCreateForm, segSupportLevels, segWards, segTags, segVolunteerOnly]);

  async function saveSegment() {
    if (!segName.trim()) return;
    setSavingSegment(true);
    try {
      const res = await fetch("/api/comms/segments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: segName.trim(),
          filterDefinition: {
            supportLevels: segSupportLevels.length ? segSupportLevels : undefined,
            wards: segWards.length ? segWards : undefined,
            tagIds: segTags.length ? segTags : undefined,
            channel,
            volunteerOnly: segVolunteerOnly || undefined,
            hasEmail: segHasEmail || undefined,
            hasPhone: segHasPhone || undefined,
            excludeDnc: true,
          },
          isDynamic: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const created: SavedSegment = { ...data.segment, lastCount: segPreviewCount ?? null };
        setSavedSegments((prev) => [created, ...prev]);
        setShowCreateForm(false);
        setSegName("");
        setSegSupportLevels([]);
        setSegWards([]);
        setSegTags([]);
        setSegVolunteerOnly(false);
        setSegHasEmail(false);
        setSegHasPhone(false);
        setSegPreviewCount(null);
      }
    } catch (e) { /* graceful degradation */ }
    setSavingSegment(false);
  }

  async function deleteSegment(segId: string) {
    setDeletingId(segId);
    try {
      const res = await fetch(`/api/comms/segments/${segId}`, { method: "DELETE" });
      if (res.ok) {
        setSavedSegments((prev) => prev.filter((s) => s.id !== segId));
      }
    } catch (e) { /* graceful degradation */ }
    setDeletingId(null);
  }

  async function refreshSegmentCount(segId: string) {
    setRefreshingId(segId);
    try {
      const res = await fetch(`/api/comms/segments/${segId}/count`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSavedSegments((prev) =>
          prev.map((s) =>
            s.id === segId
              ? { ...s, lastCount: data.count, lastCountedAt: data.countedAt }
              : s,
          ),
        );
      }
    } catch (e) { /* graceful degradation */ }
    setRefreshingId(null);
  }

  function segmentFilterSummary(seg: SavedSegment): string {
    const fd = seg.filterDefinition;
    const parts: string[] = [];
    if (fd.supportLevels?.length) parts.push(`${fd.supportLevels.length} support level${fd.supportLevels.length > 1 ? "s" : ""}`);
    if (fd.wards?.length) parts.push(`${fd.wards.length} ward${fd.wards.length > 1 ? "s" : ""}`);
    if (fd.tagIds?.length) parts.push(`${fd.tagIds.length} tag${fd.tagIds.length > 1 ? "s" : ""}`);
    if (fd.volunteerOnly) parts.push("volunteers");
    if (fd.hasEmail) parts.push("has email");
    if (fd.hasPhone) parts.push("has phone");
    return parts.length ? parts.join(" · ") : "All contacts";
  }

  return (
    <div className="space-y-6">
      {/* Channel toggle */}
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold text-slate-700">Channel:</p>
        <div className="flex gap-1">
          {(["email", "sms"] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
                channel === ch ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
              }`}
            >
              {ch === "email" ? "Email" : "SMS"}
            </button>
          ))}
        </div>
      </div>

      {/* Total audience */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Total {channel} Audience</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums mt-0.5">
              {loading ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin" /> : audience?.count?.toLocaleString() ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Saved Segments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900">Saved Segments</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Segment
          </button>
        </div>

        {savedSegments.length === 0 && !showCreateForm && (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No saved segments</p>
            <p className="text-sm text-slate-500 mt-1">Create reusable audience segments for quick targeting.</p>
          </div>
        )}

        {savedSegments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {savedSegments.map((seg) => (
              <div key={seg.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900">{seg.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{segmentFilterSummary(seg)}</p>
                    {seg.lastCount != null && (
                      <p className="text-xs font-medium text-blue-600 mt-0.5">{seg.lastCount.toLocaleString()} contacts</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => refreshSegmentCount(seg.id)}
                      disabled={refreshingId === seg.id}
                      title="Refresh count"
                      className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {refreshingId === seg.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RefreshCw className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteSegment(seg.id)}
                      disabled={deletingId === seg.id}
                      title="Delete this audience segment"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {deletingId === seg.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Segment Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-4">
          <p className="text-sm font-bold text-slate-900">New Segment</p>

          <input
            type="text"
            value={segName}
            onChange={(e) => setSegName(e.target.value)}
            placeholder="Segment name..."
            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />

          {/* Support levels */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1.5">Support Level</p>
            <div className="flex flex-wrap gap-1">
              {SUPPORT_LEVELS.map((sl) => (
                <button
                  key={sl.value}
                  onClick={() => segToggle(segSupportLevels, sl.value, setSegSupportLevels)}
                  className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                    segSupportLevels.includes(sl.value)
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-white border-slate-200 text-slate-500 hover:border-blue-200"
                  }`}
                >
                  {sl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wards */}
          {wards.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">Ward</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {wards.map((w) => (
                  <button
                    key={w}
                    onClick={() => segToggle(segWards, w, setSegWards)}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      segWards.includes(w)
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-200"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {tags.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => segToggle(segTags, t.id, setSegTags)}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      segTags.includes(t.id)
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-200"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={segVolunteerOnly} onChange={(e) => setSegVolunteerOnly(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-xs text-slate-600">Volunteers only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={segHasEmail} onChange={(e) => setSegHasEmail(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-xs text-slate-600">Has email</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={segHasPhone} onChange={(e) => setSegHasPhone(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-xs text-slate-600">Has phone</span>
            </label>
          </div>

          {/* Live count preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">
              {segPreviewLoading ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin inline" />
              ) : (
                segPreviewCount?.toLocaleString() ?? "—"
              )}
            </span>
            <span className="text-xs text-slate-500">matching contacts</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={saveSegment}
              disabled={!segName.trim() || savingSegment}
              className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {savingSegment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Segment
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Available Segments overview */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3">Available Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {SUPPORT_LEVELS.map((sl) => (
            <div key={sl.value} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{sl.label}</p>
                <p className="text-xs text-slate-500">Segmentable audience filter</p>
              </div>
            </div>
          ))}
          {wards.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">By Ward</p>
                <p className="text-xs text-slate-500">{wards.length} ward{wards.length !== 1 ? "s" : ""} available</p>
              </div>
            </div>
          )}
          {tags.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">By Tag</p>
                <p className="text-xs text-slate-500">{tags.length} tag{tags.length !== 1 ? "s" : ""} available</p>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Do-Not-Contact</p>
              <p className="text-xs text-slate-500">CASL suppression list</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
// TAB: SUBSCRIBERS — Newsletter subscribers, questions, sign requests
// ═══════════════════════════════════════════════════════════════════════════════

function SubscribersTab({ campaignId }: { campaignId: string }) {
  const [subscribers, setSubscribers] = useState<Array<{ id: string; email: string; firstName: string | null; lastName: string | null; status: string; createdAt: string }>>([]);
  const [questions, setQuestions] = useState<Array<{ id: string; name: string | null; email: string | null; question: string; createdAt: string }>>([]);
  const [signRequests, setSignRequests] = useState<Array<{ id: string; name: string; address: string; email: string | null; status: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"subscribers" | "questions" | "signs">("subscribers");

  useEffect(() => {
    (async () => {
      try {
        const [subRes, qRes, signRes] = await Promise.all([
          fetch(`/api/newsletters/subscribers?campaignId=${campaignId}`),
          fetch(`/api/public/candidates/questions?campaignId=${campaignId}`).catch(() => null),
          fetch(`/api/signs?campaignId=${campaignId}&pageSize=50`).catch(() => null),
        ]);
        if (subRes.ok) {
          const data = await subRes.json();
          setSubscribers(data.data ?? data ?? []);
        }
        if (qRes?.ok) {
          const data = await qRes.json();
          setQuestions(data.data ?? data ?? []);
        }
        if (signRes?.ok) {
          const data = await signRes.json();
          const signs = (data.data ?? data ?? []).filter((s: Record<string, unknown>) => s.status === "requested");
          setSignRequests(signs);
        }
      } catch (e) { /* graceful degradation */ }
      setLoading(false);
    })();
  }, [campaignId]);

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Section pills */}
      <div className="flex gap-2">
        {([
          { id: "subscribers" as const, label: "Newsletter Subscribers", count: subscribers.length },
          { id: "questions" as const, label: "Questions", count: questions.length },
          { id: "signs" as const, label: "Sign Requests", count: signRequests.length },
        ]).map((s) => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeSection === s.id ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"}`}>
            {s.label} <span className="ml-1 tabular-nums text-xs opacity-70">{s.count}</span>
          </button>
        ))}
      </div>

      {/* Newsletter Subscribers */}
      {activeSection === "subscribers" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Newsletter Subscribers</h3>
              <span className="text-xs text-slate-400">{subscribers.length} total</span>
            </div>
            <p className="text-[10px] text-slate-400">From campaign website signup forms</p>
          </div>
          {subscribers.length === 0 ? (
            <div className="p-10 text-center">
              <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No subscribers yet</p>
              <p className="text-xs text-slate-500 mt-1">Visitors who subscribe on your campaign website will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-[1fr_120px_100px_100px] gap-4 px-4 py-2 bg-slate-50">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Name</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Signed Up</span>
              </div>
              {subscribers.map((s) => (
                <div key={s.id} className="grid grid-cols-[1fr_120px_100px_100px] gap-4 px-4 py-2.5 hover:bg-slate-50">
                  <p className="text-sm font-medium text-slate-900 truncate">{s.email}</p>
                  <p className="text-xs text-slate-600 truncate">{[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}</p>
                  <div>{statusBadge(s.status)}</div>
                  <p className="text-xs text-slate-500">{formatDate(s.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Questions from Website */}
      {activeSection === "questions" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">Questions from Visitors</h3>
            <span className="text-xs text-slate-400">{questions.length} total</span>
          </div>
          {questions.length === 0 ? (
            <div className="p-10 text-center">
              <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No questions yet</p>
              <p className="text-xs text-slate-500 mt-1">Questions submitted on your campaign website will appear here for review and reply.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {questions.map((q) => (
                <div key={q.id} className="px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-slate-900">{q.name || "Anonymous"} {q.email && <span className="text-slate-400 font-normal">· {q.email}</span>}</p>
                    <p className="text-[10px] text-slate-400">{formatDate(q.createdAt)}</p>
                  </div>
                  <p className="text-sm text-slate-700">{q.question}</p>
                  {q.email && (
                    <a href={`mailto:${q.email}?subject=Re: Your question to our campaign&body=Thank you for reaching out. `}
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
                      <Mail className="w-3 h-3" /> Reply via email
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sign Requests */}
      {activeSection === "signs" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Lawn Sign Requests</h3>
            <span className="text-xs text-slate-400">{signRequests.length} pending</span>
          </div>
          {signRequests.length === 0 ? (
            <div className="p-10 text-center">
              <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No pending sign requests</p>
              <p className="text-xs text-slate-500 mt-1">Lawn sign requests from your campaign website will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {signRequests.map((s) => (
                <div key={s.id} className="px-4 py-3 hover:bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.address} {s.email && `· ${s.email}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(s.status)}
                    <p className="text-[10px] text-slate-400">{formatDate(s.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

function SettingsTab() {
  const providers = [
    { name: "Resend", type: "Email", status: "configured", desc: "Transactional + bulk email delivery", env: "RESEND_API_KEY" },
    { name: "Twilio", type: "SMS / Voice", status: "configured", desc: "SMS blasts, voice broadcasts, IVR", env: "TWILIO_ACCOUNT_SID" },
    { name: "Web Push", type: "Push Notifications", status: "configured", desc: "Browser push via VAPID keys", env: "VAPID_PUBLIC_KEY" },
  ];

  return (
    <div className="space-y-6">
      {/* Providers */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3">Delivery Providers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {providers.map((p) => (
            <div key={p.name} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm text-slate-900">{p.name}</p>
                {statusBadge(p.status === "configured" ? "active" : "draft")}
              </div>
              <p className="text-xs text-slate-500">{p.desc}</p>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">{p.env}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3">Compliance & Consent</h3>
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-slate-900">CASL Compliance</p>
              <p className="text-xs text-slate-500 mt-0.5">Email: unsubscribe footer + campaign identification auto-appended. SMS: "Reply STOP" + campaign name suffix.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-slate-900">CRTC Voice Compliance</p>
              <p className="text-xs text-slate-500 mt-0.5">Calling hours enforced (9am–9:30pm ET). Caller ID required. Opt-out mechanism built in.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-slate-900">DNC List Management</p>
              <p className="text-xs text-slate-500 mt-0.5">Do-Not-Contact contacts excluded by default from all sends. Managed per campaign.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sender identities */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3">Sender Identities</h3>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_100px] gap-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Identity</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Channel</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</span>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-[1fr_120px_100px] gap-4 items-center px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Poll City</p>
                <p className="text-xs text-slate-500">noreply@poll.city</p>
              </div>
              <span className="text-xs text-slate-600">Email</span>
              {statusBadge("active")}
            </div>
            <div className="grid grid-cols-[1fr_120px_100px] gap-4 items-center px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Twilio Number</p>
                <p className="text-xs text-slate-500">TWILIO_PHONE_NUMBER</p>
              </div>
              <span className="text-xs text-slate-600">SMS / Voice</span>
              {statusBadge("active")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
