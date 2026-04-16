import React, { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, LineChart, Line, Legend,
} from "recharts";
import {
  User, Star, Calendar, MapPin, Phone, Mail, Globe, Twitter,
  Facebook, Instagram, Mic, FileText, TrendingUp, TrendingDown,
  Award, BookOpen, Heart, DollarSign, Users, Zap, ChevronRight,
  Clock, CheckCircle, AlertTriangle, Play, ArrowUpRight,
  MessageSquare, Camera, Edit3, Target, Briefcase, Shield,
  BarChart2, Activity, Hash, Link2, Radio, Newspaper,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { motion, AnimatePresence } from "motion/react";

/* ─── DESIGN TOKENS ─────────────────────────────────────────────────────── */
const C = {
  bg: "#050A1F",
  card: "#0F1440",
  deep: "#070D28",
  border: "rgba(41,121,255,0.2)",
  borderB: "rgba(0,229,255,0.3)",
  text: "#F5F7FF",
  sub: "#AAB2FF",
  muted: "#6B72A0",
  accent: "#00E5FF",
  accentB: "#2979FF",
  lib: "#D91E2A",
  con: "#1A4B8C",
  ndp: "#F37021",
  grn: "#3D9B35",
};

/* ─── POLL DATA ─────────────────────────────────────────────────────────── */
const POLL_TREND = [
  { week: "Mar 2",  LIB: 36, CON: 33, NDP: 22, GRN: 5 },
  { week: "Mar 9",  LIB: 37, CON: 32, NDP: 22, GRN: 5 },
  { week: "Mar 16", LIB: 35, CON: 33, NDP: 23, GRN: 5 },
  { week: "Mar 23", LIB: 38, CON: 31, NDP: 22, GRN: 5 },
  { week: "Mar 30", LIB: 39, CON: 30, NDP: 22, GRN: 5 },
  { week: "Apr 6",  LIB: 41, CON: 29, NDP: 21, GRN: 5 },
  { week: "Apr 13", LIB: 43, CON: 28, NDP: 21, GRN: 4 },
];

const APPROVAL_DATA = [
  { subject: "Trust",       A: 78 },
  { subject: "Leadership",  A: 82 },
  { subject: "Policy",      A: 71 },
  { subject: "Visibility",  A: 88 },
  { subject: "Ground",      A: 94 },
  { subject: "Media",       A: 66 },
];

const PLATFORM_PILLARS = [
  {
    id: "housing",
    icon: "🏠",
    title: "Housing Affordability",
    tagline: "10,000 new units in Parkdale–High Park by 2028",
    color: "#2979FF",
    progress: 82,
    keyPoints: [
      "$120M community land trust partnership with Toronto",
      "Zoning reform to permit 3-storey gentle density",
      "Rent stabilization linked to CPI",
    ],
  },
  {
    id: "healthcare",
    icon: "🏥",
    title: "Healthcare Access",
    tagline: "A family doctor for every resident",
    color: "#00C853",
    progress: 74,
    keyPoints: [
      "3 new community health centres in riding",
      "Mental health parity — fund at hospital level",
      "Pharmacare expansion: dental + vision",
    ],
  },
  {
    id: "climate",
    icon: "🌿",
    title: "Climate & Transit",
    tagline: "Accelerate the Eglinton Crosstown — no more delays",
    color: "#3D9B35",
    progress: 68,
    keyPoints: [
      "$2B federal transit co-investment Bloor-Danforth extension",
      "Net-zero retrofit grants for pre-1980 buildings",
      "EV charging grid: 400 public stations by 2027",
    ],
  },
  {
    id: "economy",
    icon: "💼",
    title: "Cost of Living",
    tagline: "Make Toronto liveable for working families",
    color: "#FF9F0A",
    progress: 77,
    keyPoints: [
      "Grocery industry price-gouging review",
      "$15/day childcare — full riding implementation",
      "Targeted GST rebate: groceries + transit",
    ],
  },
  {
    id: "safety",
    icon: "🛡️",
    title: "Public Safety",
    tagline: "Community-based safety that works for everyone",
    color: "#9C27B0",
    progress: 61,
    keyPoints: [
      "Crisis response alternatives — co-responder pilot",
      "Youth diversion programs: $8M investment",
      "Neighbourhood revitalization fund — 5 zones",
    ],
  },
  {
    id: "seniors",
    icon: "👴",
    title: "Seniors & Caregivers",
    tagline: "Dignity and support at every life stage",
    color: "#FF3B30",
    progress: 70,
    keyPoints: [
      "LTC regulation overhaul post-COVID inquiry",
      "Caregiver tax credit expansion",
      "Home care hours doubled — federal commitment",
    ],
  },
];

const SCHEDULE = [
  { date: "Apr 14", day: "Tue", time: "9:00 AM",  title: "High Park Community Meeting",       type: "community",  location: "High Park Pavilion",            confirmed: true  },
  { date: "Apr 14", day: "Tue", time: "2:00 PM",  title: "Media Availability — Housing Plan", type: "media",      location: "Roncesvalles Ave, 416-555-0190", confirmed: true  },
  { date: "Apr 14", day: "Tue", time: "6:30 PM",  title: "Parkdale BIA Candidate Forum",      type: "debate",     location: "Masaryk-Cowan Rec Centre",       confirmed: true  },
  { date: "Apr 15", day: "Wed", time: "8:00 AM",  title: "Volunteer Morning Kick-off",        type: "volunteer",  location: "HQ — 888 Queen St W",            confirmed: true  },
  { date: "Apr 15", day: "Wed", time: "11:00 AM", title: "CUPE Local 79 Endorsement Event",   type: "endorsement",location: "CUPE Hall, 100 Lesmill Rd",       confirmed: true  },
  { date: "Apr 15", day: "Wed", time: "7:00 PM",  title: "CBC Power & Politics",              type: "media",      location: "Remote — CBC Studios",           confirmed: false },
  { date: "Apr 16", day: "Thu", time: "10:00 AM", title: "Bloor-Lansdowne Canvass Launch",    type: "canvass",    location: "Bloor & Lansdowne",              confirmed: true  },
  { date: "Apr 16", day: "Thu", time: "3:00 PM",  title: "Faith Leaders Roundtable",          type: "community",  location: "St. Anne's Anglican Church",     confirmed: true  },
  { date: "Apr 17", day: "Fri", time: "9:00 AM",  title: "Riding-wide Debate — All Parties",  type: "debate",     location: "Runnymede Library",             confirmed: true  },
  { date: "Apr 17", day: "Fri", time: "6:00 PM",  title: "Fundraiser Dinner",                 type: "fundraiser", location: "Spoke Club, 600 King St W",      confirmed: true  },
];

const ENDORSEMENTS = [
  { org: "CUPE Local 79",            type: "Union",        logo: "🏗️", confirmed: true,  date: "Apr 10" },
  { org: "Toronto & York Region Labour Council", type: "Labour",  logo: "⚒️", confirmed: true,  date: "Apr 8"  },
  { org: "Toronto Environmental Alliance", type: "Environment", logo: "🌿", confirmed: true,  date: "Apr 5"  },
  { org: "YWCA Toronto",             type: "Community",    logo: "💛", confirmed: true,  date: "Apr 3"  },
  { org: "Toronto District School Board Trustees", type: "Education", logo: "🎓", confirmed: true,  date: "Mar 28" },
  { org: "ACORN Canada",             type: "Tenant Rights",logo: "🏘️", confirmed: true,  date: "Mar 22" },
  { org: "CAMH Foundation",          type: "Health",       logo: "🧠", confirmed: false, date: "Pending" },
  { org: "Parkdale Residents Assoc.", type: "Community",   logo: "🏙️", confirmed: false, date: "Pending" },
];

const PRESS_CLIPS = [
  { outlet: "Toronto Star",   headline: "Chen pledges $120M housing trust for Parkdale–High Park",  sentiment: "positive", time: "2h ago",   views: "14.2K" },
  { outlet: "CBC News",       headline: "Federal candidates spar over Eglinton Crosstown delays",    sentiment: "neutral",  time: "5h ago",   views: "31.8K" },
  { outlet: "Globe & Mail",   headline: "Liberal surge in GTA ridings — Chen leads by 15 points",    sentiment: "positive", time: "1d ago",   views: "58.1K" },
  { outlet: "Now Magazine",   headline: "Community groups back Chen's renters rights platform",       sentiment: "positive", time: "1d ago",   views: "8.4K"  },
  { outlet: "National Post",  headline: "Parkdale–High Park race: can the Liberals hold on?",        sentiment: "neutral",  time: "2d ago",   views: "22.7K" },
  { outlet: "CTV News",       headline: "Chen and CON challenger clash at housing forum",             sentiment: "neutral",  time: "3d ago",   views: "19.3K" },
];

const SOCIAL_METRICS = [
  { platform: "Twitter/X",   icon: Twitter,   handle: "@MariaChenpHP",   followers: "28.4K", growth: "+840",  engagement: "4.2%",  color: "#1DA1F2" },
  { platform: "Facebook",    icon: Facebook,  handle: "MariaChenpHP",    followers: "12.1K", growth: "+210",  engagement: "3.8%",  color: "#1877F2" },
  { platform: "Instagram",   icon: Instagram, handle: "@mariachen.php",  followers: "9.8K",  growth: "+380",  engagement: "5.1%",  color: "#E1306C" },
];

const FUNDRAISING = [
  { month: "Jan", raised: 28000 },
  { month: "Feb", raised: 41000 },
  { month: "Mar", raised: 67000 },
  { month: "Apr", raised: 92000 },
];

const KPI_METRICS = [
  { label: "Doors Knocked",   value: "18,421",  sub: "This campaign",   color: "#00E5FF", icon: MapPin      },
  { label: "Voters ID'd",     value: "9,840",   sub: "Supporter list",  color: "#00C853", icon: Users       },
  { label: "Volunteers",      value: "312",      sub: "Signed up",       color: "#FFD600", icon: Heart       },
  { label: "Raised to Date",  value: "$228K",    sub: "Of $280K goal",   color: "#FF9F0A", icon: DollarSign  },
  { label: "Signs Up",        value: "847",      sub: "Installed",       color: "#9C27B0", icon: Target      },
  { label: "Media Hits",      value: "64",       sub: "Last 30 days",    color: "#2979FF", icon: Newspaper   },
];

const SCHEDULE_TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  community:   { color: "#00C853", label: "Community"   },
  media:       { color: "#00E5FF", label: "Media"       },
  debate:      { color: "#FF3B30", label: "Debate"      },
  volunteer:   { color: "#2979FF", label: "Volunteer"   },
  endorsement: { color: "#FFD600", label: "Endorsement" },
  canvass:     { color: "#FF9F0A", label: "Canvass"     },
  fundraiser:  { color: "#9C27B0", label: "Fundraiser"  },
};

/* ─── CUSTOM TOOLTIP ─────────────────────────────────────────────────────── */
function PollTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-[11px] font-bold border"
      style={{ backgroundColor: C.card, borderColor: C.borderB, color: C.text }}>
      <div className="font-black mb-1.5" style={{ color: C.accent }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span style={{ color: C.sub }}>{p.dataKey}</span>
          <span className="ml-auto font-black" style={{ color: p.color }}>{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

/* ─── SECTION HEADER ─────────────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, label, sub, accent = C.accent }: { icon: React.ElementType; label: string; sub?: string; accent?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}40`, color: accent, boxShadow: `0 0 14px ${accent}20` }}>
        <Icon size={17} />
      </div>
      <div>
        <div className="font-black text-sm uppercase tracking-widest" style={{ color: C.text }}>{label}</div>
        {sub && <div className="text-[10px]" style={{ color: C.muted }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export function Candidate() {
  const [activeTab, setActiveTab] = useState<"overview" | "platform" | "schedule" | "media" | "performance">("overview");
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);

  const tabs = [
    { id: "overview",     label: "Overview",     icon: User         },
    { id: "platform",     label: "Platform",     icon: BookOpen     },
    { id: "schedule",     label: "Schedule",     icon: Calendar     },
    { id: "media",        label: "Media & PR",   icon: Newspaper    },
    { id: "performance",  label: "Performance",  icon: BarChart2    },
  ] as const;

  return (
    <div className="flex flex-col min-h-full bg-[#050A1F] text-[#F5F7FF]">

      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden border-b border-[#2979FF]/20 flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #0F1440 0%, #070D28 60%, #0a0618 100%)" }}>
        {/* Ambient glow */}
        <div className="absolute top-[-60px] left-[-60px] w-[400px] h-[300px] rounded-full blur-[100px] pointer-events-none"
          style={{ backgroundColor: `${C.lib}18` }} />
        <div className="absolute top-[-40px] right-[200px] w-[300px] h-[200px] rounded-full blur-[80px] pointer-events-none"
          style={{ backgroundColor: "rgba(41,121,255,0.12)" }} />

        <div className="relative z-10 px-8 py-6 flex gap-6 items-start">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 shadow-2xl"
              style={{ borderColor: C.lib, boxShadow: `0 0 28px ${C.lib}40` }}>
              <img
                src="https://images.unsplash.com/photo-1644268756918-16348d1bc619?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400"
                alt="Maria Chen"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest"
              style={{ backgroundColor: C.lib, color: "#fff", boxShadow: `0 0 12px ${C.lib}60` }}>
              LIB
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 flex-wrap">
              <div>
                <h1 className="text-3xl font-black tracking-tight" style={{ color: C.text }}>
                  Maria T. Chen
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${C.lib}20`, color: C.lib, border: `1px solid ${C.lib}40` }}>
                    Liberal Party of Canada
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: C.muted }}>·</span>
                  <span className="text-[11px] font-bold" style={{ color: C.sub }}>
                    <MapPin size={10} className="inline mr-1" />
                    Riding 42 — Parkdale–High Park
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: C.muted }}>·</span>
                  <span className="text-[11px] font-bold" style={{ color: C.muted }}>Federal Election Apr 28, 2026</span>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg animate-pulse"
                  style={{ backgroundColor: "rgba(0,200,83,0.1)", border: "1px solid rgba(0,200,83,0.4)", color: "#00C853" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Campaign Active</span>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:bg-[#2979FF]/20"
                  style={{ border: `1px solid ${C.border}`, color: C.sub }}>
                  <Edit3 size={12} /> Edit Profile
                </button>
              </div>
            </div>

            {/* Bio snippet */}
            <p className="text-sm mt-3 leading-relaxed max-w-2xl" style={{ color: C.sub }}>
              Community organiser, urban planner, and former Toronto City Councillor (2018–2022). 
              Born in Toronto to Cantonese-speaking immigrants; former prof of urban policy at Ryerson. 
              Led the Parkdale Housing Coalition for six years before entering federal politics.
            </p>

            {/* Contact / socials */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {[
                { icon: Phone, label: "416-555-0147" },
                { icon: Mail,  label: "maria.chen@liberal.ca" },
                { icon: Globe, label: "mariachen.ca" },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: C.muted }}>
                  <c.icon size={11} style={{ color: C.accentB }} />
                  {c.label}
                </div>
              ))}
            </div>
          </div>

          {/* Riding poll snapshot */}
          <div className="flex-shrink-0 rounded-2xl p-4 min-w-[200px]"
            style={{ backgroundColor: "rgba(11,11,15,0.7)", border: `1px solid ${C.border}`, backdropFilter: "blur(12px)" }}>
            <div className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: C.muted }}>
              Riding Poll · Apr 13
            </div>
            {[
              { party: "LIB", val: 43, color: C.lib   },
              { party: "CON", val: 28, color: C.con   },
              { party: "NDP", val: 21, color: C.ndp   },
              { party: "GRN", val:  4, color: "#3D9B35" },
            ].map(p => (
              <div key={p.party} className="flex items-center gap-2 mb-2">
                <span className="w-7 text-[9px] font-black" style={{ color: p.color }}>{p.party}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${p.val}%` }} transition={{ delay: 0.2, duration: 0.6 }}
                    style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}60` }} />
                </div>
                <span className="w-8 text-right text-[10px] font-black" style={{ color: p.val === 43 ? C.text : C.muted }}>{p.val}%</span>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t text-[8px] text-center" style={{ borderColor: C.border, color: C.muted }}>
              n=812 · ±3.2% · Ekos Research
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="relative z-10 grid grid-cols-6 border-t px-2" style={{ borderColor: C.border }}>
          {KPI_METRICS.map((k, i) => (
            <div key={k.label} className={cn("flex items-center gap-3 px-4 py-3", i < 5 && "border-r")}
              style={{ borderColor: C.border }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${k.color}15`, color: k.color }}>
                <k.icon size={15} />
              </div>
              <div>
                <div className="font-black text-base" style={{ color: k.color }}>{k.value}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div className="relative z-10 flex border-t px-6" style={{ borderColor: C.border }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn("flex items-center gap-2 px-5 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all relative",
                activeTab === t.id ? "border-[#00E5FF] text-[#00E5FF]" : "border-transparent text-[#6B72A0] hover:text-[#AAB2FF]")}>
              <t.icon size={12} />
              {t.label}
              {activeTab === t.id && (
                <motion.div layoutId="tab-pill"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: C.accent, boxShadow: `0 0 8px ${C.accent}` }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="flex-1 p-6">
        <AnimatePresence mode="wait">

          {/* ═══ OVERVIEW ═══ */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-5">

              {/* Left: Poll trend */}
              <div className="col-span-2 space-y-5">
                <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                  <SectionHeader icon={TrendingUp} label="Riding Poll Trend" sub="Weekly rolling average · Parkdale–High Park" />
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={POLL_TREND}>
                        <XAxis dataKey="week" tick={{ fill: C.muted, fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 60]} tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                        <Tooltip content={<PollTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 10, color: C.sub }} />
                        <Line type="monotone" dataKey="LIB" stroke={C.lib} strokeWidth={3} dot={{ r: 4, fill: C.lib }} isAnimationActive={false} />
                        <Line type="monotone" dataKey="CON" stroke={C.con} strokeWidth={2} dot={{ r: 3, fill: C.con }} strokeDasharray="5 3" isAnimationActive={false} />
                        <Line type="monotone" dataKey="NDP" stroke={C.ndp} strokeWidth={2} dot={{ r: 3, fill: C.ndp }} strokeDasharray="5 3" isAnimationActive={false} />
                        <Line type="monotone" dataKey="GRN" stroke="#3D9B35" strokeWidth={1.5} dot={{ r: 2, fill: "#3D9B35" }} strokeDasharray="3 4" isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(0,200,83,0.12)", color: "#00C853", border: "1px solid rgba(0,200,83,0.3)" }}>
                      ↑ +7pts since writ drop
                    </span>
                    <span className="text-[9px]" style={{ color: C.muted }}>Trend: Strong upward · CON softening · NDP stable</span>
                  </div>
                </div>

                {/* Fundraising chart */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                  <SectionHeader icon={DollarSign} label="Fundraising" sub="Monthly donations received" accent="#FF9F0A" />
                  <div className="h-[130px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={FUNDRAISING} barSize={28}>
                        <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                        <Tooltip formatter={(v: any) => [`$${v.toLocaleString()}`, "Raised"]} contentStyle={{ backgroundColor: C.card, border: `1px solid ${C.borderB}`, borderRadius: 12, color: C.text, fontSize: 11 }} />
                        <Bar dataKey="raised" radius={[6, 6, 0, 0]}>
                          {FUNDRAISING.map((_, i) => (
                            <Cell key={i} fill={i === FUNDRAISING.length - 1 ? "#FF9F0A" : "#2979FF"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[9px]" style={{ color: C.muted }}>Total: <span className="font-black" style={{ color: "#FF9F0A" }}>$228,000</span> raised · Goal: $280,000</span>
                    <div className="flex-1 mx-4 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: "81%", backgroundColor: "#FF9F0A", boxShadow: "0 0 8px #FF9F0A60" }} />
                    </div>
                    <span className="text-[10px] font-black" style={{ color: "#FF9F0A" }}>81%</span>
                  </div>
                </div>

                {/* Endorsements */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                  <SectionHeader icon={Award} label="Endorsements" sub={`${ENDORSEMENTS.filter(e=>e.confirmed).length} confirmed · ${ENDORSEMENTS.filter(e=>!e.confirmed).length} pending`} accent="#FFD600" />
                  <div className="grid grid-cols-2 gap-2">
                    {ENDORSEMENTS.map(e => (
                      <div key={e.org} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                        style={{ backgroundColor: e.confirmed ? "rgba(0,200,83,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${e.confirmed ? "rgba(0,200,83,0.25)" : C.border}` }}>
                        <span className="text-xl flex-shrink-0">{e.logo}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black truncate" style={{ color: C.text }}>{e.org}</div>
                          <div className="text-[8px]" style={{ color: C.muted }}>{e.type} · {e.date}</div>
                        </div>
                        {e.confirmed
                          ? <CheckCircle size={12} style={{ color: "#00C853", flexShrink: 0 }} />
                          : <Clock size={12} style={{ color: "#FFD600", flexShrink: 0 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Bio + radar + next events */}
              <div className="space-y-5">
                {/* Efficacy radar */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                  <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: C.muted }}>Candidate Efficacy</div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="68%" data={APPROVAL_DATA}>
                        <PolarGrid stroke="rgba(41,121,255,0.2)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: C.sub, fontSize: 8, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="A" stroke={C.lib} strokeWidth={2.5} fill={C.lib} fillOpacity={0.18} isAnimationActive={false} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {APPROVAL_DATA.map(d => (
                      <div key={d.subject} className="flex items-center gap-1.5">
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${d.A}%`, backgroundColor: C.lib }} />
                        </div>
                        <span className="text-[8px] font-bold w-14 truncate" style={{ color: C.sub }}>{d.subject}</span>
                        <span className="text-[8px] font-black" style={{ color: C.lib }}>{d.A}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next 3 events */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                  <SectionHeader icon={Calendar} label="Upcoming" sub="Next 48 hours" accent={C.accentB} />
                  <div className="space-y-2">
                    {SCHEDULE.slice(0, 4).map((ev, i) => {
                      const cfg = SCHEDULE_TYPE_CONFIG[ev.type];
                      return (
                        <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                          style={{ backgroundColor: `${cfg.color}08`, border: `1px solid ${cfg.color}25` }}>
                          <div className="text-center flex-shrink-0">
                            <div className="text-[8px] font-black" style={{ color: cfg.color }}>{ev.time}</div>
                            <div className="text-[7px]" style={{ color: C.muted }}>{ev.day}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black truncate" style={{ color: C.text }}>{ev.title}</div>
                            <div className="text-[8px] truncate" style={{ color: C.muted }}>{ev.location}</div>
                          </div>
                          <div className="flex-shrink-0">
                            {ev.confirmed
                              ? <CheckCircle size={11} style={{ color: "#00C853" }} />
                              : <AlertTriangle size={11} style={{ color: "#FFD600" }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#2979FF]/10"
                    style={{ border: `1px solid ${C.border}`, color: C.sub }}
                    onClick={() => setActiveTab("schedule")}>
                    Full Schedule <ChevronRight size={12} />
                  </button>
                </div>

                {/* Social */}
                <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                  <SectionHeader icon={Hash} label="Social Media" sub="Last 7 days" accent="#1DA1F2" />
                  <div className="space-y-3">
                    {SOCIAL_METRICS.map(s => (
                      <div key={s.platform} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${s.color}18`, color: s.color }}>
                          <s.icon size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] font-black" style={{ color: C.text }}>{s.handle}</div>
                          <div className="text-[8px]" style={{ color: C.muted }}>{s.followers} followers</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[9px] font-black" style={{ color: "#00C853" }}>{s.growth} /wk</div>
                          <div className="text-[8px]" style={{ color: C.muted }}>{s.engagement} eng.</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ PLATFORM ═══ */}
          {activeTab === "platform" && (
            <motion.div key="platform" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <SectionHeader icon={BookOpen} label="Platform Pillars" sub="6 campaign commitments — Parkdale–High Park 2026" />
              <div className="grid grid-cols-2 gap-4">
                {PLATFORM_PILLARS.map(p => {
                  const isOpen = expandedPillar === p.id;
                  return (
                    <motion.div key={p.id} layout
                      className="rounded-2xl overflow-hidden cursor-pointer transition-all"
                      style={{ backgroundColor: C.card, border: `1.5px solid ${isOpen ? p.color : C.border}`, boxShadow: isOpen ? `0 0 24px ${p.color}20` : undefined }}
                      onClick={() => setExpandedPillar(isOpen ? null : p.id)}>
                      <div className="p-5">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl flex-shrink-0">{p.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-sm" style={{ color: p.color }}>{p.title}</div>
                            <div className="text-[11px] mt-0.5" style={{ color: C.sub }}>{p.tagline}</div>
                          </div>
                          <div className="flex-shrink-0">
                            <ChevronRight size={16} className={cn("transition-transform", isOpen && "rotate-90")} style={{ color: C.muted }} />
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: C.muted }}>Voter resonance</span>
                            <span className="text-[10px] font-black" style={{ color: p.color }}>{p.progress}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                            <motion.div className="h-full rounded-full"
                              initial={{ width: 0 }} animate={{ width: `${p.progress}%` }} transition={{ delay: 0.1, duration: 0.6 }}
                              style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}60` }} />
                          </div>
                        </div>
                      </div>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-5 pb-5 pt-2 border-t space-y-2.5" style={{ borderColor: `${p.color}30` }}>
                              {p.keyPoints.map((pt, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[8px] font-black"
                                    style={{ backgroundColor: `${p.color}20`, color: p.color, border: `1px solid ${p.color}40` }}>
                                    {i + 1}
                                  </div>
                                  <span className="text-[12px]" style={{ color: C.sub }}>{pt}</span>
                                </div>
                              ))}
                              <button className="mt-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all hover:underline"
                                style={{ color: p.color }}>
                                <FileText size={11} /> View Full Policy Brief <ChevronRight size={11} />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ SCHEDULE ═══ */}
          {activeTab === "schedule" && (
            <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <SectionHeader icon={Calendar} label="Campaign Schedule" sub="Apr 14–17, 2026 · Confirmed & tentative" />
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all hover:bg-[#2979FF]/10"
                  style={{ border: `1px solid ${C.border}`, color: C.sub }}>
                  <Plus size={13} /> Add Event
                </button>
              </div>
              {/* Type legend */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {Object.entries(SCHEDULE_TYPE_CONFIG).map(([id, cfg]) => (
                  <div key={id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                    style={{ backgroundColor: `${cfg.color}12`, border: `1px solid ${cfg.color}30`, color: cfg.color }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                    {cfg.label}
                  </div>
                ))}
              </div>
              {/* Group by date */}
              {["Apr 14", "Apr 15", "Apr 16", "Apr 17"].map(date => {
                const events = SCHEDULE.filter(e => e.date === date);
                if (!events.length) return null;
                return (
                  <div key={date} className="mb-6">
                    <div className="text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-2"
                      style={{ color: C.accent }}>
                      <div className="w-5 h-0.5 rounded-full" style={{ backgroundColor: C.accent }} />
                      {date} · {events[0].day}
                    </div>
                    <div className="space-y-2">
                      {events.map((ev, i) => {
                        const cfg = SCHEDULE_TYPE_CONFIG[ev.type];
                        return (
                          <div key={i} className="flex items-stretch gap-0 rounded-xl overflow-hidden"
                            style={{ border: `1px solid ${cfg.color}30`, backgroundColor: `${cfg.color}06` }}>
                            <div className="w-1 flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                            <div className="flex items-center gap-4 px-4 py-3 flex-1">
                              <div className="flex-shrink-0 text-center w-16">
                                <div className="font-black text-sm" style={{ color: cfg.color }}>{ev.time}</div>
                                <div className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-1"
                                  style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
                                  {cfg.label}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-black" style={{ color: C.text }}>{ev.title}</div>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[11px]" style={{ color: C.muted }}>
                                  <MapPin size={10} /> {ev.location}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {ev.confirmed ? (
                                  <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg"
                                    style={{ backgroundColor: "rgba(0,200,83,0.1)", color: "#00C853", border: "1px solid rgba(0,200,83,0.3)" }}>
                                    <CheckCircle size={9} /> Confirmed
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg"
                                    style={{ backgroundColor: "rgba(255,214,0,0.1)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.3)" }}>
                                    <Clock size={9} /> Tentative
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ═══ MEDIA ═══ */}
          {activeTab === "media" && (
            <motion.div key="media" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <SectionHeader icon={Newspaper} label="Press & Media" sub="Monitoring · 30-day window" accent="#00E5FF" />
              {/* Sentiment bar */}
              <div className="rounded-2xl p-4 flex items-center gap-6" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                {[
                  { label: "Positive", count: PRESS_CLIPS.filter(p=>p.sentiment==="positive").length, color: "#00C853" },
                  { label: "Neutral",  count: PRESS_CLIPS.filter(p=>p.sentiment==="neutral").length,  color: "#FFD600" },
                  { label: "Negative", count: PRESS_CLIPS.filter(p=>p.sentiment==="negative").length, color: "#FF3B30" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.count}</div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: s.color }}>{s.label}</div>
                      <div className="text-[8px]" style={{ color: C.muted }}>articles</div>
                    </div>
                  </div>
                ))}
                <div className="flex-1 ml-4">
                  <div className="flex h-3 rounded-full overflow-hidden">
                    {[["#00C853", 4], ["#FFD600", 2], ["#FF3B30", 0]].map(([c, n], i) => (
                      <div key={i} className="h-full transition-all" style={{ backgroundColor: c as string, flex: n as number }} />
                    ))}
                  </div>
                  <div className="text-[8px] mt-1" style={{ color: C.muted }}>Overall sentiment: <span style={{ color: "#00C853", fontWeight: 800 }}>Positive</span></div>
                </div>
              </div>
              {/* Clips */}
              <div className="space-y-2">
                {PRESS_CLIPS.map((clip, i) => {
                  const sColor = clip.sentiment === "positive" ? "#00C853" : clip.sentiment === "negative" ? "#FF3B30" : "#FFD600";
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-xl transition-all hover:border-[#2979FF]/40 cursor-pointer group"
                      style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                      <div className="flex-shrink-0 w-1.5 h-10 rounded-full" style={{ backgroundColor: sColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm group-hover:text-[#00E5FF] transition-colors truncate" style={{ color: C.text }}>
                          {clip.headline}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.accentB }}>{clip.outlet}</span>
                          <span className="text-[9px]" style={{ color: C.muted }}>{clip.time}</span>
                          <span className="text-[9px]" style={{ color: C.muted }}>{clip.views} views</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: `${sColor}15`, color: sColor, border: `1px solid ${sColor}30` }}>
                        {clip.sentiment}
                      </span>
                      <ArrowUpRight size={14} style={{ color: C.muted, flexShrink: 0 }} className="group-hover:text-[#00E5FF] transition-colors" />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ PERFORMANCE ═══ */}
          {activeTab === "performance" && (
            <motion.div key="performance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <SectionHeader icon={Activity} label="Campaign Performance" sub="Real-time field metrics · Riding 42" accent="#00C853" />
              <div className="grid grid-cols-3 gap-4">
                {KPI_METRICS.map(k => (
                  <div key={k.label} className="rounded-2xl p-5 relative overflow-hidden"
                    style={{ backgroundColor: C.card, border: `1px solid ${k.color}30` }}>
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] pointer-events-none"
                      style={{ backgroundColor: `${k.color}18` }} />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${k.color}15`, color: k.color }}>
                      <k.icon size={18} />
                    </div>
                    <div className="text-3xl font-black" style={{ color: k.color }}>{k.value}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: C.text }}>{k.label}</div>
                    <div className="text-[9px]" style={{ color: C.muted }}>{k.sub}</div>
                  </div>
                ))}
              </div>
              {/* Talking points */}
              <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                <SectionHeader icon={Mic} label="Active Talking Points" sub="Approved by campaign comms · Rev. Apr 13" accent="#9C27B0" />
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { point: "Maria is the only candidate with a concrete plan to build 10,000 new housing units right here in Parkdale–High Park.", tag: "Housing" },
                    { point: "Under the Liberals, wait times at Queensway Carleton and CAMH have been cut by 22% — we'll keep that momentum.", tag: "Healthcare" },
                    { point: "The Conservatives voted against pharmacare three times. Maria will fight to protect your prescription coverage.", tag: "Attack" },
                    { point: "Every family deserves a $15/day childcare space. Maria has delivered 1,200 new spots since 2023.", tag: "Families" },
                    { point: "The Eglinton Crosstown delay is unacceptable. Maria will hold contractors accountable and open it before 2027.", tag: "Transit" },
                    { point: "Parkdale–High Park led the country in volunteer sign-ups — the community believes in this campaign.", tag: "Ground Game" },
                  ].map((tp, i) => (
                    <div key={i} className="p-4 rounded-xl flex items-start gap-3"
                      style={{ backgroundColor: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-black"
                        style={{ backgroundColor: "rgba(41,121,255,0.2)", color: C.accentB }}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] leading-relaxed" style={{ color: C.sub }}>{tp.point}</p>
                        <span className="inline-block mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                          style={{ backgroundColor: "rgba(0,229,255,0.1)", color: C.accent, border: `1px solid rgba(0,229,255,0.2)` }}>
                          {tp.tag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
