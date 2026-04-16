import React, { useState, useMemo } from "react";
import {
  Search, Filter, Plus, ChevronRight, Phone, Mail, Globe,
  Star, MessageSquare, FileText, ArrowUpRight, Check,
  Building2, Users, Handshake, Shield, AlertTriangle,
  User, Calendar, Clock, X, Edit3, Tag, Link2,
  MapPin, Award, BarChart2, Briefcase, RefreshCcw,
  TrendingUp, Download, Radio, Zap, Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../utils/cn";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

/* ─── DESIGN TOKENS ─────────────────────────────────────────────────────── */
const C = {
  bg: "#050A1F", card: "#0F1440", deep: "#070D28",
  border: "rgba(41,121,255,0.2)", borderB: "rgba(0,229,255,0.3)",
  text: "#F5F7FF", sub: "#AAB2FF", muted: "#6B72A0",
  accent: "#00E5FF", accentB: "#2979FF",
};

const PARTY_COLOR: Record<string, string> = {
  LIB: "#D91E2A", CON: "#1A4B8C", NDP: "#F37021",
  BQ: "#003DA5", GRN: "#3D9B35", IND: "#7B84B8", PPC: "#4B0082",
};

const REL_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ally:     { label: "Ally",      color: "#00C853", icon: Handshake   },
  neutral:  { label: "Neutral",   color: "#FFD600", icon: User        },
  opponent: { label: "Opponent",  color: "#FF3B30", icon: Shield      },
  endorser: { label: "Endorser",  color: "#00E5FF", icon: Star        },
  unknown:  { label: "Unknown",   color: "#6B72A0", icon: AlertTriangle },
};

/* ─── TYPES ─────────────────────────────────────────────────────────────── */
type Official = {
  id: string;
  name: string;
  title: string;
  chamber: "federal-mp" | "provincial-mpp" | "city-council" | "senate" | "federal-minister";
  party: string;
  riding: string;
  phone: string;
  email: string;
  website: string;
  relationship: keyof typeof REL_CONFIG;
  tags: string[];
  keyIssues: string[];
  lastContact: string;
  notes: string;
  endorsed: boolean;
  endorsedDate?: string;
  radarData: { subject: string; A: number }[];
  recentActivity: { type: string; text: string; time: string }[];
  bio: string;
  twitter?: string;
};

/* ─── SEED DATA ─────────────────────────────────────────────────────────── */
const OFFICIALS: Official[] = [
  // Federal MPs / Ministers
  {
    id: "mp-01", name: "Dominic Leblanc", title: "Minister of Finance & Intergovernmental Affairs",
    chamber: "federal-minister", party: "LIB", riding: "Beauséjour, NB",
    phone: "613-995-2281", email: "dominic.leblanc@parl.gc.ca", website: "leblanc.liberal.ca",
    relationship: "ally", tags: ["Cabinet", "Finance", "Key Contact"],
    keyIssues: ["Fiscal policy", "Housing fund", "Equalization"],
    lastContact: "Apr 10", notes: "Supportive of riding's housing application. Direct line to PMO briefings.",
    endorsed: true, endorsedDate: "Apr 5",
    bio: "Senior Liberal minister, Beauséjour MP since 2000. Close PMO ally. Key liaison for federal housing transfers.",
    twitter: "@DominicLeBlanc",
    radarData: [
      { subject: "Influence", A: 95 }, { subject: "Alignment", A: 88 }, { subject: "Accessibility", A: 72 },
      { subject: "Housing", A: 84 }, { subject: "Transit", A: 60 }, { subject: "Media", A: 90 },
    ],
    recentActivity: [
      { type: "meeting", text: "Bilateral on housing fund allocations", time: "Apr 10" },
      { type: "endorsement", text: "Publicly endorsed Maria Chen campaign", time: "Apr 5" },
      { type: "call", text: "Budget briefing call — pre-writ", time: "Mar 28" },
    ],
  },
  {
    id: "mp-02", name: "Julie Dabrusin", title: "MP — Toronto–Danforth",
    chamber: "federal-mp", party: "LIB", riding: "Toronto–Danforth, ON",
    phone: "416-467-0860", email: "julie.dabrusin@parl.gc.ca", website: "juliedabrusin.liberal.ca",
    relationship: "ally", tags: ["Neighbouring Riding", "Endorsed"],
    keyIssues: ["Climate policy", "Housing", "Arts funding"],
    lastContact: "Apr 12", notes: "Campaign coalition partner — sharing volunteers and data on the Danforth corridor.",
    endorsed: true, endorsedDate: "Mar 22",
    bio: "Incumbent MP for Toronto–Danforth. Past Parliamentary Secretary to Environment. Strong on green transit.",
    twitter: "@juliedabrusin",
    radarData: [
      { subject: "Influence", A: 70 }, { subject: "Alignment", A: 91 }, { subject: "Accessibility", A: 88 },
      { subject: "Housing", A: 78 }, { subject: "Transit", A: 82 }, { subject: "Media", A: 65 },
    ],
    recentActivity: [
      { type: "canvass", text: "Joint canvass — Danforth Ave corridor", time: "Apr 12" },
      { type: "event", text: "Shared stage at East End housing forum", time: "Apr 8" },
    ],
  },
  {
    id: "mp-03", name: "Kevin Vuong", title: "MP — Spadina–Fort York (IND)",
    chamber: "federal-mp", party: "IND", riding: "Spadina–Fort York, ON",
    phone: "416-954-0013", email: "kevin.vuong@parl.gc.ca", website: "kevinvuong.ca",
    relationship: "neutral", tags: ["Adjacent Riding", "Watch"],
    keyIssues: ["Condo development", "Waterfront"],
    lastContact: "Mar 15", notes: "Politically unreliable. Monitor for any riding incursions on the downtown fringe.",
    endorsed: false,
    bio: "Independent MP, former NDP candidate. Complex political history. Riding borders affect our western precinct.",
    radarData: [
      { subject: "Influence", A: 42 }, { subject: "Alignment", A: 28 }, { subject: "Accessibility", A: 50 },
      { subject: "Housing", A: 35 }, { subject: "Transit", A: 60 }, { subject: "Media", A: 45 },
    ],
    recentActivity: [
      { type: "note", text: "Position on condo density review noted", time: "Mar 15" },
    ],
  },
  {
    id: "mp-04", name: "Michael Chong", title: "MP — Wellington–Halton Hills (Opposition)",
    chamber: "federal-mp", party: "CON", riding: "Wellington–Halton Hills, ON",
    phone: "613-992-1812", email: "michael.chong@parl.gc.ca", website: "michaelchong.ca",
    relationship: "opponent", tags: ["Shadow Cabinet", "Foreign Affairs", "Monitor"],
    keyIssues: ["Foreign interference", "Housing supply", "Indo-Pacific"],
    lastContact: "Mar 5", notes: "Leading CON critic. High media profile. Track his housing supply frame for counter-messaging.",
    endorsed: false,
    bio: "Senior Conservative critic and shadow minister. Reform Act author. Credible opposition voice on housing.",
    twitter: "@MichaelChongMP",
    radarData: [
      { subject: "Influence", A: 80 }, { subject: "Alignment", A: 20 }, { subject: "Accessibility", A: 30 },
      { subject: "Housing", A: 72 }, { subject: "Transit", A: 40 }, { subject: "Media", A: 85 },
    ],
    recentActivity: [
      { type: "media", text: "Housing supply speech — CON counter-frame", time: "Mar 5" },
    ],
  },
  {
    id: "mp-05", name: "Jagmeet Singh", title: "Leader — NDP",
    chamber: "federal-mp", party: "NDP", riding: "Burnaby South, BC",
    phone: "613-995-7224", email: "jagmeet.singh@parl.gc.ca", website: "jagmeetsingh.ca",
    relationship: "opponent", tags: ["Party Leader", "NDP", "Monitor"],
    keyIssues: ["Pharmacare", "Housing", "Wealth tax"],
    lastContact: "Feb 20", notes: "NDP vote share is our biggest risk in Parkdale–High Park. Track his transit/housing messaging closely.",
    endorsed: false,
    bio: "Leader of the NDP since 2017. Strong brand in urban ridings. NDP vote bleeding hurts our margin.",
    twitter: "@theJagmeetSingh",
    radarData: [
      { subject: "Influence", A: 88 }, { subject: "Alignment", A: 38 }, { subject: "Accessibility", A: 22 },
      { subject: "Housing", A: 80 }, { subject: "Transit", A: 78 }, { subject: "Media", A: 90 },
    ],
    recentActivity: [
      { type: "media", text: "Pharmacare platform launch — national presser", time: "Feb 20" },
    ],
  },
  // Provincial MPPs
  {
    id: "mpp-01", name: "Bhutila Karpoche", title: "MPP — Parkdale–High Park (Provincial)",
    chamber: "provincial-mpp", party: "NDP", riding: "Parkdale–High Park, ON",
    phone: "416-763-5630", email: "bkarpoche@ndp.on.ca", website: "bhutilakarpoche.ndp.on.ca",
    relationship: "neutral", tags: ["Same Riding", "NDP", "Key Relationship"],
    keyIssues: ["Tenant rights", "Mental health", "Education"],
    lastContact: "Apr 9", notes: "Different level of gov't but shares our riding. Cooperative on tenant issues. Careful not to step on her provincial files.",
    endorsed: false,
    bio: "Provincial NDP MPP for Parkdale–High Park since 2018. Strong community ties. Critical partner on housing advocacy.",
    radarData: [
      { subject: "Influence", A: 68 }, { subject: "Alignment", A: 62 }, { subject: "Accessibility", A: 80 },
      { subject: "Housing", A: 85 }, { subject: "Transit", A: 70 }, { subject: "Media", A: 55 },
    ],
    recentActivity: [
      { type: "meeting", text: "Provincial housing policy coordination", time: "Apr 9" },
      { type: "event", text: "Shared tenant rights rally — Roncesvalles", time: "Apr 1" },
    ],
  },
  {
    id: "mpp-02", name: "Doly Begum", title: "MPP — Scarborough Southwest",
    chamber: "provincial-mpp", party: "NDP", riding: "Scarborough Southwest, ON",
    phone: "416-265-4091", email: "dbegum@ndp.on.ca", website: "dolybegum.ndp.on.ca",
    relationship: "ally", tags: ["Transit Focus", "NDP"],
    keyIssues: ["Transit expansion", "Newcomer services", "Housing"],
    lastContact: "Mar 30", notes: "Supportive on Eglinton file. Good contact for Tamil community outreach.",
    endorsed: false,
    bio: "NDP MPP, progressive transit advocate. Strong ties in Scarborough's South Asian community.",
    radarData: [
      { subject: "Influence", A: 55 }, { subject: "Alignment", A: 70 }, { subject: "Accessibility", A: 75 },
      { subject: "Housing", A: 65 }, { subject: "Transit", A: 88 }, { subject: "Media", A: 48 },
    ],
    recentActivity: [
      { type: "call", text: "Eglinton delay legislative strategy call", time: "Mar 30" },
    ],
  },
  // City Council
  {
    id: "cc-01", name: "Gord Perks", title: "City Councillor — Ward 4, Parkdale–High Park",
    chamber: "city-council", party: "IND", riding: "Ward 4, Toronto",
    phone: "416-392-7919", email: "councillor_perks@toronto.ca", website: "gordperks.ca",
    relationship: "ally", tags: ["Same Ward", "Housing", "Environment", "Key"],
    keyIssues: ["Zoning reform", "Green space", "Cycling infra", "Shelter system"],
    lastContact: "Apr 11", notes: "Critical ally. Shares our ward. Has offered campaign office space and direct voter file coordination.",
    endorsed: true, endorsedDate: "Apr 7",
    bio: "Ward 4 Councillor since 2006. Progressive icon. Deeply trusted in Parkdale and Roncesvalles communities.",
    twitter: "@gordperks",
    radarData: [
      { subject: "Influence", A: 82 }, { subject: "Alignment", A: 90 }, { subject: "Accessibility", A: 92 },
      { subject: "Housing", A: 88 }, { subject: "Transit", A: 75 }, { subject: "Media", A: 70 },
    ],
    recentActivity: [
      { type: "meeting", text: "Voter file coordination — shared canvass zones", time: "Apr 11" },
      { type: "endorsement", text: "Public endorsement at High Park rally", time: "Apr 7" },
      { type: "event", text: "Joint community meeting — Roncesvalles BIA", time: "Apr 3" },
    ],
  },
  {
    id: "cc-02", name: "Ana Bailão", title: "Former Councillor / Deputy Mayor (Housing Lead)",
    chamber: "city-council", party: "IND", riding: "Davenport, Toronto",
    phone: "416-392-7012", email: "anabailao@toronto.ca", website: "anabailao.ca",
    relationship: "endorser", tags: ["Housing Expert", "Davenport", "Endorser"],
    keyIssues: ["Affordable housing", "Land trust", "Construction"],
    lastContact: "Apr 6", notes: "Former housing champion at City Hall. Her community land trust endorsement is gold in our platform messaging.",
    endorsed: true, endorsedDate: "Apr 6",
    bio: "10-year councillor, former Deputy Mayor. Led Toronto's affordable housing strategy. Now advising non-profits.",
    radarData: [
      { subject: "Influence", A: 75 }, { subject: "Alignment", A: 88 }, { subject: "Accessibility", A: 78 },
      { subject: "Housing", A: 96 }, { subject: "Transit", A: 50 }, { subject: "Media", A: 72 },
    ],
    recentActivity: [
      { type: "endorsement", text: "Endorsed housing land trust platform plank", time: "Apr 6" },
      { type: "media", text: "Quote in Toronto Star housing article", time: "Apr 4" },
    ],
  },
  {
    id: "cc-03", name: "Stephen Holyday", title: "City Councillor — Ward 2, Etobicoke Centre",
    chamber: "city-council", party: "IND", riding: "Ward 2, Toronto",
    phone: "416-392-4060", email: "councillor_holyday@toronto.ca", website: "stephenholyday.ca",
    relationship: "opponent", tags: ["Conservative-aligned", "Watch"],
    keyIssues: ["Fiscal restraint", "Zoning status quo", "Taxpayer rights"],
    lastContact: "Jan 8", notes: "Conservative-aligned. Votes against most progressive housing motions. Not a coalition partner.",
    endorsed: false,
    bio: "Ward 2 Councillor since 2014. Fiscally conservative. Opposition on most downtown density votes.",
    radarData: [
      { subject: "Influence", A: 45 }, { subject: "Alignment", A: 18 }, { subject: "Accessibility", A: 35 },
      { subject: "Housing", A: 30 }, { subject: "Transit", A: 25 }, { subject: "Media", A: 40 },
    ],
    recentActivity: [
      { type: "note", text: "Voted against Parkdale supportive housing motion", time: "Jan 8" },
    ],
  },
  {
    id: "cc-04", name: "Ausma Malik", title: "City Councillor — Ward 10, Spadina–Fort York",
    chamber: "city-council", party: "IND", riding: "Ward 10, Toronto",
    phone: "416-392-7014", email: "councillor_malik@toronto.ca", website: "ausmamalik.ca",
    relationship: "ally", tags: ["Progressive", "Housing", "Young Voices"],
    keyIssues: ["Community housing", "Anti-displacement", "Newcomers"],
    lastContact: "Apr 9", notes: "Strong progressive bloc member. Ally on every housing and social services vote. Potential joint event.",
    endorsed: false,
    bio: "Elected 2022, Spadina-Fort York. Former educator, housing rights organiser. One of council's strongest progressive voices.",
    twitter: "@AusmaMalik_",
    radarData: [
      { subject: "Influence", A: 62 }, { subject: "Alignment", A: 87 }, { subject: "Accessibility", A: 84 },
      { subject: "Housing", A: 90 }, { subject: "Transit", A: 68 }, { subject: "Media", A: 60 },
    ],
    recentActivity: [
      { type: "meeting", text: "Progressive caucus coalition strategy", time: "Apr 9" },
      { type: "event", text: "Anti-displacement rally — Kensington Market", time: "Apr 2" },
    ],
  },
  // Senate
  {
    id: "sen-01", name: "Ratna Omidvar", title: "Senator — Ontario (ISG)",
    chamber: "senate", party: "IND", riding: "Senate of Canada",
    phone: "613-992-0120", email: "ratna.omidvar@sen.parl.gc.ca", website: "omidvar.sencanada.ca",
    relationship: "ally", tags: ["Senate", "Newcomers", "Diversity"],
    keyIssues: ["Newcomer integration", "Anti-racism", "Civil society"],
    lastContact: "Mar 18", notes: "Strong ally on newcomer rights framing. Helpful for community outreach to immigrant populations.",
    endorsed: false,
    bio: "Senator since 2016 (ISG). Former Maytree Foundation president. International expert on migration & inclusion.",
    twitter: "@RatnaOmidvar",
    radarData: [
      { subject: "Influence", A: 72 }, { subject: "Alignment", A: 82 }, { subject: "Accessibility", A: 70 },
      { subject: "Housing", A: 65 }, { subject: "Transit", A: 40 }, { subject: "Media", A: 68 },
    ],
    recentActivity: [
      { type: "meeting", text: "Newcomer rights policy alignment call", time: "Mar 18" },
    ],
  },
];

const CHAMBER_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  "all":               { label: "All Officials", color: C.accent,    icon: Users      },
  "federal-minister":  { label: "Cabinet",       color: "#D91E2A",   icon: Briefcase  },
  "federal-mp":        { label: "Federal MPs",   color: "#2979FF",   icon: Building2  },
  "provincial-mpp":    { label: "Prov. MPPs",    color: "#FF9F0A",   icon: Shield     },
  "city-council":      { label: "City Council",  color: "#00C853",   icon: MapPin     },
  "senate":            { label: "Senate",        color: "#9C27B0",   icon: Award      },
};

/* ─── ACTIVITY ICON ─────────────────────────────────────────────────────── */
function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ElementType> = {
    meeting: Users, call: Phone, endorsement: Star, media: Radio,
    canvass: MapPin, event: Calendar, note: FileText,
  };
  const Icon = icons[type] ?? FileText;
  return <Icon size={10} />;
}

/* ─── OFFICIAL DETAIL PANEL ─────────────────────────────────────────────── */
function OfficialPanel({ official, onClose }: { official: Official; onClose: () => void }) {
  const partyColor = PARTY_COLOR[official.party] ?? "#7B84B8";
  const rel = REL_CONFIG[official.relationship];
  const chamberCfg = CHAMBER_CONFIG[official.chamber];
  const RelIcon = rel.icon;

  return (
    <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: C.bg, borderLeft: `1px solid ${C.border}` }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: C.border, backgroundColor: C.card }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
              style={{ backgroundColor: partyColor, boxShadow: `0 0 16px ${partyColor}40` }}>
              {official.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <div className="font-black" style={{ color: C.text }}>{official.name}</div>
              <div className="text-[10px] mt-0.5" style={{ color: C.sub }}>{official.title}</div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${partyColor}20`, color: partyColor, border: `1px solid ${partyColor}40` }}>
                  {official.party}
                </span>
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${chamberCfg.color}12`, color: chamberCfg.color, border: `1px solid ${chamberCfg.color}30` }}>
                  {chamberCfg.label}
                </span>
                <span className="flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${rel.color}12`, color: rel.color, border: `1px solid ${rel.color}30` }}>
                  <RelIcon size={8} /> {rel.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/10"
            style={{ border: `1px solid ${C.border}`, color: C.muted }}>
            <X size={13} />
          </button>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { icon: Phone, val: official.phone },
            { icon: Mail,  val: official.email  },
            { icon: Globe, val: official.website },
            ...(official.twitter ? [{ icon: Hash, val: official.twitter }] : []),
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
              style={{ backgroundColor: "rgba(41,121,255,0.05)", border: `1px solid ${C.border}` }}>
              <c.icon size={10} style={{ color: C.accentB, flexShrink: 0 }} />
              <span className="text-[9px] truncate" style={{ color: C.sub }}>{c.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
        {/* Bio */}
        <div>
          <div className="text-[8px] font-black uppercase tracking-widest mb-1.5" style={{ color: C.muted }}>Bio</div>
          <p className="text-[11px] leading-relaxed" style={{ color: C.sub }}>{official.bio}</p>
        </div>

        {/* Key issues */}
        <div>
          <div className="text-[8px] font-black uppercase tracking-widest mb-1.5" style={{ color: C.muted }}>Key Issues</div>
          <div className="flex flex-wrap gap-1.5">
            {official.keyIssues.map(iss => (
              <span key={iss} className="text-[9px] font-bold px-2 py-1 rounded-lg"
                style={{ backgroundColor: "rgba(0,229,255,0.08)", color: C.accent, border: `1px solid rgba(0,229,255,0.2)` }}>
                {iss}
              </span>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <div className="text-[8px] font-black uppercase tracking-widest mb-1.5" style={{ color: C.muted }}>Tags</div>
          <div className="flex flex-wrap gap-1.5">
            {official.tags.map(t => (
              <span key={t} className="text-[9px] px-2 py-1 rounded-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", color: C.muted, border: `1px solid ${C.border}` }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Intel notes */}
        <div>
          <div className="text-[8px] font-black uppercase tracking-widest mb-1.5" style={{ color: C.muted }}>Campaign Intel</div>
          <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(255,214,0,0.04)", border: "1px solid rgba(255,214,0,0.2)" }}>
            <p className="text-[11px] leading-relaxed" style={{ color: C.sub }}>{official.notes}</p>
          </div>
        </div>

        {/* Alignment radar */}
        <div>
          <div className="text-[8px] font-black uppercase tracking-widest mb-1.5" style={{ color: C.muted }}>Alignment Profile</div>
          <div className="h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={official.radarData}>
                <PolarGrid stroke="rgba(41,121,255,0.2)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: C.sub, fontSize: 8, fontWeight: 700 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="A" stroke={rel.color} strokeWidth={2} fill={rel.color} fillOpacity={0.15} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="text-[8px] font-black uppercase tracking-widest mb-2" style={{ color: C.muted }}>Recent Activity</div>
          <div className="space-y-2">
            {official.recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-xl"
                style={{ backgroundColor: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "rgba(41,121,255,0.12)", color: C.accentB }}>
                  <ActivityIcon type={a.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] leading-snug" style={{ color: C.sub }}>{a.text}</div>
                  <div className="text-[8px] mt-0.5" style={{ color: C.muted }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last contact */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: "rgba(0,229,255,0.04)", border: `1px solid rgba(0,229,255,0.15)` }}>
          <Clock size={11} style={{ color: C.accent }} />
          <span className="text-[10px]" style={{ color: C.sub }}>Last contact: <span className="font-black" style={{ color: C.accent }}>{official.lastContact}</span></span>
        </div>

        {/* Endorsement */}
        {official.endorsed && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ backgroundColor: "rgba(0,200,83,0.06)", border: "1px solid rgba(0,200,83,0.3)" }}>
            <Star size={11} style={{ color: "#00C853", fill: "#00C853" }} />
            <span className="text-[10px]" style={{ color: "#00C853" }}>Endorsement confirmed — <span className="font-black">{official.endorsedDate}</span></span>
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="px-5 py-3 border-t flex gap-2 flex-shrink-0" style={{ borderColor: C.border, backgroundColor: C.card }}>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#2979FF]/20"
          style={{ border: `1px solid ${C.border}`, color: C.sub }}>
          <Phone size={11} /> Call
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#2979FF]/20"
          style={{ border: `1px solid ${C.border}`, color: C.sub }}>
          <Mail size={11} /> Email
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#2979FF]/20"
          style={{ border: `1px solid ${C.border}`, color: C.sub }}>
          <FileText size={11} /> Note
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#00E5FF]/10"
          style={{ border: `1px solid rgba(0,229,255,0.3)`, color: C.accent }}>
          <Edit3 size={11} /> Edit
        </button>
      </div>
    </motion.div>
  );
}

/* ─── OFFICIAL CARD (table row) ─────────────────────────────────────────── */
function OfficialRow({ official, isSelected, onClick }: { official: Official; isSelected: boolean; onClick: () => void }) {
  const partyColor = PARTY_COLOR[official.party] ?? "#7B84B8";
  const rel = REL_CONFIG[official.relationship];
  const RelIcon = rel.icon;
  const chamberCfg = CHAMBER_CONFIG[official.chamber];

  return (
    <motion.tr layout
      className="group cursor-pointer transition-colors border-b"
      style={{ borderColor: C.border, backgroundColor: isSelected ? "rgba(0,229,255,0.05)" : "transparent" }}
      onClick={onClick}>
      {/* Name + avatar */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
            style={{ backgroundColor: partyColor, boxShadow: isSelected ? `0 0 12px ${partyColor}40` : undefined }}>
            {official.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
          </div>
          <div>
            <div className="font-black text-sm group-hover:text-[#00E5FF] transition-colors" style={{ color: isSelected ? C.accent : C.text }}>
              {official.name}
            </div>
            <div className="text-[10px] truncate max-w-[200px]" style={{ color: C.muted }}>{official.title}</div>
          </div>
        </div>
      </td>
      {/* Chamber */}
      <td className="px-4 py-3">
        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg w-fit"
          style={{ backgroundColor: `${chamberCfg.color}12`, color: chamberCfg.color, border: `1px solid ${chamberCfg.color}30` }}>
          <chamberCfg.icon size={9} /> {chamberCfg.label}
        </span>
      </td>
      {/* Party */}
      <td className="px-4 py-3">
        <span className="text-[9px] font-black px-2 py-1 rounded uppercase"
          style={{ backgroundColor: `${partyColor}20`, color: partyColor }}>
          {official.party}
        </span>
      </td>
      {/* Riding */}
      <td className="px-4 py-3">
        <div className="text-[10px] truncate max-w-[180px]" style={{ color: C.sub }}>{official.riding}</div>
      </td>
      {/* Relationship */}
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg w-fit"
          style={{ backgroundColor: `${rel.color}12`, color: rel.color, border: `1px solid ${rel.color}30` }}>
          <RelIcon size={9} /> {rel.label}
        </span>
      </td>
      {/* Last contact */}
      <td className="px-4 py-3">
        <div className="text-[10px]" style={{ color: C.muted }}>{official.lastContact}</div>
      </td>
      {/* Endorsed */}
      <td className="px-4 py-3">
        {official.endorsed
          ? <Star size={14} style={{ color: "#FFD600", fill: "#FFD600" }} />
          : <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}` }} />}
      </td>
      {/* Arrow */}
      <td className="px-4 py-3">
        <ChevronRight size={14} className="group-hover:text-[#00E5FF] transition-colors" style={{ color: C.muted }} />
      </td>
    </motion.tr>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export function ElectedOfficials() {
  const [chamberFilter, setChamberFilter] = useState<string>("all");
  const [relFilter, setRelFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedOfficial = OFFICIALS.find(o => o.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    return OFFICIALS.filter(o => {
      const matchChamber = chamberFilter === "all" || o.chamber === chamberFilter;
      const matchRel = relFilter === "all" || o.relationship === relFilter;
      const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.riding.toLowerCase().includes(search.toLowerCase()) ||
        o.party.toLowerCase().includes(search.toLowerCase());
      return matchChamber && matchRel && matchSearch;
    });
  }, [chamberFilter, relFilter, search]);

  // Stat totals
  const stats = {
    allies:    OFFICIALS.filter(o => o.relationship === "ally").length,
    endorsers: OFFICIALS.filter(o => o.endorsed).length,
    neutral:   OFFICIALS.filter(o => o.relationship === "neutral").length,
    opponents: OFFICIALS.filter(o => o.relationship === "opponent").length,
  };

  return (
    <div className="flex h-full bg-[#050A1F] text-[#F5F7FF]">

      {/* ── MAIN ── */}
      <div className={cn("flex-1 flex flex-col min-w-0 transition-all duration-300", selectedOfficial ? "border-r border-[#2979FF]/20" : "")}>

        {/* Header */}
        <div className="px-6 py-4 border-b flex-shrink-0" style={{ borderColor: C.border, backgroundColor: `${C.card}CC`, backdropFilter: "blur(12px)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"
                style={{ color: C.text, textShadow: "0 0 8px rgba(41,121,255,0.6)" }}>
                <Building2 size={20} style={{ color: C.accent }} />
                Elected Officials
              </h1>
              <div className="text-[11px] mt-0.5" style={{ color: C.muted }}>
                Coalition map · Riding 42 · Federal Election Apr 28, 2026
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all hover:bg-white/5"
                style={{ border: `1px solid ${C.border}`, color: C.sub }}>
                <Download size={13} /> Export
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all"
                style={{ backgroundColor: C.accentB, color: "#fff", boxShadow: `0 0 16px rgba(41,121,255,0.4)` }}>
                <Plus size={13} /> Add Official
              </button>
            </div>
          </div>

          {/* Relationship stat strip */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Allies",     count: stats.allies,    color: "#00C853", icon: Handshake  },
              { label: "Endorsers",  count: stats.endorsers, color: "#FFD600", icon: Star       },
              { label: "Neutral",    count: stats.neutral,   color: "#FFD600", icon: User       },
              { label: "Opponents",  count: stats.opponents, color: "#FF3B30", icon: Shield     },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:border-white/20"
                style={{ backgroundColor: `${s.color}08`, border: `1px solid ${s.color}25` }}
                onClick={() => setRelFilter(s.label.toLowerCase() === "endorsers" ? "endorser" : s.label.toLowerCase())}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                  <s.icon size={15} />
                </div>
                <div>
                  <div className="font-black text-lg" style={{ color: s.color }}>{s.count}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.muted }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.accentB }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search officials..."
                className="pl-8 pr-3 py-2 rounded-lg text-[11px] bg-transparent w-52 focus:outline-none focus:ring-1 transition-all"
                style={{ border: `1px solid ${C.border}`, color: C.text, caretColor: C.accent }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border} />
            </div>

            {/* Chamber tabs */}
            <div className="flex gap-1 flex-wrap">
              {Object.entries(CHAMBER_CONFIG).map(([id, cfg]) => (
                <button key={id} onClick={() => setChamberFilter(id)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all")}
                  style={{
                    backgroundColor: chamberFilter === id ? `${cfg.color}20` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${chamberFilter === id ? cfg.color : C.border}`,
                    color: chamberFilter === id ? cfg.color : C.muted,
                    boxShadow: chamberFilter === id ? `0 0 10px ${cfg.color}25` : undefined,
                  }}>
                  <cfg.icon size={9} /> {cfg.label}
                </button>
              ))}
            </div>

            {/* Relationship filter */}
            <div className="flex gap-1 ml-auto">
              <button onClick={() => setRelFilter("all")}
                className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                style={{ backgroundColor: relFilter === "all" ? "rgba(255,255,255,0.08)" : "transparent", border: `1px solid ${C.border}`, color: relFilter === "all" ? C.text : C.muted }}>
                All
              </button>
              {Object.entries(REL_CONFIG).filter(([id]) => id !== "unknown").map(([id, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button key={id} onClick={() => setRelFilter(id === relFilter ? "all" : id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                    style={{
                      backgroundColor: relFilter === id ? `${cfg.color}15` : "transparent",
                      border: `1px solid ${relFilter === id ? cfg.color : C.border}`,
                      color: relFilter === id ? cfg.color : C.muted,
                    }}>
                    <Icon size={9} /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: `${C.deep}F0`, backdropFilter: "blur(8px)" }}>
              <tr className="border-b" style={{ borderColor: C.border }}>
                {["Official", "Chamber", "Party", "Riding", "Relationship", "Last Contact", "★", ""].map(h => (
                  <th key={h} className="px-5 py-2.5 text-left text-[9px] font-black uppercase tracking-widest"
                    style={{ color: C.muted }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-[12px] font-bold" style={{ color: C.muted }}>
                      No officials match the current filters.
                    </td>
                  </tr>
                ) : filtered.map(o => (
                  <OfficialRow
                    key={o.id}
                    official={o}
                    isSelected={o.id === selectedId}
                    onClick={() => setSelectedId(o.id === selectedId ? null : o.id)}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t text-[10px]" style={{ borderColor: C.border, color: C.muted }}>
              Showing {filtered.length} of {OFFICIALS.length} officials
            </div>
          )}
        </div>
      </div>

      {/* ── DETAIL PANEL ── */}
      <AnimatePresence>
        {selectedOfficial && (
          <div className="w-[360px] flex-shrink-0">
            <OfficialPanel official={selectedOfficial} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
