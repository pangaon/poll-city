"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  Plus,
  BarChart2,
  Users,
  MapPin,
  Eye,
  EyeOff,
  Archive,
  Copy,
  Download,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Lock,
  Unlock,
  Zap,
  PenSquare,
  Layers,
  CheckSquare,
  Square,
} from "lucide-react";
import Link from "next/link";
import { FeatureGuide } from "@/components/ui";

interface QrCodeRow {
  id: string;
  token: string;
  slug: string | null;
  type: string;
  placementType: string | null;
  funnelType: string;
  label: string | null;
  locationName: string | null;
  status: string;
  scanCount: number;
  teaserMode: boolean;
  prospectCount: number;
  signOpportunityCount: number;
  publicUrl: string;
  qrImageUrl: string;
  createdAt: string;
}

interface Analytics {
  totalScans: number;
  uniqueScans: number;
  conversions: number;
  conversionRate: number;
  signRequests: number;
  volunteerLeads: number;
  updateSubscribers: number;
}

type Tab = "codes" | "analytics" | "prospects";

const PLACEMENT_LABELS: Record<string, string> = {
  bus_stop: "Bus Stop",
  crosswalk_pole: "Crosswalk Pole",
  event_booth: "Event Booth",
  festival: "Festival",
  campaign_sign: "Campaign Sign",
  lawn_sign: "Lawn Sign",
  flyer: "Flyer",
  poster: "Poster",
  storefront_partner: "Storefront Partner",
  community_board: "Community Board",
  volunteer_clipboard: "Volunteer Clipboard",
  print_material: "Print Material",
  door_hanger: "Door Hanger",
  campaign_office: "Campaign Office",
  pop_up_booth: "Pop-Up Booth",
  sponsorship_table: "Sponsorship Table",
  transit_shelter: "Transit Shelter",
  public_handout: "Public Handout",
  branded_merchandise: "Merchandise",
  other: "Other",
};

const FUNNEL_LABELS: Record<string, string> = {
  supporter_capture: "Supporter Capture",
  volunteer_signup: "Volunteer Sign-Up",
  sign_request: "Sign Request",
  event_rsvp: "Event RSVP",
  issue_pulse: "Issue Pulse",
  update_request: "Update Request",
  general_engagement: "General Engagement",
  donation: "Donation",
  petition: "Petition",
  survey: "Survey",
  candidate_intro: "Candidate Intro",
  smart_redirect: "Smart Redirect",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border border-green-500/30",
  inactive: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  archived: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  expired: "bg-red-500/20 text-red-400 border border-red-500/30",
};

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

export default function QrHubClient({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<Tab>("codes");
  const [qrCodes, setQrCodes] = useState<QrCodeRow[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [codesRes, analyticsRes] = await Promise.all([
      fetch(`/api/qr?campaignId=${campaignId}&limit=50`),
      fetch(`/api/qr/analytics?campaignId=${campaignId}&days=30`),
    ]);
    if (codesRes.ok) {
      const data = await codesRes.json();
      setQrCodes(data.qrCodes ?? []);
    }
    if (analyticsRes.ok) {
      setAnalytics(await analyticsRes.json());
    }
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { loadData(); }, [loadData]);

  const copyUrl = async (url: string, token: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const archiveCode = async (qrId: string) => {
    if (!confirm("Archive this QR code? It will stop accepting new scans.")) return;
    await fetch(`/api/qr/${qrId}?campaignId=${campaignId}`, { method: "DELETE" });
    loadData();
  };

  const activeCount = qrCodes.filter((q) => q.status === "active").length;
  const totalScans = qrCodes.reduce((s, q) => s + q.scanCount, 0);
  const teaserCodes = qrCodes.filter((q) => q.teaserMode).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <FeatureGuide
        featureKey="qr-hub"
        title="What is QR Capture?"
        description="QR codes let you capture supporter information at events without a paper form. Someone scans your code, fills in their details on their phone, and they appear instantly as a contact in your campaign."
        bullets={[
          "Generate a QR code for any event — rally, town hall, meet-and-greet",
          "Each scan creates a contact record automatically",
          "Track which events are generating the most sign-ups",
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <QrCode className="h-6 w-6 text-[#1D9E75]" />
            QR Capture
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Physical-to-digital capture network — scan, capture, convert
          </p>
        </div>
        <motion.button
          onClick={() => setShowCreate(true)}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#18896a] text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-lg"
        >
          <Plus className="h-4 w-4" />
          New QR Code
        </motion.button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Codes", value: activeCount, icon: QrCode, color: "text-green-400" },
          { label: "Total Scans", value: analytics?.totalScans ?? totalScans, icon: BarChart2, color: "text-blue-400" },
          { label: "Conversions", value: analytics?.conversions ?? 0, icon: Users, color: "text-purple-400" },
          { label: "Sign Requests", value: analytics?.signRequests ?? 0, icon: MapPin, color: "text-amber-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-800/60 border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-slate-400 text-xs font-medium">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Teaser alert */}
      {teaserCodes > 0 && (
        <div className="mb-5 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <Lock className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-amber-400 font-semibold text-sm">
              {teaserCodes} code{teaserCodes !== 1 ? "s are" : " is"} in teaser mode
            </div>
            <p className="text-slate-400 text-xs mt-1">
              These codes are capturing leads in the background. Upgrade to unlock and access them.
            </p>
            <Link
              href="/billing"
              className="text-amber-400 text-xs font-semibold hover:underline mt-1 inline-block"
            >
              Unlock prospects →
            </Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/60 border border-white/5 rounded-xl mb-6 w-fit">
        {(["codes", "analytics", "prospects"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? "bg-[#0A2342] text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "codes" ? "QR Codes" : t === "analytics" ? "Analytics" : "Prospects"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">

        {/* QR Codes list */}
        {tab === "codes" && (
          <motion.div
            key="codes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
          >
            {loading ? (
              <div className="text-center py-16 text-slate-400">Loading QR codes…</div>
            ) : qrCodes.length === 0 ? (
              <div className="text-center py-16">
                <QrCode className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">No QR codes yet</h3>
                <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
                  Create your first QR code and start capturing prospects from your physical campaign materials.
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-[#1D9E75] text-white px-5 py-2.5 rounded-xl font-semibold text-sm"
                >
                  Create first QR code
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {qrCodes.map((qr) => (
                  <motion.div
                    key={qr.id}
                    layout
                    className="bg-slate-800/60 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* QR thumbnail */}
                      <img
                        src={qr.qrImageUrl}
                        alt="QR code"
                        className="h-16 w-16 rounded-xl bg-white p-1 flex-shrink-0"
                        loading="lazy"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-white font-semibold text-sm truncate">
                            {qr.label ?? `QR — ${qr.type}`}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[qr.status] ?? STATUS_BADGE.active}`}>
                            {qr.status}
                          </span>
                          {qr.teaserMode && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <Lock className="h-2.5 w-2.5" />
                              teaser
                            </span>
                          )}
                        </div>

                        {qr.locationName && (
                          <div className="flex items-center gap-1 text-slate-400 text-xs mb-2">
                            <MapPin className="h-3 w-3" />
                            {qr.locationName}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <BarChart2 className="h-3 w-3" />
                            {qr.scanCount} scans
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {qr.prospectCount} prospects
                          </span>
                          {qr.placementType && (
                            <span>{PLACEMENT_LABELS[qr.placementType] ?? qr.placementType}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => copyUrl(qr.publicUrl, qr.token)}
                          title="Copy URL"
                          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                        >
                          {copiedToken === qr.token ? (
                            <span className="text-xs text-green-400 font-semibold">Copied!</span>
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <a
                          href={qr.qrImageUrl}
                          download={`qr-${qr.token}.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Download QR image"
                          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <Link
                          href={`/qr/${qr.id}`}
                          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        {qr.status !== "archived" && (
                          <button
                            onClick={() => archiveCode(qr.id)}
                            title="Archive"
                            className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Analytics tab */}
        {tab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
          >
            {analytics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: "Total Scans (30d)", value: analytics.totalScans },
                    { label: "Unique Scanners", value: analytics.uniqueScans },
                    { label: "Conversions", value: analytics.conversions },
                    { label: "Conversion Rate", value: `${analytics.conversionRate}%` },
                    { label: "Sign Requests", value: analytics.signRequests },
                    { label: "Volunteer Leads", value: analytics.volunteerLeads },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-800/60 border border-white/5 rounded-xl p-4">
                      <div className="text-slate-400 text-xs mb-1">{s.label}</div>
                      <div className="text-2xl font-bold text-white">{s.value.toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-800/60 border border-white/5 rounded-xl p-4">
                  <h3 className="text-white font-semibold text-sm mb-3">Intent Breakdown</h3>
                  <Link
                    href={`/qr/prospects?campaignId=${campaignId}`}
                    className="text-[#1D9E75] text-sm hover:underline font-medium"
                  >
                    View all prospects →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <BarChart2 className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                No scan data yet. Scans will appear here once your QR codes start getting used.
              </div>
            )}
          </motion.div>
        )}

        {/* Prospects quick view */}
        {tab === "prospects" && (
          <motion.div
            key="prospects"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Prospect Inbox</h3>
              <Link
                href={`/qr/prospects`}
                className="text-[#1D9E75] text-sm font-semibold hover:underline"
              >
                Open full inbox →
              </Link>
            </div>
            <ProspectsQuickView campaignId={campaignId} />
          </motion.div>
        )}

      </AnimatePresence>

      {/* Create QR Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateQrModal
            campaignId={campaignId}
            onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); loadData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Prospects quick view ───────────────────────────────────────────────────

function ProspectsQuickView({ campaignId }: { campaignId: string }) {
  const [prospects, setProspects] = useState<Array<{
    id: string;
    prospectType: string;
    name: string | null;
    intent: string | null;
    score: number;
    isLocked: boolean;
    signRequested: boolean;
    volunteerInterest: boolean;
    locationCluster: string | null;
    createdAt: string;
    qrLabel: string | null;
  }>>([]);
  const [teaserStats, setTeaserStats] = useState({ lockedTotal: 0, lockedSignRequests: 0, lockedVolunteerLeads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/qr/prospects?campaignId=${campaignId}&limit=10`)
      .then((r) => r.json())
      .then((data) => {
        setProspects(data.prospects ?? []);
        setTeaserStats(data.teaserStats ?? { lockedTotal: 0, lockedSignRequests: 0, lockedVolunteerLeads: 0 });
      })
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) return <div className="text-slate-400 text-sm">Loading…</div>;

  const TYPE_EMOJI: Record<string, string> = {
    supporter: "✊",
    volunteer_lead: "🙋",
    sign_request: "🪧",
    update_subscriber: "📬",
    issue_responder: "🔍",
    event_attendee: "🎟️",
    donor_lead: "💚",
    anonymous_engagement: "👀",
  };

  return (
    <div className="space-y-2">
      {teaserStats.lockedTotal > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 mb-4">
          <Lock className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-amber-400 text-sm font-semibold">
              {teaserStats.lockedTotal} locked prospect{teaserStats.lockedTotal !== 1 ? "s" : ""}
            </div>
            <div className="text-slate-400 text-xs">
              {teaserStats.lockedSignRequests} sign requests · {teaserStats.lockedVolunteerLeads} volunteer leads
            </div>
          </div>
          <Link href="/billing" className="text-amber-400 text-xs font-semibold hover:underline">
            Unlock →
          </Link>
        </div>
      )}

      {prospects.length === 0 && teaserStats.lockedTotal === 0 ? (
        <div className="text-center py-10 text-slate-500 text-sm">
          No prospects captured yet. Share your QR codes to start building your pipeline.
        </div>
      ) : (
        prospects.map((p) => (
          <Link
            key={p.id}
            href={`/qr/prospects/${p.id}`}
            className="flex items-center gap-3 p-3 bg-slate-800/40 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
          >
            <span className="text-xl flex-shrink-0">{TYPE_EMOJI[p.prospectType] ?? "👤"}</span>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">
                {p.isLocked ? "Locked prospect" : (p.name ?? "Anonymous")}
              </div>
              <div className="text-slate-400 text-xs truncate">
                {p.intent?.replace(/_/g, " ")} · {p.qrLabel ?? "QR scan"}
                {p.locationCluster ? ` · ${p.locationCluster}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {p.signRequested && <span title="Sign requested">🪧</span>}
              {p.volunteerInterest && <span title="Volunteer interest">🙋</span>}
              {p.isLocked ? (
                <Lock className="h-3 w-3 text-amber-400" />
              ) : (
                <div className="text-xs font-bold text-[#1D9E75]">{p.score}</div>
              )}
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

// ── Create QR Modal ────────────────────────────────────────────────────────

const QR_TYPES = [
  { value: "campaign",           label: "Campaign"           },
  { value: "event_booth",        label: "Event Booth"        },
  { value: "location",           label: "Location / Transit" },
  { value: "lawn_sign",          label: "Lawn Sign"          },
  { value: "flyer_print",        label: "Flyer / Print"      },
  { value: "volunteer_capture",  label: "Volunteer Capture"  },
  { value: "issue_petition",     label: "Issue / Petition"   },
  { value: "smart_dynamic",      label: "Smart Dynamic"      },
  { value: "generic_social",     label: "Generic (Public)"   },
];

const FUNNEL_TYPES = [
  { value: "general_engagement", label: "General Engagement" },
  { value: "supporter_capture",  label: "Supporter Capture"  },
  { value: "volunteer_signup",   label: "Volunteer Sign-Up"  },
  { value: "sign_request",       label: "Sign Request"       },
  { value: "event_rsvp",         label: "Event RSVP"         },
  { value: "issue_pulse",        label: "Issue Pulse"        },
  { value: "update_request",     label: "Stay Updated"       },
  { value: "donation",           label: "Donation"           },
];

const PLACEMENT_TYPES = Object.entries(PLACEMENT_LABELS).map(([value, label]) => ({ value, label }));

// Smart defaults: picking a placement pre-fills type + funnel
const PLACEMENT_DEFAULTS: Record<string, { type: string; funnelType: string }> = {
  bus_stop:            { type: "location",          funnelType: "general_engagement" },
  transit_shelter:     { type: "location",          funnelType: "general_engagement" },
  crosswalk_pole:      { type: "location",          funnelType: "general_engagement" },
  lawn_sign:           { type: "lawn_sign",         funnelType: "supporter_capture"  },
  campaign_sign:       { type: "lawn_sign",         funnelType: "supporter_capture"  },
  event_booth:         { type: "event_booth",       funnelType: "event_rsvp"         },
  pop_up_booth:        { type: "event_booth",       funnelType: "event_rsvp"         },
  festival:            { type: "event_booth",       funnelType: "event_rsvp"         },
  sponsorship_table:   { type: "event_booth",       funnelType: "event_rsvp"         },
  flyer:               { type: "flyer_print",       funnelType: "general_engagement" },
  poster:              { type: "flyer_print",       funnelType: "general_engagement" },
  door_hanger:         { type: "flyer_print",       funnelType: "general_engagement" },
  print_material:      { type: "flyer_print",       funnelType: "general_engagement" },
  public_handout:      { type: "flyer_print",       funnelType: "general_engagement" },
  volunteer_clipboard: { type: "volunteer_capture", funnelType: "volunteer_signup"   },
  campaign_office:     { type: "campaign",          funnelType: "supporter_capture"  },
  community_board:     { type: "campaign",          funnelType: "general_engagement" },
  storefront_partner:  { type: "campaign",          funnelType: "general_engagement" },
  branded_merchandise: { type: "generic_social",    funnelType: "general_engagement" },
};

const ALL_INTENTS = [
  { value: "support",             label: "I support this candidate", emoji: "✊" },
  { value: "keep_updated",        label: "Keep me updated",          emoji: "📬" },
  { value: "volunteer",           label: "I want to volunteer",      emoji: "🙋" },
  { value: "request_sign",        label: "I want a lawn sign",       emoji: "🪧" },
  { value: "more_info",           label: "Tell me more",             emoji: "ℹ️" },
  { value: "donate",              label: "I want to donate",         emoji: "💚" },
  { value: "concern",             label: "I have a concern",         emoji: "💬" },
  { value: "live_nearby",         label: "I live nearby",            emoji: "🏠" },
  { value: "help_at_location",    label: "I can help here",          emoji: "🤝" },
  { value: "interested_in_issue", label: "I care about an issue",    emoji: "🔍" },
  { value: "attend_event",        label: "Attend an event",          emoji: "🎟️" },
  { value: "just_browsing",       label: "Just browsing",            emoji: "👀" },
];

const DEFAULT_INTENTS = ["keep_updated", "support", "volunteer", "request_sign", "more_info", "just_browsing"];

type ModalMode = "quick" | "full" | "batch";

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 placeholder-slate-600";
const selectCls = "w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-white/30";
const labelCls = "text-slate-300 text-xs font-semibold uppercase tracking-wider block mb-1.5";

function TeaserToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-amber-500" : "bg-slate-600"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
      <div>
        <div className="text-white text-sm font-medium">Teaser mode</div>
        <div className="text-slate-400 text-xs">Capture leads in background — reveal after upgrade</div>
      </div>
    </div>
  );
}

async function safeJsonError(res: Response): Promise<string> {
  try {
    const d = await res.json();
    return d.error ?? `Server error ${res.status}`;
  } catch {
    return `Server error ${res.status}`;
  }
}

function CreateQrModal({
  campaignId,
  onClose,
  onCreated,
}: {
  campaignId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [mode, setMode] = useState<ModalMode>("quick");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Quick form ──────────────────────────────────────────────────────────
  const [quick, setQuick] = useState({ label: "", placementType: "", locationName: "", teaserMode: false });

  // ── Full form ───────────────────────────────────────────────────────────
  const [full, setFull] = useState({
    label: "", type: "campaign", funnelType: "general_engagement",
    placementType: "", locationName: "", locationAddress: "",
    headline: "", subheadline: "", teaserMode: false,
    enabledIntents: DEFAULT_INTENTS,
  });

  // ── Batch form ──────────────────────────────────────────────────────────
  const [batch, setBatch] = useState({
    placementType: "", funnelType: "general_engagement", type: "location",
    teaserMode: false, headline: "",
    batchMode: "auto" as "auto" | "list",
    prefix: "", count: "5",
    locations: "",
  });

  const handleFullPlacementChange = (p: string) => {
    const d = PLACEMENT_DEFAULTS[p];
    setFull((f) => ({ ...f, placementType: p, ...(d ? { type: d.type, funnelType: d.funnelType } : {}) }));
  };

  const handleBatchPlacementChange = (p: string) => {
    const d = PLACEMENT_DEFAULTS[p];
    setBatch((f) => ({ ...f, placementType: p, ...(d ? { type: d.type, funnelType: d.funnelType } : {}) }));
  };

  const toggleIntent = (intent: string) => {
    setFull((f) => ({
      ...f,
      enabledIntents: f.enabledIntents.includes(intent)
        ? f.enabledIntents.filter((i) => i !== intent)
        : [...f.enabledIntents, intent],
    }));
  };

  const batchCount = batch.batchMode === "auto"
    ? Math.min(30, Math.max(1, parseInt(batch.count, 10) || 1))
    : batch.locations.split("\n").filter((l) => l.trim()).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let ok = false;

      if (mode === "quick") {
        const d = PLACEMENT_DEFAULTS[quick.placementType] ?? { type: "campaign", funnelType: "general_engagement" };
        const res = await fetch("/api/qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId, type: d.type, funnelType: d.funnelType,
            placementType: quick.placementType || undefined,
            label: quick.label || undefined,
            locationName: quick.locationName || undefined,
            teaserMode: quick.teaserMode,
          }),
        });
        if (!res.ok) { setError(await safeJsonError(res)); return; }
        ok = true;

      } else if (mode === "full") {
        const res = await fetch("/api/qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId, type: full.type, funnelType: full.funnelType,
            placementType: full.placementType || undefined,
            label: full.label || undefined,
            locationName: full.locationName || undefined,
            locationAddress: full.locationAddress || undefined,
            teaserMode: full.teaserMode,
            landingConfig: {
              headline: full.headline || undefined,
              subheadline: full.subheadline || undefined,
              enabledIntents: full.enabledIntents.length > 0 ? full.enabledIntents : undefined,
            },
          }),
        });
        if (!res.ok) { setError(await safeJsonError(res)); return; }
        ok = true;

      } else {
        const lines = batch.batchMode === "auto"
          ? Array.from({ length: batchCount }, (_, i) => (batch.prefix ? `${batch.prefix} #${i + 1}` : `Code #${i + 1}`))
          : batch.locations.split("\n").map((l) => l.trim()).filter(Boolean);

        if (lines.length === 0) { setError("Enter at least one location."); return; }
        if (lines.length > 30) { setError("Maximum 30 per batch."); return; }

        const items = lines.map((l) => ({ label: l, locationName: l }));
        const res = await fetch("/api/qr/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId, items,
            shared: {
              type: batch.type, funnelType: batch.funnelType,
              placementType: batch.placementType || undefined,
              teaserMode: batch.teaserMode,
              landingConfig: batch.headline ? { headline: batch.headline } : undefined,
            },
          }),
        });
        if (!res.ok) { setError(await safeJsonError(res)); return; }
        ok = true;
      }

      if (ok) onCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const MODES = [
    { id: "quick" as ModalMode,  label: "Quick",      desc: "3 fields, done" },
    { id: "full"  as ModalMode,  label: "Full Setup",  desc: "All options"   },
    { id: "batch" as ModalMode,  label: "Batch",       desc: "Up to 30 codes" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-white font-bold text-lg">Create QR Code</h2>
              <p className="text-slate-400 text-xs mt-0.5">Physical-to-digital prospect capture</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
          </div>
          {/* Mode tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-xl">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setMode(m.id); setError(null); }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-center ${
                  mode === m.id
                    ? "bg-[#0A2342] text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <div>{m.label}</div>
                <div className={`text-[10px] font-normal mt-0.5 ${mode === m.id ? "text-slate-400" : "text-slate-600"}`}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* ── QUICK MODE ─────────────────────────────────────────────── */}
          {mode === "quick" && (
            <>
              <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-xl p-3 text-slate-300 text-xs">
                Pick a placement and we handle the rest — type and funnel are set automatically.
              </div>
              <div>
                <label className={labelCls}>Placement</label>
                <select value={quick.placementType} onChange={(e) => setQuick((f) => ({ ...f, placementType: e.target.value }))} className={selectCls}>
                  <option value="" className="bg-slate-900">Where will this QR code live?</option>
                  {PLACEMENT_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-slate-900">{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Label <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. Finch & Yonge Bus Stop" value={quick.label} onChange={(e) => setQuick((f) => ({ ...f, label: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Location <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. Finch Ave W & Yonge St" value={quick.locationName} onChange={(e) => setQuick((f) => ({ ...f, locationName: e.target.value }))} className={inputCls} />
              </div>
              <TeaserToggle value={quick.teaserMode} onChange={(v) => setQuick((f) => ({ ...f, teaserMode: v }))} />
            </>
          )}

          {/* ── FULL MODE ──────────────────────────────────────────────── */}
          {mode === "full" && (
            <>
              <div>
                <label className={labelCls}>Label</label>
                <input type="text" placeholder="e.g. Finch & Yonge Bus Stop" value={full.label} onChange={(e) => setFull((f) => ({ ...f, label: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Placement</label>
                <select value={full.placementType} onChange={(e) => handleFullPlacementChange(e.target.value)} className={selectCls}>
                  <option value="" className="bg-slate-900">Select placement…</option>
                  {PLACEMENT_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-slate-900">{t.label}</option>)}
                </select>
                {full.placementType && PLACEMENT_DEFAULTS[full.placementType] && (
                  <p className="text-slate-500 text-xs mt-1">Auto-set: {QR_TYPES.find(t => t.value === full.type)?.label} · {FUNNEL_TYPES.find(t => t.value === full.funnelType)?.label}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Type</label>
                  <select value={full.type} onChange={(e) => setFull((f) => ({ ...f, type: e.target.value }))} className={selectCls}>
                    {QR_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-slate-900">{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Funnel</label>
                  <select value={full.funnelType} onChange={(e) => setFull((f) => ({ ...f, funnelType: e.target.value }))} className={selectCls}>
                    {FUNNEL_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-slate-900">{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Location Name</label>
                <input type="text" placeholder="e.g. Finch & Yonge Transit Shelter" value={full.locationName} onChange={(e) => setFull((f) => ({ ...f, locationName: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Landing Headline</label>
                  <input type="text" placeholder="Your Ward, Your Voice" value={full.headline} onChange={(e) => setFull((f) => ({ ...f, headline: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Subheadline</label>
                  <input type="text" placeholder="Connect with your team" value={full.subheadline} onChange={(e) => setFull((f) => ({ ...f, subheadline: e.target.value }))} className={inputCls} />
                </div>
              </div>
              {/* Intent multi-select */}
              <div>
                <label className={labelCls}>Enabled Intents <span className="text-slate-600 normal-case font-normal">({full.enabledIntents.length} selected)</span></label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_INTENTS.map((intent) => {
                    const on = full.enabledIntents.includes(intent.value);
                    return (
                      <button
                        key={intent.value}
                        type="button"
                        onClick={() => toggleIntent(intent.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-left transition-colors ${
                          on
                            ? "bg-[#1D9E75]/20 border-[#1D9E75]/40 text-[#1D9E75]"
                            : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                        }`}
                      >
                        {on ? <CheckSquare className="h-3 w-3 flex-shrink-0" /> : <Square className="h-3 w-3 flex-shrink-0" />}
                        <span className="truncate">{intent.emoji} {intent.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <TeaserToggle value={full.teaserMode} onChange={(v) => setFull((f) => ({ ...f, teaserMode: v }))} />
            </>
          )}

          {/* ── BATCH MODE ─────────────────────────────────────────────── */}
          {mode === "batch" && (
            <>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-slate-300 text-xs">
                Generate up to 30 QR codes at once — perfect for blanketing a transit corridor or deploying across all your lawn signs.
              </div>
              <div>
                <label className={labelCls}>Placement (all codes)</label>
                <select value={batch.placementType} onChange={(e) => handleBatchPlacementChange(e.target.value)} className={selectCls}>
                  <option value="" className="bg-slate-900">Select placement type…</option>
                  {PLACEMENT_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-slate-900">{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Type</label>
                  <select value={batch.type} onChange={(e) => setBatch((f) => ({ ...f, type: e.target.value }))} className={selectCls}>
                    {QR_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-slate-900">{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Funnel</label>
                  <select value={batch.funnelType} onChange={(e) => setBatch((f) => ({ ...f, funnelType: e.target.value }))} className={selectCls}>
                    {FUNNEL_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-slate-900">{t.label}</option>)}
                  </select>
                </div>
              </div>
              {/* How to name them */}
              <div>
                <label className={labelCls}>Naming Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["auto", "list"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setBatch((f) => ({ ...f, batchMode: m }))}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                        batch.batchMode === m
                          ? "bg-[#0A2342] border-blue-500/40 text-white"
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      {m === "auto" ? "Auto-number" : "Location list"}
                    </button>
                  ))}
                </div>
              </div>
              {batch.batchMode === "auto" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Name Prefix</label>
                    <input type="text" placeholder="e.g. Bus Stop" value={batch.prefix} onChange={(e) => setBatch((f) => ({ ...f, prefix: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Count (max 30)</label>
                    <input type="number" min={1} max={30} value={batch.count} onChange={(e) => setBatch((f) => ({ ...f, count: e.target.value }))} className={inputCls} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className={labelCls}>Locations (one per line)</label>
                  <textarea
                    placeholder={"Finch & Yonge\nFinch & Bathurst\nFinch & Jane\nFinch & Keele"}
                    value={batch.locations}
                    onChange={(e) => setBatch((f) => ({ ...f, locations: e.target.value }))}
                    rows={5}
                    className={`${inputCls} resize-none`}
                  />
                  <p className="text-slate-500 text-xs mt-1">{batchCount} location{batchCount !== 1 ? "s" : ""} · max 30</p>
                </div>
              )}
              <div>
                <label className={labelCls}>Landing Headline (all codes)</label>
                <input type="text" placeholder="Your Ward, Your Voice" value={batch.headline} onChange={(e) => setBatch((f) => ({ ...f, headline: e.target.value }))} className={inputCls} />
              </div>
              <TeaserToggle value={batch.teaserMode} onChange={(v) => setBatch((f) => ({ ...f, teaserMode: v }))} />
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <Layers className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                <div className="text-white font-bold text-lg">{batchCount}</div>
                <div className="text-slate-400 text-xs">QR codes will be created</div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={submitting}
              whileTap={{ scale: 0.97 }}
              className="flex-1 py-3 rounded-xl bg-[#1D9E75] text-white text-sm font-bold disabled:opacity-50 hover:bg-[#18896a] transition-colors"
            >
              {submitting
                ? "Creating…"
                : mode === "batch"
                  ? `Create ${batchCount} QR Code${batchCount !== 1 ? "s" : ""}`
                  : "Create QR Code"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
