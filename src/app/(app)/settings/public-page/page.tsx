"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Upload, Save, ExternalLink, Check, Lock, ChevronDown, ChevronUp,
  Globe, Palette, Type, Layout, Image as ImageIcon, BarChart3, QrCode,
  Code, Eye, Pencil, Plus, Trash2, Download, Loader2, Building2,
  Calendar, Users, Bell, Zap, Star, Trophy, Mail, Clock, Copy, Share2,
} from "lucide-react";
import { Button, Card, CardContent, Input, FormField, Textarea, Select, PageHeader } from "@/components/ui";
import { toast } from "sonner";

/* ── Types ──────────────────────────────────────────────────────────────── */
type Theme = "classic-blue" | "bold-red" | "modern-dark" | "clean-white" | "campaign-green" | "royal-purple";
type FontPair = "playfair-sourcesans" | "inter-inter" | "merriweather-opensans" | "montserrat-lato" | "georgia-arial";
type PageLayout = "professional" | "modern" | "bold" | "minimal";

interface Endorsement { id: string; org: string; logoUrl: string; quote: string; }
interface FaqItem { id: string; q: string; a: string; }
interface OfficeHour { id: string; day: string; time: string; location: string; }
interface Committee { id: string; name: string; role: string; }
interface Accomplishment { id: string; date: string; title: string; description: string; }

interface PageCustomization {
  primaryColor: string;
  accentColor: string;
  theme: Theme;
  fontPair: FontPair;
  layout: PageLayout;
  heroBannerUrl: string;
  heroVideoUrl: string;
  showSocialProof: boolean;
  showCountdown: boolean;
  showLivePoll: boolean;
  showDoorCounter: boolean;
  showSupporterWall: boolean;
  endorsements: Endorsement[];
  customFaq: FaqItem[];
  showEmailCapture: boolean;
  emailCaptureHeadline: string;
  emailCaptureButtonText: string;
  showDonation: boolean;
  donationAmounts: string;
  officeHours: OfficeHour[];
  committees: Committee[];
  votingRecordUrl: string;
  accomplishments: Accomplishment[];
  showNewsletter: boolean;
  newsletterName: string;
  townHallUrl: string;
  metaTitle: string;
  metaDescription: string;
  qrLabel: string;
  qrSize: "small" | "medium" | "large";
  hidePolCityBranding: boolean;
  customCss: string;
  customFooterText: string;
}

const DEFAULT: PageCustomization = {
  primaryColor: "#1e40af",
  accentColor: "#3b82f6",
  theme: "classic-blue",
  fontPair: "inter-inter",
  layout: "professional",
  heroBannerUrl: "",
  heroVideoUrl: "",
  showSocialProof: true,
  showCountdown: true,
  showLivePoll: false,
  showDoorCounter: false,
  showSupporterWall: false,
  endorsements: [],
  customFaq: [],
  showEmailCapture: false,
  emailCaptureHeadline: "Stay in the loop",
  emailCaptureButtonText: "Subscribe",
  showDonation: false,
  donationAmounts: "10, 25, 50, 100",
  officeHours: [],
  committees: [],
  votingRecordUrl: "",
  accomplishments: [],
  showNewsletter: false,
  newsletterName: "",
  townHallUrl: "",
  metaTitle: "",
  metaDescription: "",
  qrLabel: "",
  qrSize: "medium",
  hidePolCityBranding: false,
  customCss: "",
  customFooterText: "",
};

/* ── Theme definitions ───────────────────────────────────────────────────── */
const THEMES: { id: Theme; label: string; primary: string; bg: string; text: string; desc: string }[] = [
  { id: "classic-blue",    label: "Classic Blue",    primary: "#1e3a8a", bg: "#eff6ff", text: "#1e3a8a", desc: "Professional politician look" },
  { id: "bold-red",        label: "Bold Red",         primary: "#dc2626", bg: "#fef2f2", text: "#991b1b", desc: "High energy campaign feel" },
  { id: "modern-dark",     label: "Modern Dark",      primary: "#111827", bg: "#f9fafb", text: "#d97706", desc: "Sophisticated executive look" },
  { id: "clean-white",     label: "Clean White",      primary: "#2563eb", bg: "#ffffff", text: "#1d4ed8", desc: "Modern tech feel" },
  { id: "campaign-green",  label: "Campaign Green",   primary: "#15803d", bg: "#f0fdf4", text: "#166534", desc: "Progressive fresh feel" },
  { id: "royal-purple",    label: "Royal Purple",     primary: "#7c3aed", bg: "#faf5ff", text: "#6d28d9", desc: "Distinctive memorable look" },
];

const FONTS: { id: FontPair; headline: string; body: string; desc: string }[] = [
  { id: "playfair-sourcesans", headline: "Playfair Display",  body: "Source Sans Pro", desc: "Classic authoritative" },
  { id: "inter-inter",         headline: "Inter",              body: "Inter",            desc: "Modern clean tech" },
  { id: "merriweather-opensans",headline: "Merriweather",     body: "Open Sans",        desc: "Readable traditional" },
  { id: "montserrat-lato",     headline: "Montserrat",         body: "Lato",             desc: "Contemporary bold" },
  { id: "georgia-arial",       headline: "Georgia",            body: "Arial",            desc: "Classic reliable" },
];

const LAYOUTS: { id: PageLayout; label: string; desc: string; icon: string }[] = [
  { id: "professional", label: "Professional", desc: "Headshot left, content right", icon: "⬛⬛" },
  { id: "modern",       label: "Modern",       desc: "Full width hero, centered",    icon: "▬▬" },
  { id: "bold",         label: "Bold",         desc: "Large type, dramatic spacing", icon: "▰▰" },
  { id: "minimal",      label: "Minimal",      desc: "Clean whitespace, elegant",    icon: "░░" },
];

/* ── Plan tiers ──────────────────────────────────────────────────────────── */
type Plan = "free" | "starter" | "pro" | "command" | "official";

const PLAN_ORDER: Record<Plan, number> = { free: 0, starter: 1, pro: 2, official: 2, command: 3 };

function canAccess(userPlan: Plan, required: Plan): boolean {
  return PLAN_ORDER[userPlan] >= PLAN_ORDER[required];
}

/* ── Gate overlay ────────────────────────────────────────────────────────── */
function GateOverlay({ plan, feature, userPlan }: { plan: Plan; feature: string; userPlan: Plan }) {
  if (canAccess(userPlan, plan)) return null;
  const labels: Record<Plan, string> = { free: "Free Trial", starter: "Starter", pro: "Pro", command: "Command", official: "Elected Official" };
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center">
      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
        <Lock className="w-4 h-4 text-amber-600" />
      </div>
      <p className="text-sm font-semibold text-gray-800">{labels[plan]} required</p>
      <p className="text-xs text-gray-500">{feature}</p>
      <a href="/billing" className="mt-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">
        Upgrade Now →
      </a>
    </div>
  );
}

/* ── Section wrapper ─────────────────────────────────────────────────────── */
function Section({
  icon: Icon, title, badge, plan, userPlan, children, defaultOpen = true,
}: {
  icon: React.ElementType; title: string; badge?: string; plan?: Plan; userPlan: Plan;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const locked = plan ? !canAccess(userPlan, plan) : false;
  const planLabels: Record<Plan, string> = { free: "Free", starter: "Starter+", pro: "Pro+", command: "Command", official: "Official" };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${open ? "bg-gray-50" : "bg-white hover:bg-gray-50"}`}
      >
        <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="font-semibold text-sm text-gray-900 flex-1">{title}</span>
        {badge && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${locked ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
            {badge}
          </span>
        )}
        {plan && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${locked ? "bg-gray-100 text-gray-400" : "bg-emerald-100 text-emerald-700"}`}>
            {planLabels[plan]}
          </span>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="relative px-4 pb-4 pt-3 space-y-4">
          {plan && <GateOverlay plan={plan} feature={title} userPlan={userPlan} />}
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Toggle card ─────────────────────────────────────────────────────────── */
function ToggleCard({
  icon: Icon, label, desc, value, onChange,
}: {
  icon: React.ElementType; label: string; desc: string;
  value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!value)}
      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
        value ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${value ? "bg-blue-600" : "bg-gray-100"}`}>
        <Icon className={`w-4 h-4 ${value ? "text-white" : "text-gray-500"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <div className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${value ? "bg-blue-600" : "bg-gray-200"}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? "left-5" : "left-0.5"}`} />
      </div>
    </div>
  );
}

/* ── Live Preview ────────────────────────────────────────────────────────── */
function LivePreview({ c, candidateName, candidateTitle, jurisdiction, logoUrl }: {
  c: PageCustomization;
  candidateName: string;
  candidateTitle: string;
  jurisdiction: string;
  logoUrl: string;
}) {
  const theme = THEMES.find(t => t.id === c.theme) ?? THEMES[0];
  const font = FONTS.find(f => f.id === c.fontPair) ?? FONTS[1];
  const primary = c.primaryColor || theme.primary;

  return (
    <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 text-xs" style={{ fontFamily: font.body }}>
      {/* Hero */}
      <div
        className="relative px-4 py-5 text-white"
        style={{
          background: c.heroBannerUrl
            ? `linear-gradient(135deg, ${primary}dd, ${primary}99), url(${c.heroBannerUrl}) center/cover`
            : `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`,
        }}
      >
        <div className={`flex ${c.layout === "professional" ? "flex-row items-center gap-3" : "flex-col items-center text-center gap-2"}`}>
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full border-2 border-white shadow flex items-center justify-center flex-shrink-0 overflow-hidden font-bold text-sm"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            {logoUrl ? (
              <Image src={logoUrl} alt="" width={48} height={48} className="object-cover w-full h-full" unoptimized />
            ) : (
              (candidateName || "C").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
            )}
          </div>
          <div className={c.layout !== "professional" ? "text-center" : ""}>
            <div className="font-black text-base leading-tight" style={{ fontFamily: font.headline }}>
              {candidateName || "Your Name"}
            </div>
            <div className="text-white/80 text-xs">{candidateTitle || "Candidate Title"}</div>
            <div className="text-white/60 text-[10px] mt-0.5">{jurisdiction || "Ward / City"}</div>
          </div>
        </div>

        {/* Social proof bar */}
        {c.showSocialProof && (
          <div className="flex gap-3 mt-3 text-[10px] text-white/80">
            <span>👥 142 supporters</span>
            <span>🪧 38 sign requests</span>
            <span>🙋 12 volunteers</span>
          </div>
        )}

        {/* Countdown */}
        {c.showCountdown && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-white/15 text-white/90 text-[10px] px-2 py-1 rounded-full border border-white/20">
            <Clock className="w-2.5 h-2.5" /> 204 days until election
          </div>
        )}
      </div>

      {/* Body */}
      <div className="bg-white px-4 py-3 space-y-3">
        {/* Endorsements */}
        {c.endorsements.length > 0 && (
          <div className="border border-gray-100 rounded-lg p-2">
            <p className="font-bold text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Endorsed by</p>
            {c.endorsements.slice(0, 2).map(e => (
              <div key={e.id} className="flex items-center gap-1.5 mb-1">
                <div className="w-4 h-4 rounded bg-gray-100 flex-shrink-0" />
                <span className="text-[10px] text-gray-700 font-medium">{e.org}</span>
              </div>
            ))}
          </div>
        )}

        {/* Live poll */}
        {c.showLivePoll && (
          <div className="border border-blue-100 bg-blue-50 rounded-lg p-2">
            <p className="font-bold text-[10px] text-blue-700 mb-1">📊 Quick Poll</p>
            <p className="text-[10px] text-gray-700 mb-1">Should we expand transit?</p>
            <div className="space-y-1">
              {["Yes — absolutely!", "No — not yet"].map(opt => (
                <div key={opt} className="h-4 bg-white rounded border border-blue-200 flex items-center px-1.5">
                  <span className="text-[9px] text-gray-600">{opt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom FAQ */}
        {c.customFaq.length > 0 && (
          <div>
            <p className="font-bold text-[10px] text-gray-500 uppercase tracking-wide mb-1">FAQ</p>
            {c.customFaq.slice(0, 2).map(f => (
              <div key={f.id} className="border-b border-gray-100 py-1">
                <p className="text-[10px] font-semibold text-gray-800">{f.q}</p>
              </div>
            ))}
          </div>
        )}

        {/* Email capture */}
        {c.showEmailCapture && (
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-[10px] font-semibold text-gray-800 mb-1">{c.emailCaptureHeadline || "Stay in the loop"}</p>
            <div className="h-5 bg-white border border-gray-200 rounded text-[9px] flex items-center px-2 text-gray-400 mb-1">Enter email…</div>
            <div
              className="h-5 rounded text-white text-[9px] flex items-center justify-center font-bold"
              style={{ background: primary }}
            >
              {c.emailCaptureButtonText || "Subscribe"}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {["Volunteer", "Request a Sign", "Show Support", "Ask a Question"].map((label, i) => (
            <div
              key={label}
              className="h-7 rounded-lg text-[9px] font-bold flex items-center justify-center"
              style={i === 0 ? { background: primary, color: "#fff" } : { background: "#f3f4f6", color: "#374151" }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Office hours (official widget) */}
        {c.officeHours.length > 0 && (
          <div className="border border-gray-100 rounded-lg p-2">
            <p className="font-bold text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">🏛️ Office Hours</p>
            {c.officeHours.slice(0, 2).map(oh => (
              <div key={oh.id} className="text-[10px] text-gray-700">{oh.day} · {oh.time} · {oh.location}</div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-gray-100 text-center text-[9px] text-gray-400">
          {c.hidePolCityBranding
            ? (c.customFooterText || "")
            : "Powered by Poll City · poll.city"}
        </div>
      </div>
    </div>
  );
}

/* ── QR Code display ─────────────────────────────────────────────────────── */
function QrCodeDisplay({ url, label, size }: { url: string; label: string; size: "small" | "medium" | "large" }) {
  const px = size === "small" ? 120 : size === "large" ? 240 : 180;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${px}x${px}&data=${encodeURIComponent(url)}&format=png&margin=10`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="border-2 border-gray-200 rounded-xl p-3 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="QR Code" width={px} height={px} className="block" />
        {label && <p className="text-center text-xs text-gray-600 mt-2 font-medium">{label}</p>}
      </div>
      <div className="flex gap-2">
        <a
          href={qrUrl}
          download="qr-code.png"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> PNG
        </a>
        <a
          href={`https://api.qrserver.com/v1/create-qr-code/?size=${px}x${px}&data=${encodeURIComponent(url)}&format=svg&margin=10`}
          download="qr-code.svg"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> SVG
        </a>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function PublicPageSettings() {
  const [campaign, setCampaign] = useState<{
    id: string; slug: string; candidateName: string | null;
    candidateTitle: string | null; candidateBio: string | null;
    jurisdiction: string | null; logoUrl: string | null;
    primaryColor: string; customDomain: string | null;
    isPublic: boolean; pageViews: number;
    customization: Partial<PageCustomization> | null;
    plan?: Plan;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [c, setC] = useState<PageCustomization>(DEFAULT);

  // Derived
  const userPlan: Plan = (campaign?.plan ?? "pro") as Plan;
  const campaignSlug = (campaign?.slug ?? "").trim();
  const candidatePath = campaignSlug ? `/candidates/${campaignSlug}` : "/candidates";
  const pagePathPreview = `poll.city${candidatePath}`;
  const pageUrl = typeof window !== "undefined" && campaignSlug
    ? `${window.location.origin}${candidatePath}`
    : "";

  useEffect(() => {
    fetch("/api/campaigns/current")
      .then(r => r.json())
      .then(data => {
        setCampaign(data);
        if (data.customization) {
          setC({ ...DEFAULT, ...data.customization, primaryColor: data.customization.primaryColor || data.primaryColor || DEFAULT.primaryColor });
        } else {
          setC({ ...DEFAULT, primaryColor: data.primaryColor || DEFAULT.primaryColor });
        }
      })
      .catch(() => toast.error("Failed to load page settings"))
      .finally(() => setLoading(false));
  }, []);

  function up<K extends keyof PageCustomization>(key: K, value: PageCustomization[K]) {
    setC(prev => ({ ...prev, [key]: value }));
    // Sync primaryColor back to campaign
    if (key === "primaryColor") {
      setCampaign(prev => prev ? { ...prev, primaryColor: value as string } : prev);
    }
  }

  async function save() {
    if (!campaign) return;
    setSaving(true);
    try {
      const res = await fetch("/api/campaigns/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryColor: c.primaryColor,
          isPublic: campaign.isPublic,
          customization: c,
        }),
      });
      if (res.ok) {
        toast.success("Page settings saved!");
        const updated = await res.json();
        setCampaign(prev => prev ? { ...prev, ...updated } : prev);
      } else {
        toast.error("Failed to save settings");
      }
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File, type: "logo" | "hero") {
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingHero;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        if (type === "logo") {
          setCampaign(prev => prev ? { ...prev, logoUrl: url } : prev);
          toast.success("Logo uploaded");
        } else {
          up("heroBannerUrl", url);
          toast.success("Hero image uploaded");
        }
      } else {
        toast.error("Upload failed");
      }
    } finally {
      setUploading(false);
    }
  }

  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const newId = () => Math.random().toString(36).slice(2);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!campaign) {
    return <div className="p-6 text-gray-500">Campaign not found</div>;
  }

  const qrUrl = pageUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pageUrl)}`
    : "";

  function copyPageUrl() {
    if (!pageUrl) return;
    navigator.clipboard.writeText(pageUrl).then(() => toast.success("URL copied!"));
  }

  function shareOnTwitter() {
    if (!pageUrl) return;
    const tweet = encodeURIComponent(`Check out my campaign page: ${pageUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, "_blank", "noopener");
  }

  async function downloadQr() {
    if (!qrUrl) return;
    const res = await fetch(qrUrl);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${campaignSlug || "campaign"}-qr.png`;
    a.click();
  }

  const websiteCard = campaign ? (
    <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl p-5 text-white">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-5 h-5 text-blue-200" />
        <span className="text-sm font-semibold text-blue-100 uppercase tracking-wide">Your Campaign Website</span>
      </div>

      {/* URL display */}
      <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-4 py-3 mb-4">
        <span className="flex-1 font-mono text-sm text-white break-all">{pageUrl || pagePathPreview}</span>
        <button onClick={copyPageUrl} title="Copy URL"
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/20 transition-colors">
          <Copy className="w-4 h-4" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <button onClick={copyPageUrl}
          className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-xl py-2 px-3 text-xs font-semibold transition-colors">
          <Copy className="w-3.5 h-3.5" /> Copy Link
        </button>
        <a href={pageUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-xl py-2 px-3 text-xs font-semibold transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> Open
        </a>
        <button onClick={shareOnTwitter}
          className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-xl py-2 px-3 text-xs font-semibold transition-colors">
          <Share2 className="w-3.5 h-3.5" /> Tweet
        </button>
        <a href={pageUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 rounded-xl py-2 px-3 text-xs font-semibold transition-colors">
          <Eye className="w-3.5 h-3.5" /> Preview
        </a>
      </div>

      {/* QR code */}
      {pageUrl && (
        <div className="flex items-center gap-4 bg-white rounded-xl p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR code for your campaign page" width={80} height={80} className="rounded-lg" />
          <div className="flex-1">
            <p className="text-gray-900 text-sm font-semibold mb-1">QR Code</p>
            <p className="text-gray-500 text-xs mb-2">Print it on flyers, yard signs, and door hangers.</p>
            <button onClick={downloadQr}
              className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg py-1.5 px-3 text-xs font-semibold transition-colors">
              <Download className="w-3 h-3" /> Download PNG
            </button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  const settingsPanel = (
    <div className="space-y-3">
      {/* Page live toggle */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200">
        <div>
          <p className="font-semibold text-sm text-gray-900">Page is live</p>
          <p className="text-xs text-gray-500">
            {campaign.isPublic
              ? <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">{pageUrl} <ExternalLink className="w-3 h-3" /></a>
              : "Enable to make your page visible to voters"}
          </p>
        </div>
        <div
          onClick={() => setCampaign(prev => prev ? { ...prev, isPublic: !prev.isPublic } : prev)}
          className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${campaign.isPublic ? "bg-emerald-500" : "bg-gray-200"}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${campaign.isPublic ? "left-7" : "left-1"}`} />
        </div>
      </div>

      {/* BRANDING */}
      <Section icon={Palette} title="Branding" plan="starter" userPlan={userPlan}>
        {/* Logo upload */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Logo / Photo</p>
          <div className="flex items-center gap-3">
            {campaign.logoUrl ? (
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                <Image src={campaign.logoUrl} alt="Logo" fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) uploadLogo(e.target.files[0], "logo"); }} />
              <button onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploadingLogo ? "Uploading…" : "Upload Logo"}
              </button>
              {campaign.logoUrl && (
                <button onClick={() => setCampaign(prev => prev ? { ...prev, logoUrl: null } : prev)}
                  className="text-xs text-red-500 hover:text-red-700 ml-2">Remove</button>
              )}
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Primary Colour</p>
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                <input type="color" value={c.primaryColor} onChange={e => up("primaryColor", e.target.value)}
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
                <div className="w-full h-full rounded-lg" style={{ background: c.primaryColor }} />
              </div>
              <Input value={c.primaryColor} onChange={e => up("primaryColor", e.target.value)} className="font-mono text-xs" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Accent Colour</p>
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                <input type="color" value={c.accentColor} onChange={e => up("accentColor", e.target.value)}
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
                <div className="w-full h-full rounded-lg" style={{ background: c.accentColor }} />
              </div>
              <Input value={c.accentColor} onChange={e => up("accentColor", e.target.value)} className="font-mono text-xs" />
            </div>
          </div>
        </div>
      </Section>

      {/* THEMES */}
      <Section icon={Palette} title="Themes" plan="starter" userPlan={userPlan}>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => { up("theme", t.id); up("primaryColor", t.primary); }}
              className={`relative rounded-xl border-2 p-3 text-left transition-all ${c.theme === t.id ? "border-blue-500" : "border-gray-200 hover:border-gray-300"}`}>
              {c.theme === t.id && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div className="h-6 rounded-lg mb-2" style={{ background: t.primary }} />
              <div className="h-2 rounded bg-gray-200 mb-1 w-3/4" style={{ background: t.bg }} />
              <p className="text-xs font-semibold text-gray-800 leading-tight">{t.label}</p>
              <p className="text-[10px] text-gray-400">{t.desc}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* TYPOGRAPHY */}
      <Section icon={Type} title="Typography" plan="pro" userPlan={userPlan}>
        <div className="space-y-2">
          {FONTS.map(f => (
            <button key={f.id} onClick={() => up("fontPair", f.id)}
              className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all ${c.fontPair === f.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
              <div>
                <p className="text-sm font-bold text-gray-900" style={{ fontFamily: f.headline }}>{f.headline}</p>
                <p className="text-xs text-gray-500">{f.body} · {f.desc}</p>
              </div>
              {c.fontPair === f.id && <Check className="w-4 h-4 text-blue-500" />}
            </button>
          ))}
        </div>
      </Section>

      {/* LAYOUT */}
      <Section icon={Layout} title="Layout Style" plan="pro" userPlan={userPlan}>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUTS.map(l => (
            <button key={l.id} onClick={() => up("layout", l.id)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${c.layout === l.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
              <p className="text-lg mb-1">{l.icon}</p>
              <p className="text-xs font-bold text-gray-900">{l.label}</p>
              <p className="text-[10px] text-gray-500">{l.desc}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* HERO */}
      <Section icon={ImageIcon} title="Hero" plan="pro" userPlan={userPlan}>
        {/* Hero banner upload */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Hero Banner Image</p>
          {c.heroBannerUrl ? (
            <div className="relative h-24 rounded-xl overflow-hidden border border-gray-200 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.heroBannerUrl} alt="Hero" className="w-full h-full object-cover" />
              <button onClick={() => up("heroBannerUrl", "")}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
            </div>
          ) : null}
          <input ref={heroInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) uploadLogo(e.target.files[0], "hero"); }} />
          <button onClick={() => heroInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-gray-400 transition-colors w-full justify-center">
            {uploadingHero ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploadingHero ? "Uploading…" : "Upload Banner"}
          </button>
        </div>

        {/* Video URL */}
        <FormField label="Hero Video URL (YouTube / Vimeo)">
          <Input value={c.heroVideoUrl} onChange={e => up("heroVideoUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
        </FormField>

        {/* Toggles */}
        <ToggleCard icon={Users} label="Social proof bar" desc="Shows supporter, sign, volunteer counts"
          value={c.showSocialProof} onChange={v => up("showSocialProof", v)} />
        <ToggleCard icon={Calendar} label="Election countdown" desc="Days until October 26 2026"
          value={c.showCountdown} onChange={v => up("showCountdown", v)} />
      </Section>

      {/* CONTENT WIDGETS */}
      <Section icon={Zap} title="Content Widgets" plan="pro" userPlan={userPlan}>
        <ToggleCard icon={BarChart3} label="Live poll embed" desc="Shows your most recent active poll"
          value={c.showLivePoll} onChange={v => up("showLivePoll", v)} />
        <ToggleCard icon={Users} label="Door knock counter" desc="Live counter as canvassers knock doors"
          value={c.showDoorCounter} onChange={v => up("showDoorCounter", v)} />
        <ToggleCard icon={Star} label="Supporter wall" desc="Grid of opted-in supporter names"
          value={c.showSupporterWall} onChange={v => up("showSupporterWall", v)} />

        {/* Endorsements */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">Endorsements (max 10)</p>
            {c.endorsements.length < 10 && (
              <button onClick={() => up("endorsements", [...c.endorsements, { id: newId(), org: "", logoUrl: "", quote: "" }])}
                className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-800">
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>
          {c.endorsements.map((e, i) => (
            <div key={e.id} className="bg-gray-50 rounded-xl p-3 space-y-2 mb-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">Endorsement {i + 1}</p>
                <button onClick={() => up("endorsements", c.endorsements.filter(x => x.id !== e.id))}>
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
              <Input placeholder="Organisation name" value={e.org}
                onChange={ev => up("endorsements", c.endorsements.map(x => x.id === e.id ? { ...x, org: ev.target.value } : x))} />
              <Input placeholder="Logo URL (optional)" value={e.logoUrl}
                onChange={ev => up("endorsements", c.endorsements.map(x => x.id === e.id ? { ...x, logoUrl: ev.target.value } : x))} />
              <Textarea placeholder="Quote" rows={2} value={e.quote}
                onChange={ev => up("endorsements", c.endorsements.map(x => x.id === e.id ? { ...x, quote: ev.target.value } : x))} />
            </div>
          ))}
        </div>

        {/* Custom FAQ */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">Custom FAQ (max 10)</p>
            {c.customFaq.length < 10 && (
              <button onClick={() => up("customFaq", [...c.customFaq, { id: newId(), q: "", a: "" }])}
                className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:text-blue-800">
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>
          {c.customFaq.map((f, i) => (
            <div key={f.id} className="bg-gray-50 rounded-xl p-3 space-y-2 mb-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">Q&A {i + 1}</p>
                <button onClick={() => up("customFaq", c.customFaq.filter(x => x.id !== f.id))}>
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
              <Input placeholder="Question" value={f.q}
                onChange={ev => up("customFaq", c.customFaq.map(x => x.id === f.id ? { ...x, q: ev.target.value } : x))} />
              <Textarea placeholder="Answer" rows={2} value={f.a}
                onChange={ev => up("customFaq", c.customFaq.map(x => x.id === f.id ? { ...x, a: ev.target.value } : x))} />
            </div>
          ))}
        </div>

        {/* Email capture */}
        <ToggleCard icon={Mail} label="Email capture widget" desc="Collect emails to campaign CRM"
          value={c.showEmailCapture} onChange={v => up("showEmailCapture", v)} />
        {c.showEmailCapture && (
          <div className="space-y-2 pl-2">
            <FormField label="Headline"><Input value={c.emailCaptureHeadline} onChange={e => up("emailCaptureHeadline", e.target.value)} /></FormField>
            <FormField label="Button text"><Input value={c.emailCaptureButtonText} onChange={e => up("emailCaptureButtonText", e.target.value)} /></FormField>
          </div>
        )}

        {/* Donation */}
        <ToggleCard icon={Zap} label="Donation widget" desc="Donate button with custom amounts"
          value={c.showDonation} onChange={v => up("showDonation", v)} />
        {c.showDonation && (
          <FormField label="Donation amounts (comma separated)">
            <Input value={c.donationAmounts} onChange={e => up("donationAmounts", e.target.value)} placeholder="10, 25, 50, 100" />
          </FormField>
        )}
      </Section>

      {/* OFFICIAL WIDGETS */}
      <Section icon={Building2} title="Elected Official Widgets" plan="official" userPlan={userPlan}>
        {/* Office hours */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">Office Hours (max 5)</p>
            {c.officeHours.length < 5 && (
              <button onClick={() => up("officeHours", [...c.officeHours, { id: newId(), day: "", time: "", location: "" }])}
                className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>
          {c.officeHours.map((oh, i) => (
            <div key={oh.id} className="grid grid-cols-3 gap-1.5 mb-2">
              <Input placeholder="Day" value={oh.day}
                onChange={e => up("officeHours", c.officeHours.map(x => x.id === oh.id ? { ...x, day: e.target.value } : x))} />
              <Input placeholder="Time" value={oh.time}
                onChange={e => up("officeHours", c.officeHours.map(x => x.id === oh.id ? { ...x, time: e.target.value } : x))} />
              <div className="flex gap-1">
                <Input placeholder="Location" value={oh.location}
                  onChange={e => up("officeHours", c.officeHours.map(x => x.id === oh.id ? { ...x, location: e.target.value } : x))} />
                <button onClick={() => up("officeHours", c.officeHours.filter(x => x.id !== oh.id))} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Committees */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">Committees (max 10)</p>
            {c.committees.length < 10 && (
              <button onClick={() => up("committees", [...c.committees, { id: newId(), name: "", role: "" }])}
                className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>
          {c.committees.map(cm => (
            <div key={cm.id} className="flex gap-2 mb-1.5">
              <Input placeholder="Committee name" value={cm.name}
                onChange={e => up("committees", c.committees.map(x => x.id === cm.id ? { ...x, name: e.target.value } : x))} />
              <Input placeholder="Role" value={cm.role}
                onChange={e => up("committees", c.committees.map(x => x.id === cm.id ? { ...x, role: e.target.value } : x))} />
              <button onClick={() => up("committees", c.committees.filter(x => x.id !== cm.id))} className="text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <FormField label="Voting Record URL">
          <Input value={c.votingRecordUrl} onChange={e => up("votingRecordUrl", e.target.value)} placeholder="https://ola.org/..." />
        </FormField>

        {/* Accomplishments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">Accomplishments Timeline (max 20)</p>
            {c.accomplishments.length < 20 && (
              <button onClick={() => up("accomplishments", [...c.accomplishments, { id: newId(), date: "", title: "", description: "" }])}
                className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>
          {c.accomplishments.map(a => (
            <div key={a.id} className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-2">
              <div className="grid grid-cols-3 gap-1.5">
                <Input placeholder="Date (e.g. 2024)" value={a.date}
                  onChange={e => up("accomplishments", c.accomplishments.map(x => x.id === a.id ? { ...x, date: e.target.value } : x))} />
                <div className="col-span-2 flex gap-1">
                  <Input placeholder="Title" value={a.title}
                    onChange={e => up("accomplishments", c.accomplishments.map(x => x.id === a.id ? { ...x, title: e.target.value } : x))} />
                  <button onClick={() => up("accomplishments", c.accomplishments.filter(x => x.id !== a.id))} className="text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <Textarea rows={1} placeholder="Description" value={a.description}
                onChange={e => up("accomplishments", c.accomplishments.map(x => x.id === a.id ? { ...x, description: e.target.value } : x))} />
            </div>
          ))}
        </div>

        <ToggleCard icon={Bell} label="Newsletter signup" desc="Subscribers go to campaign CRM"
          value={c.showNewsletter} onChange={v => up("showNewsletter", v)} />
        {c.showNewsletter && (
          <FormField label="Newsletter name"><Input value={c.newsletterName} onChange={e => up("newsletterName", e.target.value)} placeholder="The Ward 3 Update" /></FormField>
        )}
        <FormField label="Town Hall Scheduler (Calendly URL)">
          <Input value={c.townHallUrl} onChange={e => up("townHallUrl", e.target.value)} placeholder="https://calendly.com/..." />
        </FormField>
      </Section>

      {/* DOMAIN */}
      <Section icon={Globe} title="Custom Domain" plan="pro" userPlan={userPlan}>
        <FormField label="Domain (without https://)">
          <Input
            value={campaign.customDomain ?? ""}
            onChange={e => setCampaign(prev => prev ? { ...prev, customDomain: e.target.value } : prev)}
            placeholder="votegeorge.ca"
          />
        </FormField>
        {campaign.customDomain && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
            <p className="font-semibold text-blue-800 mb-2">DNS Setup</p>
            <p className="text-blue-700 text-xs mb-1">Add this CNAME record to your domain registrar:</p>
            <code className="block bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700">
              {campaign.customDomain} → cname.poll.city
            </code>
            <p className="text-blue-600 text-xs mt-2">DNS propagation takes 24–48 hours.</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <div className={`w-2 h-2 rounded-full ${campaign.customDomain ? "bg-amber-400" : "bg-gray-300"}`} />
            <span className="text-gray-500">{campaign.customDomain ? "Pending DNS" : "No custom domain"}</span>
          </div>
        </div>
      </Section>

      {/* SEO */}
      <Section icon={Globe} title="SEO" plan="pro" userPlan={userPlan}>
        <FormField label={`Page title (${c.metaTitle.length}/60)`}>
          <Input value={c.metaTitle} onChange={e => up("metaTitle", e.target.value.slice(0, 60))}
            placeholder={`${campaign.candidateName} — ${campaign.jurisdiction}`} />
        </FormField>
        <FormField label={`Meta description (${c.metaDescription.length}/160)`}>
          <Textarea rows={2} value={c.metaDescription} onChange={e => up("metaDescription", e.target.value.slice(0, 160))}
            placeholder={`Vote for ${campaign.candidateName} in the ${new Date().getFullYear()} election.`} />
        </FormField>
        {/* Google preview */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <p className="text-xs text-gray-400 mb-2 font-medium">Google search preview</p>
          <p className="text-blue-700 text-sm font-medium hover:underline cursor-default truncate">
            {c.metaTitle || `${campaign.candidateName} — ${campaign.jurisdiction}`}
          </p>
          <p className="text-green-700 text-xs">{pagePathPreview}</p>
          <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">
            {c.metaDescription || `Vote for ${campaign.candidateName} in the upcoming election.`}
          </p>
        </div>
      </Section>

      {/* ANALYTICS */}
      <Section icon={BarChart3} title="Analytics" plan="pro" userPlan={userPlan}>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-blue-700">{campaign.pageViews ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">All-time views</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-700">—</p>
            <p className="text-xs text-gray-500 mt-1">This week</p>
          </div>
        </div>
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
            <span className="text-gray-600">Mobile visitors</span><span className="font-semibold">72%</span>
          </div>
          <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
            <span className="text-gray-600">Desktop visitors</span><span className="font-semibold">28%</span>
          </div>
          <div className="flex items-center justify-between text-sm py-2">
            <span className="text-gray-600">Top section</span><span className="font-semibold">Volunteer form</span>
          </div>
        </div>
      </Section>

      {/* QR CODE */}
      <Section icon={QrCode} title="QR Code" plan="pro" userPlan={userPlan}>
        {pageUrl && (
          <>
            <FormField label="Label below QR code (optional)">
              <Input value={c.qrLabel} onChange={e => up("qrLabel", e.target.value)} placeholder="Scan to vote for George Smith" />
            </FormField>
            <FormField label="Size">
              <Select value={c.qrSize} onChange={e => up("qrSize", e.target.value as "small" | "medium" | "large")}>
                <option value="small">Small (120×120)</option>
                <option value="medium">Medium (180×180)</option>
                <option value="large">Large (240×240)</option>
              </Select>
            </FormField>
            <QrCodeDisplay url={pageUrl} label={c.qrLabel} size={c.qrSize} />
          </>
        )}
      </Section>

      {/* WHITE LABEL */}
      <Section icon={Code} title="White Label" plan="command" userPlan={userPlan}>
        <ToggleCard icon={Eye} label="Remove Poll City branding" desc="Hides 'Powered by Poll City' footer"
          value={c.hidePolCityBranding} onChange={v => up("hidePolCityBranding", v)} />
        <FormField label="Custom footer text">
          <Input value={c.customFooterText} onChange={e => up("customFooterText", e.target.value)} placeholder="© 2026 George Smith Campaign" />
        </FormField>
        <FormField label="Custom CSS">
          <Textarea
            rows={6}
            value={c.customCss}
            onChange={e => up("customCss", e.target.value)}
            placeholder={`.candidate-hero { background: linear-gradient(135deg, #ff6b35, #ff4e00) !important; }`}
            className="font-mono text-xs"
          />
        </FormField>
      </Section>

      {/* Save */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-3 pb-3 -mx-0 flex gap-3">
        <Button onClick={save} loading={saving} className="flex-1">
          <Save className="w-4 h-4" /> Save All Changes
        </Button>
        <a href={pageUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          <ExternalLink className="w-4 h-4" /> View Live
        </a>
      </div>
    </div>
  );

  const previewPanel = (
    <div className="sticky top-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">Live Preview</p>
        <a href={pageUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
          Full page <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <LivePreview
        c={c}
        candidateName={campaign.candidateName ?? ""}
        candidateTitle={campaign.candidateTitle ?? ""}
        jurisdiction={campaign.jurisdiction ?? ""}
        logoUrl={campaign.logoUrl ?? ""}
      />
      <p className="text-xs text-gray-400 text-center mt-3">Preview updates in real time</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Page Builder"
        description="Customize your candidate public page. Changes preview live on the right."
      />

      {/* Campaign Website Card — always full-width at the top */}
      {websiteCard}

      {/* Desktop: two-column */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div>{settingsPanel}</div>
        <div>{previewPanel}</div>
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
          {(["edit", "preview"] as const).map(tab => (
            <button key={tab} onClick={() => setMobileTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize flex items-center justify-center gap-2 ${
                mobileTab === tab ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}>
              {tab === "edit" ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {tab === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>
        {mobileTab === "edit" ? settingsPanel : previewPanel}
      </div>
    </div>
  );
}
