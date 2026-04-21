"use client";
/* ─────────────────────────────────────────────────────────────────────
   Poll City — Field Command + War Room  v3
   Ported from figma_design_pollcity_iosapp/pages/Social/SocialCommand.tsx
   Changes: motion/react → framer-motion · ../../utils/cn → @/lib/utils
            Deployment missions wired to /api/field/shifts
   ───────────────────────────────────────────────────────────────────── */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Crosshair, Users, Target, ShieldAlert, MapPin, Navigation,
  ChevronLeft, CheckCircle, Home, X, Zap, BookOpen, GitMerge,
  Smartphone, Camera, Send, Flag, Fence, Building2, Frame, Trees, Square,
  ChevronRight, ArrowLeft, UserX, FileText, StickyNote,
  QrCode, MessageSquare, Layers, TriangleAlert, Phone, Mail,
  Sun, Moon, ThumbsUp, ThumbsDown, HelpCircle,
  Shield, Plus, Trash2, Settings, Database, Cpu, Globe, Wifi,
  SquareCheck, ToggleLeft, ToggleRight, List, Lock, LockOpen, TrendingUp,
  Bell, BellRing, Share2, Info, BookMarked, Star, Rocket, Eye,
  CircleArrowRight, Check,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  TC, DARK, LIGHT, partyColor, PARTY_COLOR,
  Person, Stop, PersonStatus, CampaignField, WizardStep, getStepFlow,
  SIGN_TYPES, LIT_PIECES, NOT_PRESENT_OPTS, CONTACT_OUTCOMES, DOOR_OUTCOMES,
  TURF_SIDES, INITIAL_TEAM, MISSIONS, AREA_DATA, RADAR_DATA, ALL_STOPS,
  DEFAULT_CAMPAIGN_FIELDS, SignType,
} from "./sc-data";

/* ─── MISSION TYPE ───────────────────────────────────────────────────── */
type Mission = {
  id: string;
  type: "canvass" | "lit-drop";
  name: string;
  reward: string;
  doors: number;
  priority: string;
  routing: string;
  start: number;
  end: number;
};

/* ─── SLIDE VARIANTS ─────────────────────────────────────────────────── */
const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 320, damping: 32 } },
  exit: (dir: number) => ({ x: dir > 0 ? "-40%" : "40%", opacity: 0, transition: { duration: 0.18 } }),
};

/* ─── AREA HISTORY (seeded — in prod from DB) ────────────────────────── */
const AREA_LIT_HISTORY: Record<string, { piece: string; date: string; volunteer: string }> = {
  "Bloor St E": { piece: "Intro Mailer", date: "Apr 8", volunteer: "S. Bouchard" },
  "Bloor St W": { piece: "Economy Door Hanger", date: "Apr 9", volunteer: "K. Nguyen" },
  "King St W": { piece: "Healthcare Door Hanger", date: "Apr 10", volunteer: "A. Diallo" },
  "Danforth Ave": { piece: "GOTV Card", date: "Apr 11", volunteer: "You" },
  "Spadina Ave": { piece: "Palm Card", date: "Apr 7", volunteer: "S. Bouchard" },
};

const INFO_TOPICS = [
  { id: "housing", label: "Housing Affordability", icon: "🏠", color: "#2979FF" },
  { id: "healthcare", label: "Healthcare", icon: "🏥", color: "#FF3B30" },
  { id: "cost-of-living", label: "Cost of Living", icon: "💸", color: "#FF9F0A" },
  { id: "transit", label: "Transit & Infra", icon: "🚌", color: "#00C853" },
  { id: "climate", label: "Climate", icon: "🌱", color: "#3D9B35" },
  { id: "safety", label: "Public Safety", icon: "🛡️", color: "#9C27B0" },
  { id: "seniors", label: "Seniors & Care", icon: "👴", color: "#FF6B35" },
  { id: "childcare", label: "Childcare", icon: "👶", color: "#00E5FF" },
  { id: "jobs", label: "Jobs & Economy", icon: "💼", color: "#FFD600" },
  { id: "immigration", label: "Immigration", icon: "🌍", color: "#E91E63" },
];

/* ─── STEP INDICATOR ─────────────────────────────────────────────────── */
function StepDots({ steps, current, T }: { steps: WizardStep[]; current: WizardStep; T: TC }) {
  const labels: Record<WizardStep, string> = {
    door: "Door", household: "Voters", questions: "Survey", extras: "Actions", summary: "Wrap",
  };
  return (
    <div className="flex items-center justify-center gap-1.5 py-2 flex-shrink-0">
      {steps.map((s, i) => {
        const idx = steps.indexOf(current);
        const done = i < idx;
        const active = s === current;
        return (
          <React.Fragment key={s}>
            {i > 0 && (
              <div className="h-px w-5 rounded-full transition-all duration-300"
                style={{ backgroundColor: done ? T.accent : T.border }} />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <motion.div layout className="rounded-full flex items-center justify-center"
                animate={{ width: active ? 26 : 18, height: active ? 26 : 18 }}
                style={{
                  backgroundColor: active ? T.accent : done ? `${T.accent}40` : T.border,
                  boxShadow: active ? `0 0 10px ${T.accent}60` : undefined,
                }}>
                {done
                  ? <CheckCircle size={10} style={{ color: T.accent }} />
                  : <span style={{ fontSize: 8, fontWeight: 900, color: active ? "#050A1F" : T.muted }}>{i + 1}</span>}
              </motion.div>
              {active && (
                <motion.span initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: 7, fontWeight: 900, color: T.accent, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {labels[s]}
                </motion.span>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── THEME TOGGLE ────────────────────────────────────────────────────── */
function ThemeToggle({ isDark, setIsDark, T, size = "md" }: {
  isDark: boolean; setIsDark: (v: boolean) => void; T: TC; size?: "sm" | "md";
}) {
  const s = size === "sm" ? 12 : 14;
  const dim = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsDark(!isDark)}
      className={cn(dim, "rounded-full flex items-center justify-center transition-all flex-shrink-0")}
      style={{ backgroundColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)", border: `1px solid ${T.border}` }}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
      <AnimatePresence mode="wait">
        {isDark
          ? <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
            <Sun size={s} style={{ color: "#FFD600" }} />
          </motion.div>
          : <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
            <Moon size={s} style={{ color: T.accentB }} />
          </motion.div>}
      </AnimatePresence>
    </motion.button>
  );
}

/* ─── QR CODE (SVG stub) ─────────────────────────────────────────────── */
function QRDisplay({ url, T }: { url: string; T: TC }) {
  const cells = Array.from({ length: 81 }).map((_, i) => {
    const r = Math.floor(i / 9), c = i % 9;
    const corner = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
    const rand = ((i * 137 + 31) % 7) > 3;
    return corner || rand;
  });
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="p-3 rounded-xl" style={{ backgroundColor: "#fff" }}>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(9,10px)" }}>
          {cells.map((on, i) => (
            <div key={i} style={{ width: 10, height: 10, backgroundColor: on ? "#050A1F" : "#fff", borderRadius: 1 }} />
          ))}
        </div>
      </div>
      <div className="text-[8px] font-bold text-center px-2 break-all" style={{ color: T.muted }}>{url}</div>
    </div>
  );
}

/* ─── SHARE DRAWER ───────────────────────────────────────────────────── */
function ShareDrawer({ item, address, onClose, T, isDark }: {
  item: { label: string; color: string } | null;
  address: string; onClose: () => void; T: TC; isDark: boolean;
}) {
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [showQR, setShowQR] = useState(false);
  const url = `https://pollcity.social/info/${encodeURIComponent(item?.label ?? "")}`;
  const msg = `📣 ${address} — campaign literature available: "${item?.label}". Download Poll City Social for more: ${url}`;

  const send = (channel: string) => {
    setSent(p => ({ ...p, [channel]: true }));
    if (channel === "qr") setShowQR(true);
  };

  const channels = [
    { id: "social", icon: Smartphone, label: "Poll City Social", sub: "Push to voter feed", color: "#00E5FF" },
    { id: "sms", icon: MessageSquare, label: "Send SMS", sub: "647-XXX-XXXX", color: "#00C853" },
    { id: "email", icon: Mail, label: "Send Email", sub: "From voter file", color: "#2979FF" },
    { id: "qr", icon: QrCode, label: "Show QR Code", sub: "Voter scans on-screen", color: "#FF9F0A" },
  ];

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 340, damping: 34 }}
      className="absolute inset-x-0 bottom-0 rounded-t-3xl z-50 pb-8"
      style={{ backgroundColor: isDark ? "#0F1440" : "#fff", border: `1.5px solid ${T.borderB}`, boxShadow: "0 -8px 40px rgba(0,0,0,0.4)" }}>
      <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{ backgroundColor: T.border }} />
      <div className="px-5">
        <div className="flex items-start gap-2 mb-4">
          <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: item?.color ?? T.accent }} />
          <div>
            <div className="font-black text-sm" style={{ color: T.text }}>{item?.label ?? "Send Info"}</div>
            <div className="text-[9px]" style={{ color: T.muted }}>Send to voter at {address}</div>
          </div>
          <button onClick={onClose} className="ml-auto p-1" style={{ color: T.muted }}><X size={16} /></button>
        </div>
        <AnimatePresence mode="wait">
          {showQR ? (
            <motion.div key="qr" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-2">
              <QRDisplay url={url} T={T} />
              <button onClick={() => setShowQR(false)} className="mt-3 text-[9px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: T.muted }}>
                <ArrowLeft size={11} /> Back to Share
              </button>
            </motion.div>
          ) : (
            <motion.div key="ch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {channels.map(ch => {
                const done = sent[ch.id];
                const I = ch.icon;
                return (
                  <motion.button key={ch.id} whileTap={{ scale: 0.97 }} onClick={() => send(ch.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{ backgroundColor: done ? `${ch.color}18` : isDark ? "rgba(255,255,255,0.04)" : T.deep, border: `1.5px solid ${done ? ch.color : T.border}` }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${ch.color}18`, border: `1px solid ${ch.color}35` }}>
                      <I size={16} style={{ color: ch.color }} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-[10px] font-black" style={{ color: done ? ch.color : T.text }}>{ch.label}</div>
                      <div className="text-[8px]" style={{ color: T.muted }}>{ch.sub}</div>
                    </div>
                    {done
                      ? <Check size={14} style={{ color: ch.color }} />
                      : <ChevronRight size={14} style={{ color: T.muted }} />}
                  </motion.button>
                );
              })}
              <div className="px-3 py-2 rounded-lg mt-1" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : T.deep }}>
                <div className="text-[8px] font-bold" style={{ color: T.muted }}>Preview message:</div>
                <div className="text-[8px] mt-0.5 leading-relaxed" style={{ color: T.sub }}>{msg}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── LIT + INTERESTS PANEL ─────────────────────────────────────────── */
function LitAndInterestsPanel({
  stops, stopIdx, selectedLit, setSelectedLit,
  infoTopics, setInfoTopics, shareTarget, setShareTarget,
  T, isDark, currentStop,
}: {
  stops: Stop[]; stopIdx: number;
  selectedLit: string | null; setSelectedLit: (v: string | null) => void;
  infoTopics: string[]; setInfoTopics: (v: string[]) => void;
  shareTarget: { label: string; color: string } | null;
  setShareTarget: (v: { label: string; color: string } | null) => void;
  T: TC; isDark: boolean; currentStop: Stop | null;
}) {
  const streetKey = currentStop?.address.replace(/\d+\s/, "") ?? "";
  const areaHistory = AREA_LIT_HISTORY[streetKey];
  const [tab, setTab] = useState<"lit" | "interests">("lit");

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      {areaHistory && (
        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: T.border, backgroundColor: isDark ? "rgba(255,214,0,0.05)" : "rgba(255,214,0,0.04)" }}>
          <BookMarked size={11} style={{ color: "#FFD600", flexShrink: 0 }} />
          <div className="text-[8px] leading-tight flex-1" style={{ color: T.sub }}>
            <span className="font-black" style={{ color: "#FFD600" }}>This street:</span> {areaHistory.piece} dropped {areaHistory.date} by {areaHistory.volunteer}
          </div>
          <Info size={9} style={{ color: T.muted }} />
        </div>
      )}

      <div className="flex border-b" style={{ borderColor: T.border }}>
        {[
          { id: "lit", label: "Lit Piece Left", icon: FileText },
          { id: "interests", label: "Voter Interests", icon: Star },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as "lit" | "interests")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[8px] font-black uppercase tracking-widest transition-all"
            style={{ color: tab === t.id ? T.accent : T.muted, borderBottom: `2px solid ${tab === t.id ? T.accent : "transparent"}`, backgroundColor: "transparent" }}>
            <t.icon size={9} />{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "lit" ? (
          <motion.div key="lit" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="p-3 space-y-2">
            <div className="text-[8px]" style={{ color: T.muted }}>Select piece left, then send info instantly via any channel.</div>
            <div className="grid grid-cols-2 gap-2">
              {LIT_PIECES.map(lp => {
                const sel = selectedLit === lp.id;
                return (
                  <div key={lp.id} className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${sel ? lp.color : T.border}`, backgroundColor: sel ? `${lp.color}12` : T.input }}>
                    <button onClick={() => setSelectedLit(sel ? null : lp.id)}
                      className="w-full flex items-center gap-2 p-2.5 text-left transition-all active:scale-95">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: lp.color }} />
                      <span className="text-[9px] font-black leading-tight flex-1" style={{ color: sel ? lp.color : T.sub }}>{lp.label}</span>
                      {sel && <Check size={10} style={{ color: lp.color }} />}
                    </button>
                    {sel && (
                      <motion.button initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        onClick={() => setShareTarget({ label: lp.label, color: lp.color })}
                        className="w-full flex items-center justify-center gap-1.5 px-2 py-2 border-t text-[8px] font-black uppercase tracking-widest transition-all"
                        style={{ borderColor: lp.color, color: lp.color, backgroundColor: `${lp.color}08` }}>
                        <Share2 size={9} /> Send Info Now
                      </motion.button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div key="int" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="p-3 space-y-2">
            <div className="text-[8px]" style={{ color: T.muted }}>What topics did the voter want more information on? These enrich the voter file and trigger targeted follow-up.</div>
            <div className="grid grid-cols-2 gap-1.5">
              {INFO_TOPICS.map(t => {
                const sel = infoTopics.includes(t.id);
                return (
                  <button key={t.id} onClick={() => setInfoTopics(sel ? infoTopics.filter(x => x !== t.id) : [...infoTopics, t.id])}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all active:scale-95"
                    style={{ backgroundColor: sel ? `${t.color}18` : T.input, border: `1.5px solid ${sel ? t.color : T.border}` }}>
                    <span style={{ fontSize: 12 }}>{t.icon}</span>
                    <span className="text-[8px] font-black leading-tight flex-1" style={{ color: sel ? t.color : T.sub }}>{t.label}</span>
                    {sel && <Check size={9} style={{ color: t.color }} />}
                  </button>
                );
              })}
            </div>
            {infoTopics.length > 0 && (
              <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setShareTarget({ label: `Info on: ${infoTopics.map(id => INFO_TOPICS.find(t => t.id === id)?.label).join(", ")}`, color: "#00E5FF" })}
                className="w-full py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: isDark ? "rgba(0,229,255,0.12)" : "rgba(0,229,255,0.08)", border: `1px solid ${T.borderB}`, color: T.accent }}>
                <Share2 size={11} /> Send Selected Topics to Voter
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── CANDIDATE BELL ─────────────────────────────────────────────────── */
function CandidateBell({ candidateOnStreet, notifSent, onSend, address, T, isDark }: {
  candidateOnStreet: boolean; notifSent: boolean;
  onSend: () => void; address: string; T: TC; isDark: boolean;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{
      backgroundColor: T.card,
      border: `1.5px solid ${candidateOnStreet ? (notifSent ? "rgba(0,200,83,0.5)" : "rgba(255,159,10,0.5)") : T.border}`,
      opacity: candidateOnStreet ? 1 : 0.65,
    }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative"
          style={{ backgroundColor: candidateOnStreet ? (notifSent ? "rgba(0,200,83,0.15)" : "rgba(255,159,10,0.15)") : isDark ? "rgba(255,255,255,0.05)" : T.deep }}>
          {notifSent
            ? <BellRing size={18} style={{ color: "#00C853" }} />
            : <Bell size={18} style={{ color: candidateOnStreet ? "#FF9F0A" : T.muted }} />}
          {candidateOnStreet && !notifSent && (
            <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: "#FF9F0A" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black flex items-center gap-1.5" style={{ color: candidateOnStreet ? T.text : T.muted }}>
            {candidateOnStreet ? "🟢 Candidate On Street" : "🔒 Candidate Not On Field"}
          </div>
          <div className="text-[8px]" style={{ color: T.muted }}>
            {notifSent ? `Candidate notified — heading to ${address}` : candidateOnStreet ? "Voter wants to meet — ping candidate now" : "Unlocks when candidate checks in to field"}
          </div>
        </div>
        {candidateOnStreet && !notifSent && (
          <motion.button whileTap={{ scale: 0.92 }} onClick={onSend}
            className="px-3 py-2 rounded-xl font-black uppercase tracking-widest text-[9px] flex-shrink-0 transition-all"
            style={{ backgroundColor: "#FF9F0A", color: "#050A1F", boxShadow: isDark ? "0 0 14px rgba(255,159,10,0.45)" : undefined }}>
            Ping!
          </motion.button>
        )}
        {notifSent && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0" style={{ backgroundColor: "rgba(0,200,83,0.12)", border: "1px solid rgba(0,200,83,0.4)" }}>
            <Check size={10} style={{ color: "#00C853" }} />
            <span className="text-[8px] font-black" style={{ color: "#00C853" }}>Sent</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── VOTER NP OPTIONS ──────────────────────────────────────────────── */
const VOTER_NP_OPTS = [
  { id: "not-home",  label: "Not Home",         icon: "🚪", color: "#6B72A0", hint: "Lives here, wasn't available" },
  { id: "moved",     label: "Moved Away",        icon: "🚛", color: "#FF9F0A", hint: "No longer at this address" },
  { id: "deceased",  label: "Deceased",          icon: "🕊️", color: "#9C27B0", hint: "Flag for voter file cleanup" },
  { id: "hostile",   label: "Hostile / Refused", icon: "⛔", color: "#FF3B30", hint: "Refused engagement" },
  { id: "wrong",     label: "Wrong File",        icon: "❓", color: "#FFD600",  hint: "Person not known here" },
  { id: "minor",     label: "Under 18",          icon: "🧒", color: "#00C853",  hint: "Not eligible — remove" },
];

/* ─── PERSON CARD ─────────────────────────────────────────────────────── */
function PersonCard({ person, status, isActive, onActivate, onMarkDone,
  onContact, onNotPresent, fields, onField, isDark, T, positionLabel }: {
  person: Person; status: PersonStatus;
  isActive: boolean; onActivate: () => void; onMarkDone: () => void;
  onContact: (id: number, v: string | null) => void;
  onNotPresent: (id: number, v: string | null) => void;
  fields: CampaignField[];
  onField: (pid: number, fid: string, val: PersonStatus["fieldValues"][string]) => void;
  isDark: boolean; T: TC; positionLabel?: string;
}) {
  const pc = partyColor(person.party);
  const outcome = CONTACT_OUTCOMES.find(o => o.id === status.contact);
  const npOpt = VOTER_NP_OPTS.find(o => o.id === status.notPresent);
  const isMarked = !!status.contact || !!status.notPresent;
  const [showNP, setShowNP] = useState(false);
  const personFields = fields.filter(f => f.active && f.scope === "person");
  const badgeColor = outcome?.color ?? npOpt?.color ?? T.muted;
  const badgeLabel = outcome?.label ?? npOpt?.label;

  if (!isActive) {
    return (
      <motion.button layout onClick={onActivate}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all"
        style={{
          backgroundColor: isMarked ? `${badgeColor}0C` : isDark ? "rgba(41,121,255,0.04)" : T.card,
          border: `1.5px solid ${isMarked ? `${badgeColor}40` : T.border}`,
          opacity: isMarked ? 1 : 0.8,
        }}>
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black text-white"
            style={{ backgroundColor: pc, boxShadow: isMarked && isDark ? `0 0 8px ${badgeColor}40` : undefined }}>
            {person.firstName.charAt(0)}{person.lastName.charAt(0)}
          </div>
          {isMarked && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: badgeColor, border: `2px solid ${T.bg}` }}>
              <Check size={7} color="#050A1F" />
            </motion.div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-[11px] truncate" style={{ color: T.text }}>
            {person.firstName} {person.lastName}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <span className="text-[7px] font-black px-1.5 py-0.5 rounded" style={{ backgroundColor: `${pc}20`, color: pc }}>{person.party}</span>
            <span className="text-[8px]" style={{ color: T.muted }}>Age {person.age}</span>
            {!person.isRegistered && <span className="text-[8px] font-black" style={{ color: "#FF9F0A" }}>⚠ Unreg</span>}
          </div>
        </div>
        {isMarked ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[8px] font-black px-2 py-1 rounded-lg"
              style={{ backgroundColor: `${badgeColor}20`, color: badgeColor, border: `1px solid ${badgeColor}40` }}>
              {npOpt?.icon} {badgeLabel}
            </span>
            <ChevronRight size={11} style={{ color: T.muted }} />
          </div>
        ) : (
          <span className="flex items-center gap-1 text-[9px] font-black flex-shrink-0" style={{ color: T.accent }}>
            {positionLabel && <span className="text-[7px] font-black uppercase mr-0.5" style={{ color: T.muted }}>{positionLabel}</span>}
            Record <ChevronRight size={12} />
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <motion.div layout className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: T.card,
        border: `2px solid ${isMarked ? `${badgeColor}55` : T.borderB}`,
        boxShadow: isDark ? `0 0 24px ${isMarked ? `${badgeColor}18` : `${T.accentB}14`}` : undefined,
      }}>

      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center font-black text-white"
          style={{ backgroundColor: pc, boxShadow: isDark ? `0 0 14px ${pc}40` : undefined }}>
          {person.firstName.charAt(0)}{person.lastName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black truncate" style={{ color: T.text }}>{person.firstName} {person.lastName}</div>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-[7px] font-black px-1.5 py-0.5 rounded" style={{ backgroundColor: `${pc}20`, color: pc }}>{person.party}</span>
            <span className="text-[8px]" style={{ color: T.muted }}>Age {person.age}</span>
            {person.phone && <span className="text-[8px]" style={{ color: T.muted }}>{person.phone}</span>}
          </div>
        </div>
        <button onClick={onMarkDone}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : T.deep, border: `1px solid ${T.border}`, color: T.muted }}>
          <X size={12} />
        </button>
      </div>

      {!person.isRegistered && (
        <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: "rgba(255,159,10,0.08)", border: "1px solid rgba(255,159,10,0.3)" }}>
          <TriangleAlert size={11} style={{ color: "#FF9F0A", flexShrink: 0 }} />
          <span className="text-[8px] font-bold leading-snug" style={{ color: "#FF9F0A" }}>
            Not registered — flag for GOTV list · elections.ca/register
          </span>
        </div>
      )}

      <div className="px-4 pb-4">
        <div className="text-[9px] font-black uppercase tracking-widest mb-2.5" style={{ color: T.muted }}>
          {person.firstName}&apos;s stance at the door?
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CONTACT_OUTCOMES.map(o => {
            const sel = status.contact === o.id;
            const METER: Record<string, string> = { support: "━━━━━", undecided: "━━━╌╌", "soft-no": "━━╌╌╌", oppose: "━╌╌╌╌" };
            return (
              <motion.button key={o.id} whileTap={{ scale: 0.93 }}
                onClick={() => {
                  const next = sel ? null : o.id;
                  onContact(person.id, next);
                  if (next && status.notPresent) onNotPresent(person.id, null);
                }}
                className="relative py-4 px-3 rounded-xl text-left transition-all border-2"
                style={{
                  backgroundColor: sel ? `${o.color}1E` : isDark ? "rgba(41,121,255,0.05)" : T.input,
                  borderColor: sel ? o.color : T.border,
                  boxShadow: sel && isDark ? `0 0 16px ${o.color}35` : undefined,
                }}>
                {sel && (
                  <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
                    className="absolute top-2 right-2">
                    <CheckCircle size={13} style={{ color: o.color }} />
                  </motion.div>
                )}
                <div className="w-2.5 h-2.5 rounded-full mb-2"
                  style={{ backgroundColor: o.color, boxShadow: isDark ? `0 0 6px ${o.color}` : undefined }} />
                <div className="font-black text-sm" style={{ color: sel ? o.color : T.text }}>{o.label}</div>
                <div className="text-[7px] mt-0.5 tracking-[0.06em]" style={{ color: sel ? `${o.color}80` : T.muted }}>
                  {METER[o.id]}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="border-t" style={{ borderColor: T.border }}>
        <button onClick={() => setShowNP(p => !p)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all"
          style={{
            color: status.notPresent || showNP ? "#FF9F0A" : T.muted,
            backgroundColor: status.notPresent || showNP ? "rgba(255,159,10,0.05)" : "transparent",
          }}>
          <UserX size={10} style={{ flexShrink: 0 }} />
          {status.notPresent
            ? <><span>{npOpt?.icon} {npOpt?.label}</span><span className="text-[7px] ml-1 font-normal normal-case" style={{ color: T.muted }}>{npOpt?.hint}</span></>
            : "Not at Door / Special Case"}
          <ChevronRight size={10} className={cn("ml-auto transition-transform duration-200", showNP && "rotate-90")} />
        </button>
        <AnimatePresence>
          {showNP && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="px-4 pb-3 pt-1">
                <div className="text-[7px] font-black uppercase tracking-widest mb-2" style={{ color: T.muted }}>
                  Clears contact outcome · flags voter file
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {VOTER_NP_OPTS.map(np => {
                    const sel = status.notPresent === np.id;
                    return (
                      <motion.button key={np.id} whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          onNotPresent(person.id, sel ? null : np.id);
                          if (!sel && status.contact) onContact(person.id, null);
                          if (!sel) setShowNP(false);
                        }}
                        className="flex items-start gap-1.5 px-2.5 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          backgroundColor: sel ? `${np.color}18` : T.input,
                          border: `1.5px solid ${sel ? np.color : T.border}`,
                          color: sel ? np.color : T.muted,
                        }}>
                        <span className="text-base leading-none mt-0.5 flex-shrink-0">{np.icon}</span>
                        <div>
                          <div className="text-[8px] font-black">{np.label}</div>
                          <div className="text-[7px] font-normal normal-case mt-0.5" style={{ color: sel ? `${np.color}90` : T.muted }}>
                            {np.hint}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isMarked && personFields.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t px-4 pb-4 pt-3 space-y-2" style={{ borderColor: T.border }}>
              <div className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: T.muted }}>
                <Database size={9} /> Survey fields for {person.firstName}
              </div>
              {personFields.map(f => (
                <FieldRenderer key={f.id} field={f} value={status.fieldValues?.[f.id]}
                  onChange={v => onField(person.id, f.id, v)} T={T} isDark={isDark} compact />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMarked && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="px-4 pb-4">
            <motion.button whileTap={{ scale: 0.97 }} onClick={onMarkDone}
              className="w-full py-3 rounded-xl font-black uppercase tracking-[0.12em] text-[10px] flex items-center justify-center gap-2 transition-all"
              style={{
                background: `linear-gradient(135deg, ${badgeColor}30, ${badgeColor}10)`,
                border: `1.5px solid ${badgeColor}50`,
                color: badgeColor,
                boxShadow: isDark ? `0 0 12px ${badgeColor}20` : undefined,
              }}>
              <CheckCircle size={13} />
              {person.firstName} Recorded · Next Voter
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── FIELD RENDERER ─────────────────────────────────────────────────── */
function FieldRenderer({ field, value, onChange, T, isDark, compact = false }: {
  field: CampaignField; value: PersonStatus["fieldValues"][string] | undefined;
  onChange: (v: PersonStatus["fieldValues"][string]) => void;
  T: TC; isDark: boolean; compact?: boolean;
}) {
  const rowCls = compact ? "text-[9px]" : "text-[10px]";
  if (field.type === "boolean") {
    const v = value as boolean | undefined;
    return (
      <div className={cn("flex items-center justify-between", compact ? "py-0.5" : "py-1.5 px-1")}>
        <span className={cn(rowCls, "font-bold")} style={{ color: T.sub }}>{field.icon} {field.label}</span>
        <div className="flex gap-1">
          {["Yes", "No"].map(opt => {
            const sel = opt === "Yes" ? v === true : v === false;
            return (
              <button key={opt} onClick={() => onChange(opt === "Yes")}
                className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-90 border"
                style={{ backgroundColor: sel ? (opt === "Yes" ? "rgba(0,200,83,0.2)" : "rgba(255,59,48,0.2)") : T.input, borderColor: sel ? (opt === "Yes" ? "#00C853" : "#FF3B30") : T.border, color: sel ? (opt === "Yes" ? "#00C853" : "#FF3B30") : T.muted }}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (field.type === "scale") {
    const v = (value as number) ?? 0;
    return (
      <div className={compact ? "py-0.5" : "py-1"}>
        <div className="flex items-center justify-between mb-1">
          <span className={cn(rowCls, "font-bold")} style={{ color: T.sub }}>{field.icon} {field.label}</span>
          {v > 0 && <span className="text-[9px] font-black px-2 py-0.5 rounded" style={{ backgroundColor: `${T.accent}20`, color: T.accent }}>{v}/5</span>}
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => onChange(n)}
              className="flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all active:scale-90 border"
              style={{ backgroundColor: n <= v ? `${T.accent}25` : T.input, borderColor: n <= v ? T.accent : T.border, color: n <= v ? T.accent : T.muted }}>
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (field.type === "choice" && field.options) {
    const v = value as string | undefined;
    return (
      <div className={compact ? "py-0.5" : "py-1"}>
        <div className={cn(rowCls, "font-bold mb-1")} style={{ color: T.sub }}>{field.icon} {field.label}</div>
        <div className="flex flex-wrap gap-1">
          {field.options.map(opt => {
            const sel = v === opt;
            return (
              <button key={opt} onClick={() => onChange(sel ? "" : opt)}
                className="px-2 py-1 rounded-lg text-[8px] font-black transition-all active:scale-90 border"
                style={{ backgroundColor: sel ? `${T.accentB}25` : T.input, borderColor: sel ? T.accentB : T.border, color: sel ? T.accentB : T.muted }}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (field.type === "multi" && field.options) {
    const v = (value as string[]) ?? [];
    return (
      <div className={compact ? "py-0.5" : "py-1"}>
        <div className={cn(rowCls, "font-bold mb-1")} style={{ color: T.sub }}>{field.icon} {field.label}</div>
        <div className="flex flex-wrap gap-1">
          {field.options.map(opt => {
            const sel = v.includes(opt);
            return (
              <button key={opt} onClick={() => onChange(sel ? v.filter(x => x !== opt) : [...v, opt])}
                className="px-2 py-1 rounded-lg text-[8px] font-black transition-all active:scale-90 border"
                style={{ backgroundColor: sel ? `${T.accentB}25` : T.input, borderColor: sel ? T.accentB : T.border, color: sel ? T.accentB : T.muted }}>
                {sel && "✓ "}{opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (field.type === "text") {
    return (
      <div className={compact ? "py-0.5" : "py-1"}>
        <div className={cn(rowCls, "font-bold mb-1")} style={{ color: T.sub }}>{field.icon} {field.label}</div>
        <textarea value={(value as string) ?? ""} onChange={e => onChange(e.target.value)}
          placeholder={field.hint ?? `Enter ${field.label.toLowerCase()}…`} rows={compact ? 2 : 3}
          className="w-full p-2 rounded-lg text-[10px] resize-none focus:outline-none transition-all"
          style={{ backgroundColor: T.input, border: `1px solid ${T.border}`, color: T.text }} />
      </div>
    );
  }
  return null;
}

/* ─── SIGN PICKER ─────────────────────────────────────────────────────── */
function SignPicker({ address, onConfirm, onCancel, T, isDark }: {
  address: string; onConfirm: (t: SignType, q: number, n: string) => void;
  onCancel: () => void; T: TC; isDark: boolean;
}) {
  const [sel, setSel] = useState<SignType | null>(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"pick" | "confirm">("pick");
  const cfg = SIGN_TYPES.find(t => t.id === sel);
  const iconMap: Record<SignType, React.ElementType> = {
    "small-lawn": Home, "large-lawn": Home, "corner-lot": Flag,
    "window": Frame, "fence": Fence, "balcony": Building2, "boulevard": Trees, "banner": Square,
  };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} style={{ color: T.muted }}><ArrowLeft size={16} /></button>
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#FF9F0A" }}>Sign Request — {address}</span>
      </div>
      <AnimatePresence mode="wait">
        {step === "pick" ? (
          <motion.div key="p" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {SIGN_TYPES.map(t => {
                const S = sel === t.id;
                const I = iconMap[t.id];
                return (
                  <motion.button key={t.id} whileTap={{ scale: 0.95 }} onClick={() => setSel(t.id)}
                    className="p-3 rounded-xl text-left relative"
                    style={{ backgroundColor: S ? `${t.color}18` : T.input, border: `2px solid ${S ? t.color : T.border}`, boxShadow: S && isDark ? `0 0 14px ${t.color}35` : undefined }}>
                    {S && <CheckCircle size={11} className="absolute top-2 right-2" style={{ color: t.color }} />}
                    <I size={18} className="mb-1.5" style={{ color: S ? t.color : T.muted }} />
                    <div className="text-[9px] font-black uppercase" style={{ color: S ? t.color : T.sub }}>{t.label}</div>
                    <div className="text-[8px] mt-0.5" style={{ color: T.muted }}>{t.size} · {t.desc}</div>
                  </motion.button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: T.input, border: `1px solid ${T.border}` }}>
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: T.muted }}>Qty</span>
              <div className="flex items-center gap-3 ml-auto">
                {([-1, null, 1] as (number | null)[]).map((d, i) => d === null
                  ? <span key={i} className="font-black w-6 text-center" style={{ color: T.text }}>{qty}</span>
                  : <button key={i} onClick={() => setQty(q => Math.max(1, Math.min(10, q + (d as number))))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-base transition-all active:scale-90"
                    style={{ backgroundColor: `${T.accentB}20`, border: `1px solid ${T.border}`, color: T.sub }}>{d > 0 ? "+" : "−"}</button>)}
              </div>
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Install notes…" rows={2}
              className="w-full p-3 rounded-xl text-[11px] resize-none focus:outline-none"
              style={{ backgroundColor: T.input, border: `1px solid ${T.border}`, color: T.text }} />
            <button onClick={() => { if (sel) setStep("confirm"); }} disabled={!sel}
              className="w-full py-3 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-all"
              style={{ backgroundColor: sel ? "#FF9F0A" : T.card, color: sel ? "#050A1F" : T.muted, border: `1px solid ${sel ? "#FF9F0A" : T.border}`, boxShadow: sel && isDark ? "0 0 18px rgba(255,159,10,0.35)" : undefined }}>
              Review Request →
            </button>
          </motion.div>
        ) : (
          <motion.div key="c" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-3">
            <div className="p-4 rounded-xl" style={{ backgroundColor: `${cfg!.color}10`, border: `1.5px solid ${cfg!.color}40` }}>
              <div className="font-black text-sm mb-1" style={{ color: T.text }}>{cfg!.label} × {qty}</div>
              <div className="text-[9px]" style={{ color: T.muted }}>{cfg!.size} · {cfg!.desc}</div>
              {note && <div className="text-[9px] italic mt-2" style={{ color: T.sub }}>&ldquo;{note}&rdquo;</div>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep("pick")} className="flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, color: T.sub }}>Edit</button>
              <button onClick={() => onConfirm(sel!, qty, note)} className="flex-[2] py-3 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all" style={{ backgroundColor: "#FF9F0A", color: "#050A1F", boxShadow: isDark ? "0 0 18px rgba(255,159,10,0.4)" : undefined }}>
                <SquareCheck size={13} /> Log Request
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── LIT DROP FAST-COMMIT ───────────────────────────────────────────── */
function LitDropMode({ stops, missionName, onCommitBatch, onCommitStop, onExit, T, isDark, teamData }: {
  stops: Stop[]; missionName: string;
  onCommitBatch: (mode: "side" | "street" | "all", piece: string) => void;
  onCommitStop: (id: number, piece: string) => void;
  onExit: () => void;
  T: TC; isDark: boolean;
  teamData: typeof INITIAL_TEAM;
}) {
  const [piece, setPiece] = useState<string | null>(null);
  const [mode, setMode] = useState<"pick-piece" | "select-scope">("pick-piece");
  const [committed, setCommitted] = useState<Set<number>>(new Set());
  const pending = stops.filter(s => !committed.has(s.id));
  const done = stops.filter(s => committed.has(s.id));

  const commit = (scope: "side" | "street" | "all") => {
    if (!piece) return;
    const ids = pending.slice(0, scope === "side" ? Math.ceil(pending.length / 2) : scope === "street" ? Math.ceil(pending.length * 0.7) : pending.length).map(s => s.id);
    setCommitted(prev => new Set(Array.from(prev).concat(ids)));
    if (committed.size + ids.length >= stops.length) onCommitBatch(scope, piece);
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: T.bg }}>
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 flex-shrink-0">
        <button onClick={onExit} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, color: T.sub }}>
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1">
          <div className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: "#FFD600" }}>
            <Rocket size={9} /> Lit Drop — Fast Mode
          </div>
          <div className="text-[11px] font-black leading-tight" style={{ color: T.text }}>{missionName}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black" style={{ color: T.accent }}>{done.length}/{stops.length}</div>
          <div className="text-[7px] font-black uppercase" style={{ color: T.muted }}>Doors</div>
        </div>
      </div>

      <div className="mx-5 mb-4 h-2 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: T.card }}>
        <motion.div className="h-full rounded-full" animate={{ width: `${(done.length / stops.length) * 100}%` }}
          style={{ backgroundColor: T.accent }} transition={{ type: "spring", stiffness: 200 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-4">
        <AnimatePresence mode="wait">
          {mode === "pick-piece" ? (
            <motion.div key="p" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: T.muted }}>
                1. Select piece to drop at all doors
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LIT_PIECES.map(lp => {
                  const sel = piece === lp.id;
                  return (
                    <motion.button key={lp.id} whileTap={{ scale: 0.95 }} onClick={() => setPiece(sel ? null : lp.id)}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{ backgroundColor: sel ? `${lp.color}18` : T.card, border: `2px solid ${sel ? lp.color : T.border}`, boxShadow: sel && isDark ? `0 0 12px ${lp.color}30` : undefined }}>
                      <div className="w-2 h-2 rounded-full mb-2" style={{ backgroundColor: lp.color }} />
                      <div className="text-[9px] font-black" style={{ color: sel ? lp.color : T.sub }}>{lp.label}</div>
                      {sel && <div className="text-[7px] mt-0.5 font-bold" style={{ color: lp.color }}>Selected ✓</div>}
                    </motion.button>
                  );
                })}
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (piece) setMode("select-scope"); }} disabled={!piece}
                className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: piece ? T.accent : T.border, color: piece ? "#050A1F" : T.muted, boxShadow: piece && isDark ? `0 0 22px ${T.accent}50` : undefined }}>
                Choose Drop Scope <ChevronRight size={16} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="s" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: T.muted }}>
                2. Commit drop scope — {LIT_PIECES.find(l => l.id === piece)?.label}
              </div>
              {[
                { id: "side" as const, label: "Commit This Side", sub: `~${Math.ceil(pending.length / 2)} doors (odd or even)`, color: "#2979FF", icon: Layers },
                { id: "street" as const, label: "Commit Entire Street", sub: `${Math.ceil(pending.length * 0.7)} doors on this block`, color: "#FF9F0A", icon: MapPin },
                { id: "all" as const, label: "Complete This Mission", sub: `All ${pending.length} remaining doors`, color: "#00C853", icon: CheckCircle },
              ].map(scope => {
                const I = scope.icon;
                return (
                  <motion.button key={scope.id} whileTap={{ scale: 0.97 }} onClick={() => commit(scope.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left"
                    style={{ backgroundColor: `${scope.color}12`, border: `2px solid ${scope.color}45`, boxShadow: isDark ? `0 0 16px ${scope.color}20` : undefined }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${scope.color}20` }}>
                      <I size={22} style={{ color: scope.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-black" style={{ color: scope.color }}>{scope.label}</div>
                      <div className="text-[9px]" style={{ color: T.muted }}>{scope.sub}</div>
                    </div>
                    <CircleArrowRight size={20} style={{ color: `${scope.color}80` }} />
                  </motion.button>
                );
              })}

              <div className="rounded-xl p-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="text-[8px] font-black uppercase tracking-widest mb-2" style={{ color: T.muted }}>Team Coordination</div>
                <div className="flex gap-2 flex-wrap">
                  {teamData.map(m => (
                    <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: `${m.color}15`, border: `1px solid ${m.color}30` }}>
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-black text-white" style={{ backgroundColor: m.color }}>{m.initials}</div>
                      <span className="text-[8px] font-bold" style={{ color: m.color }}>{m.name.split(" ")[0]}</span>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.status === "active" ? "#00E676" : "#6B72A0" }} />
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => setMode("pick-piece")} className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: T.muted }}>
                <ArrowLeft size={11} /> Change Piece
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {done.length > 0 && (
          <div className="space-y-2">
            <div className="text-[8px] font-black uppercase tracking-widest" style={{ color: "#00C853" }}>✓ Completed — {done.length} doors</div>
            {done.slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(0,200,83,0.06)", border: "1px solid rgba(0,200,83,0.2)" }}>
                <CheckCircle size={12} style={{ color: "#00C853" }} />
                <span className="text-[9px] font-bold flex-1" style={{ color: T.sub }}>{s.address}{s.unit ? ` · ${s.unit}` : ""}</span>
                <span className="text-[8px]" style={{ color: "#00C853" }}>{LIT_PIECES.find(l => l.id === piece)?.label}</span>
              </div>
            ))}
            {done.length > 5 && <div className="text-[8px] text-center" style={{ color: T.muted }}>+{done.length - 5} more</div>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── COMMAND CENTER ─────────────────────────────────────────────────── */
function CommandCenter({ T, isDark, setIsDark, campaignFields, setCampaignFields, candidateOnStreet, setCandidateOnStreet }: {
  T: TC; isDark: boolean; setIsDark: (v: boolean) => void;
  campaignFields: CampaignField[];
  setCampaignFields: React.Dispatch<React.SetStateAction<CampaignField[]>>;
  candidateOnStreet: boolean; setCandidateOnStreet: (v: boolean) => void;
}) {
  const [tab, setTab] = useState<"overview" | "team" | "builder" | "platform">("overview");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<CampaignField["type"]>("boolean");
  const [newFieldScope, setNewFieldScope] = useState<"household" | "person">("household");
  const [newFieldOpts, setNewFieldOpts] = useState("");
  const totalVoters = ALL_STOPS.reduce((a, s) => a + s.household.length, 0);

  const addField = () => {
    if (!newFieldLabel.trim()) return;
    const nf: CampaignField = {
      id: `custom_${Date.now()}`, label: newFieldLabel.trim(), type: newFieldType,
      scope: newFieldScope, category: "canvass", active: true, required: false,
      options: newFieldOpts ? newFieldOpts.split(",").map(s => s.trim()).filter(Boolean) : undefined,
      icon: "📋",
    };
    setCampaignFields(prev => [...prev, nf]);
    setNewFieldLabel(""); setNewFieldOpts("");
  };

  const tabBtns = [
    { id: "overview", label: "Stats", icon: TrendingUp },
    { id: "team", label: "Team", icon: Users },
    { id: "builder", label: "Builder", icon: Settings },
    { id: "platform", label: "Platform", icon: Cpu },
  ] as const;

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: T.bg }}>
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database size={20} style={{ color: T.accent }} />
            <div>
              <h1 className="font-black uppercase tracking-tighter leading-none" style={{ color: T.text }}>War Room</h1>
              <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: T.muted }}>Campaign Command · Apr 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle isDark={isDark} setIsDark={setIsDark} T={T} />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.4)" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#00E676" }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#00E676" }}>Live</span>
            </div>
          </div>
        </div>

        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setCandidateOnStreet(!candidateOnStreet)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-3 transition-all"
          style={{ backgroundColor: candidateOnStreet ? "rgba(255,159,10,0.12)" : isDark ? "rgba(255,255,255,0.04)" : T.deep, border: `1.5px solid ${candidateOnStreet ? "rgba(255,159,10,0.5)" : T.border}`, boxShadow: candidateOnStreet && isDark ? "0 0 20px rgba(255,159,10,0.2)" : undefined }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: candidateOnStreet ? "rgba(255,159,10,0.2)" : isDark ? "rgba(255,255,255,0.06)" : T.deep }}>
            {candidateOnStreet
              ? <motion.div animate={{ rotate: [0, -10, 10, -5, 0] }} transition={{ duration: 0.5 }}><BellRing size={18} style={{ color: "#FF9F0A" }} /></motion.div>
              : <Bell size={18} style={{ color: T.muted }} />}
          </div>
          <div className="flex-1 text-left">
            <div className="text-[10px] font-black" style={{ color: candidateOnStreet ? "#FF9F0A" : T.text }}>
              {candidateOnStreet ? "🟢 Candidate On Field — Bell Active" : "Candidate On Street Mode"}
            </div>
            <div className="text-[8px]" style={{ color: T.muted }}>
              {candidateOnStreet ? "Volunteers can ping candidate to any door in real-time" : "Toggle when candidate joins field — unlocks door-ping feature"}
            </div>
          </div>
          {candidateOnStreet ? <ToggleRight size={22} style={{ color: "#FF9F0A" }} /> : <ToggleLeft size={22} style={{ color: T.muted }} />}
        </motion.button>

        <div className="flex p-1 rounded-xl gap-1" style={{ backgroundColor: T.tabBg, border: `1px solid ${T.border}` }}>
          {tabBtns.map(b => (
            <button key={b.id} onClick={() => setTab(b.id as typeof tab)}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
              style={{ backgroundColor: tab === b.id ? (isDark ? "rgba(0,229,255,0.18)" : "rgba(25,118,210,0.12)") : "transparent", color: tab === b.id ? T.accent : T.muted, border: tab === b.id ? `1px solid ${T.borderB}` : "1px solid transparent" }}>
              <b.icon size={10} />{b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-4">
        <AnimatePresence mode="wait">
          {tab === "overview" && (
            <motion.div key="ov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Doors Hit", value: "142", sub: "Today", color: T.accent },
                  { label: "Voters Met", value: "389", sub: "This week", color: "#00C853" },
                  { label: "Lit Dropped", value: "512", sub: "Pieces", color: "#FFD600" },
                  { label: "Signs Req.", value: "23", sub: "Pending", color: "#FF9F0A" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[8px] font-black uppercase tracking-widest" style={{ color: T.text }}>{s.label}</div>
                    <div className="text-[8px]" style={{ color: T.muted }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-2" style={{ color: T.accent }}>
                  <Activity size={11} /> Daily Contact Velocity
                </div>
                <div className="h-[110px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={AREA_DATA}>
                      <defs>
                        <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={T.accent} stopOpacity={isDark ? 0.4 : 0.2} />
                          <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={T.accent} strokeWidth={2} fill="url(#cg1)" isAnimationActive={false} />
                      <Area type="step" dataKey="baseline" stroke="#FF3B30" strokeWidth={1} strokeDasharray="4 4" fill="none" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: T.muted }}>
                  Riding 42 Voter Distribution ({totalVoters} voters · {ALL_STOPS.length} HH)
                </div>
                {Object.entries(PARTY_COLOR).filter(([p]) => ["LIB", "NDP", "CON", "GRN", "IND"].includes(p)).map(([party, color]) => {
                  const count = ALL_STOPS.reduce((a, s) => a + s.household.filter(p => p.party === party).length, 0);
                  const pct = Math.round((count / totalVoters) * 100);
                  return (
                    <div key={party} className="flex items-center gap-3 mb-2">
                      <span className="text-[9px] font-black w-8" style={{ color }}>{party}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: T.input }}>
                        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.1 }} style={{ backgroundColor: color }} />
                      </div>
                      <span className="text-[9px] font-bold w-16 text-right" style={{ color: T.sub }}>{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-2" style={{ color: T.accent }}>
                  <Target size={11} /> Efficacy Radar
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="68%" data={RADAR_DATA}>
                      <PolarGrid stroke={T.accentB} strokeOpacity={0.3} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: T.sub, fontSize: 8, fontWeight: 800 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                      <Radar dataKey="A" stroke={T.accent} strokeWidth={2} fill={T.accent} fillOpacity={isDark ? 0.18 : 0.1} isAnimationActive={false} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {tab === "team" && (
            <motion.div key="tm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {INITIAL_TEAM.map(m => (
                <div key={m.id} className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0" style={{ backgroundColor: m.color }}>{m.initials}</div>
                  <div className="flex-1">
                    <div className="font-black text-sm" style={{ color: T.text }}>{m.name}</div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.status === "active" ? "#00E676" : "#6B72A0" }} />
                      <span className="text-[9px] font-bold uppercase" style={{ color: m.status === "active" ? "#00E676" : T.muted }}>{m.status}</span>
                    </div>
                  </div>
                  <div className="text-right"><div className="text-[10px] font-black" style={{ color: T.text }}>14 doors</div><div className="text-[8px]" style={{ color: T.muted }}>today</div></div>
                </div>
              ))}
            </motion.div>
          )}

          {tab === "builder" && (
            <motion.div key="bd" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-xl p-4" style={{ backgroundColor: isDark ? "rgba(0,229,255,0.07)" : "rgba(25,118,210,0.05)", border: `1px solid ${T.borderB}` }}>
                <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: T.accent }}>Dynamic Field System</div>
                <p className="text-[9px] leading-relaxed" style={{ color: T.sub }}>
                  Fields created here appear live in the canvass wizard Survey step and enrich all voter files.
                </p>
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.muted }}>
                <List size={10} /> Fields ({campaignFields.filter(f => f.active).length}/{campaignFields.length} active)
              </div>
              <div className="space-y-2">
                {campaignFields.map(f => (
                  <div key={f.id} className="rounded-xl px-3 py-2.5 flex items-center gap-2 transition-all"
                    style={{ backgroundColor: T.card, border: `1px solid ${f.active ? T.border : `${T.border}60`}`, opacity: f.active ? 1 : 0.6 }}>
                    <span style={{ fontSize: 14 }}>{f.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black truncate" style={{ color: T.text }}>{f.label}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: `${T.accentB}15`, color: T.accentB }}>{f.type}</span>
                        <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(0,200,83,0.1)", color: "#00C853" }}>{f.scope}</span>
                      </div>
                    </div>
                    <button onClick={() => setCampaignFields(prev => prev.map(cf => cf.id === f.id ? { ...cf, active: !cf.active } : cf))} style={{ color: f.active ? T.accent : T.muted }}>
                      {f.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    {f.id.startsWith("custom_") && (
                      <button onClick={() => setCampaignFields(prev => prev.filter(cf => cf.id !== f.id))} style={{ color: "#FF3B30" }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: "#00C853" }}>
                  <Plus size={10} /> Add Custom Field
                </div>
                <input type="text" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)}
                  placeholder="Field label (e.g. 'Accessibility Needs')"
                  className="w-full px-3 py-2 rounded-lg text-[10px] focus:outline-none"
                  style={{ backgroundColor: T.input, border: `1px solid ${T.border}`, color: T.text }} />
                <div className="grid grid-cols-2 gap-2">
                  <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as CampaignField["type"])}
                    className="w-full px-2 py-1.5 rounded-lg text-[10px] focus:outline-none"
                    style={{ backgroundColor: T.input, border: `1px solid ${T.border}`, color: T.text }}>
                    <option value="boolean">Yes / No</option>
                    <option value="choice">Single Choice</option>
                    <option value="multi">Multi-Select</option>
                    <option value="text">Free Text</option>
                    <option value="scale">Scale 1–5</option>
                  </select>
                  <select value={newFieldScope} onChange={e => setNewFieldScope(e.target.value as "household" | "person")}
                    className="w-full px-2 py-1.5 rounded-lg text-[10px] focus:outline-none"
                    style={{ backgroundColor: T.input, border: `1px solid ${T.border}`, color: T.text }}>
                    <option value="household">Per Household</option>
                    <option value="person">Per Voter</option>
                  </select>
                </div>
                {(newFieldType === "choice" || newFieldType === "multi") && (
                  <input type="text" value={newFieldOpts} onChange={e => setNewFieldOpts(e.target.value)}
                    placeholder="Options: comma separated"
                    className="w-full px-3 py-2 rounded-lg text-[10px] focus:outline-none"
                    style={{ backgroundColor: T.input, border: `1px solid ${T.border}`, color: T.text }} />
                )}
                <button onClick={addField} disabled={!newFieldLabel.trim()}
                  className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all"
                  style={{ backgroundColor: newFieldLabel.trim() ? "#00C853" : T.border, color: newFieldLabel.trim() ? "#050A1F" : T.muted }}>
                  <Plus size={13} /> Add to Campaign
                </button>
              </div>
            </motion.div>
          )}

          {tab === "platform" && (
            <motion.div key="pl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="text-[9px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: T.accent }}><Globe size={11} /> App Architecture</div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    { name: "Poll City", role: "Campaign Staff", icon: Lock, color: "#2979FF", desc: "Full field ops, voter files, war room, walk lists, sign management. Staff-only." },
                    { name: "Poll City Social", role: "Public", icon: LockOpen, color: "#00C853", desc: "Public polling, riding feed, swipe polls, campaign updates. Anyone downloads." },
                  ].map(app => { const I = app.icon; return (
                    <div key={app.name} className="rounded-xl p-3" style={{ backgroundColor: isDark ? `${app.color}10` : `${app.color}08`, border: `1.5px solid ${app.color}35` }}>
                      <I size={16} className="mb-2" style={{ color: app.color }} />
                      <div className="text-[10px] font-black" style={{ color: T.text }}>{app.name}</div>
                      <div className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded inline-block mt-1 mb-2" style={{ backgroundColor: `${app.color}20`, color: app.color }}>{app.role}</div>
                      <div className="text-[8px] leading-relaxed" style={{ color: T.muted }}>{app.desc}</div>
                    </div>
                  ); })}
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : T.deep }}>
                  <Wifi size={11} style={{ color: T.accent }} />
                  <span className="text-[9px]" style={{ color: T.sub }}>Shared backend · Role-based access · Separate bundles</span>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="text-[9px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "#FF9F0A" }}><Smartphone size={11} /> iOS & Android Build Path</div>
                {[
                  { title: "Option A — Capacitor.js (Recommended)", detail: "Wrap this React codebase. 90%+ code reuse. Submit to both stores as native shell.", color: "#00C853" },
                  { title: "Option B — React Native / Expo", detail: "Port to React Native. Same data layer. True native performance.", color: "#2979FF" },
                  { title: "Option C — Swift / Kotlin Native", detail: "Full native rewrite using this prototype as functional spec.", color: "#9C27B0" },
                ].map(o => (
                  <div key={o.title} className="rounded-lg p-3 mb-2" style={{ border: `1px solid ${o.color}35`, backgroundColor: isDark ? `${o.color}08` : `${o.color}05` }}>
                    <div className="text-[9px] font-black mb-1" style={{ color: o.color }}>{o.title}</div>
                    <div className="text-[8px] leading-relaxed" style={{ color: T.muted }}>{o.detail}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════ */
export function SocialCommand() {
  const [isDark, setIsDark] = useState(true);
  const T = isDark ? DARK : LIGHT;

  const [mainTab, setMainTab] = useState<"field" | "command">("field");
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopIdx, setStopIdx] = useState(0);
  const [claimedSide, setClaimedSide] = useState<string | null>(null);
  const [teamData, setTeamData] = useState(INITIAL_TEAM);
  const [atDoor, setAtDoor] = useState(false);
  const [litDropMode, setLitDropMode] = useState(false);

  /* ─── Live missions from /api/field/shifts ─────────────────────────── */
  const [liveMissions, setLiveMissions] = useState<Mission[] | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const campaignId = params.get("campaignId");
    if (!campaignId) return;
    fetch(`/api/field/shifts?campaignId=${encodeURIComponent(campaignId)}`)
      .then(r => r.ok ? r.json() : null)
      .then((body: { data?: Array<{
        id: string; name: string; shiftType: string; status: string;
        _count?: { assignments?: number };
        turf?: { name?: string } | null;
        route?: { name?: string } | null;
      }> } | null) => {
        if (!body?.data?.length) return;
        let offset = 0;
        const mapped: Mission[] = body.data.map(s => {
          const doors = s._count?.assignments ?? 20;
          const m: Mission = {
            id: s.id,
            type: s.shiftType === "literature" ? "lit-drop" : "canvass",
            name: s.name,
            reward: `${doors * 50} XP`,
            doors,
            priority: s.status === "in_progress" ? "Critical" : s.status === "open" ? "Elevated" : "Standard",
            routing: s.turf?.name ?? s.route?.name ?? "All Addresses",
            start: offset,
            end: Math.min(offset + doors, ALL_STOPS.length),
          };
          offset = Math.min(offset + doors, ALL_STOPS.length);
          return m;
        });
        setLiveMissions(mapped);
      })
      .catch(() => {});
  }, []);

  const displayMissions = liveMissions ?? MISSIONS;

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>("door");
  const [slideDir, setSlideDir] = useState(1);
  const [doorOutcome, setDoorOutcome] = useState<string | null>(null);
  const [personStatuses, setPersonStatuses] = useState<Record<number, PersonStatus>>({});
  const [expandedPersonId, setExpandedPersonId] = useState<number | null>(null);

  // Extras
  const [selectedLit, setSelectedLit] = useState<string | null>(null);
  const [infoTopics, setInfoTopics] = useState<string[]>([]);
  const [signMode, setSignMode] = useState(false);
  const [signSuccess, setSignSuccess] = useState<{ type: SignType; qty: number } | null>(null);
  const [householdFields, setHouseholdFields] = useState<Record<string, PersonStatus["fieldValues"][string]>>({});
  const [stopNote, setStopNote] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [opponentCaptured, setOpponentCaptured] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ label: string; color: string } | null>(null);

  // Candidate on street
  const [candidateOnStreet, setCandidateOnStreet] = useState(false);
  const [candidateNotifSent, setCandidateNotifSent] = useState(false);

  // Campaign fields
  const [campaignFields, setCampaignFields] = useState<CampaignField[]>(DEFAULT_CAMPAIGN_FIELDS);

  const currentStop = stops[stopIdx] ?? null;
  const isLitDrop = activeMission?.type === "lit-drop";
  const stepFlow = useMemo(() => getStepFlow(doorOutcome), [doorOutcome]);
  const stepIdx = stepFlow.indexOf(wizardStep);
  const completed = useMemo(() => stops.filter(s => s.status !== "pending").length, [stops]);
  const pct = stops.length ? Math.round((completed / stops.length) * 100) : 0;
  const activeHouseholdFields = campaignFields.filter(f => f.active && f.scope === "household" && f.category !== "intel");
  const activePersonFields = campaignFields.filter(f => f.active && f.scope === "person");

  const navigate = (next: WizardStep, dir: 1 | -1) => { setSlideDir(dir); setWizardStep(next); };
  const goNext = () => { if (stepIdx < stepFlow.length - 1) navigate(stepFlow[stepIdx + 1], 1); };
  const goBack = () => {
    if (stepIdx > 0) navigate(stepFlow[stepIdx - 1], -1);
    else { setAtDoor(false); setWizardStep("door"); setDoorOutcome(null); }
  };

  const resetStop = useCallback(() => {
    setAtDoor(false); setWizardStep("door"); setSlideDir(1);
    setDoorOutcome(null); setPersonStatuses({}); setExpandedPersonId(null);
    setSelectedLit(null); setInfoTopics([]); setSignMode(false); setSignSuccess(null);
    setHouseholdFields({}); setStopNote(""); setInviteSent(false); setOpponentCaptured(false);
    setCandidateNotifSent(false); setShareTarget(null);
  }, []);

  const commitStop = (outcome: string) => {
    if (!currentStop) return;
    const ns = [...stops];
    ns[stopIdx] = { ...currentStop, status: outcome, notes: stopNote || currentStop.notes };
    setStops(ns);
    resetStop();
    const nextI = ns.findIndex((s, i) => i > stopIdx && s.status === "pending");
    setStopIdx(nextI !== -1 ? nextI : ns.findIndex(s => s.status === "pending"));
  };

  const derivedOutcome = () => {
    if (!doorOutcome) return null;
    if (doorOutcome === "no-answer") return "not-home";
    if (doorOutcome === "refused") return "refused";
    if (doorOutcome === "left-note") return "dropped";
    const household = currentStop?.household ?? [];
    const allStatuses = household.map(p => personStatuses[p.id]);
    const contacts = allStatuses.map(s => s?.contact).filter(Boolean) as string[];
    const npFlags = allStatuses.map(s => s?.notPresent).filter(Boolean);
    if (npFlags.length === household.length && household.length > 0) return "not-home";
    const hasHostile = allStatuses.some(s => s?.notPresent === "hostile");
    if (!contacts.length && !hasHostile) return "contacted";
    const supportN = contacts.filter(c => c === "support").length;
    const opposeN = contacts.filter(c => c === "oppose").length + (hasHostile ? 1 : 0);
    const softNoN = contacts.filter(c => c === "soft-no").length;
    const total = contacts.length + (hasHostile ? 1 : 0);
    if (supportN / total > 0.5) return "support";
    if (opposeN / total >= 0.5) return "refused";
    if (softNoN / total >= 0.5) return "undecided";
    return "undecided";
  };

  const setPersonContact = (id: number, v: string | null) =>
    setPersonStatuses(p => ({ ...p, [id]: { ...p[id] ?? { contact: null, notPresent: null, fieldValues: {} }, contact: v } }));
  const setPersonNotPresent = (id: number, v: string | null) =>
    setPersonStatuses(p => ({ ...p, [id]: { ...p[id] ?? { contact: null, notPresent: null, fieldValues: {} }, notPresent: v } }));
  const setPersonField = (pid: number, fid: string, val: PersonStatus["fieldValues"][string]) =>
    setPersonStatuses(p => ({ ...p, [pid]: { ...p[pid] ?? { contact: null, notPresent: null, fieldValues: {} }, fieldValues: { ...p[pid]?.fieldValues, [fid]: val } } }));

  const acceptMission = (m: Mission) => {
    setActiveMission(m);
    const sliceEnd = Math.min(m.end, ALL_STOPS.length);
    const sliceStart = Math.min(m.start, sliceEnd);
    setStops(ALL_STOPS.slice(sliceStart, sliceEnd).map(s => ({ ...s, status: "pending" })));
    setStopIdx(0); setClaimedSide(null); setLitDropMode(false);
    setTeamData(INITIAL_TEAM.map(t => ({ ...t, side: null })));
    resetStop();
  };

  const claimTurf = (side: string) => {
    const ns = claimedSide === side ? null : side;
    setClaimedSide(ns);
    setTeamData(prev => prev.map(m => m.id === "t1" ? { ...m, side: ns } : m));
  };

  /* ─── STEP: DOOR ─── */
  const StepDoor = () => (
    <div className="space-y-4">
      <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: T.muted }}>What happened at the door?</div>
      <div className="text-[8px] mb-3" style={{ color: T.muted }}>Your selection determines which steps follow.</div>
      <div className="grid grid-cols-2 gap-2">
        {DOOR_OUTCOMES.map(o => {
          const sel = doorOutcome === o.id;
          return (
            <motion.button key={o.id} whileTap={{ scale: 0.95 }} onClick={() => {
              setDoorOutcome(sel ? null : o.id);
              if (!sel && o.id !== "answered") {
                setTimeout(() => { setSlideDir(1); setWizardStep(getStepFlow(o.id)[1]); }, 600);
              }
            }}
              className="p-4 rounded-xl text-left relative border-2"
              style={{ backgroundColor: sel ? `${o.color}18` : T.card, borderColor: sel ? o.color : T.border, boxShadow: sel && isDark ? `0 0 16px ${o.color}35` : undefined }}>
              {sel && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2">
                <CheckCircle size={12} style={{ color: o.color }} />
              </motion.div>}
              <div className="font-black text-sm mb-0.5" style={{ color: sel ? o.color : T.text }}>{o.label}</div>
              <div className="text-[9px]" style={{ color: T.muted }}>{o.desc}</div>
            </motion.button>
          );
        })}
      </div>
      {currentStop?.notes && (
        <div className="px-3 py-2.5 rounded-xl flex items-start gap-2" style={{ backgroundColor: isDark ? "rgba(255,214,0,0.07)" : "rgba(255,214,0,0.05)", border: "1px solid rgba(255,214,0,0.3)" }}>
          <StickyNote size={12} style={{ color: "#FFD600", flexShrink: 0, marginTop: 2 }} />
          <div className="text-[9px]" style={{ color: T.sub }}>{currentStop.notes}</div>
        </div>
      )}
      {doorOutcome === "answered" && (
        <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onClick={goNext}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.18em] text-sm flex items-center justify-center gap-2 transition-all"
          style={{ backgroundColor: T.accent, color: "#050A1F", boxShadow: isDark ? `0 0 22px ${T.accent}50` : undefined }}>
          Door Answered → Record Voters <ChevronRight size={16} />
        </motion.button>
      )}
    </div>
  );

  /* ─── STEP: HOUSEHOLD ─── */
  const StepHousehold = () => {
    const household = currentStop?.household ?? [];
    const markedCount = household.filter(p =>
      personStatuses[p.id]?.contact || personStatuses[p.id]?.notPresent
    ).length;
    const allMarked = markedCount === household.length && household.length > 0;
    const unmarked = household.filter(p =>
      !personStatuses[p.id]?.contact && !personStatuses[p.id]?.notPresent
    );
    const activeId = expandedPersonId ?? (unmarked[0]?.id ?? null);

    const firstMarkedPerson = household.find(p => personStatuses[p.id]?.contact);
    const firstOutcome = firstMarkedPerson
      ? CONTACT_OUTCOMES.find(o => o.id === personStatuses[firstMarkedPerson.id]?.contact)
      : null;

    const allNP = household.length > 0 && household.every(p => personStatuses[p.id]?.notPresent);

    const handleBulkMark = (outcomeId: string) => {
      household.forEach(p => {
        if (!personStatuses[p.id]?.notPresent) setPersonContact(p.id, outcomeId);
      });
      setExpandedPersonId(null);
    };

    const handleMarkRemaining = () => {
      if (!firstOutcome) return;
      unmarked.forEach(p => setPersonContact(p.id, firstOutcome.id));
      setExpandedPersonId(null);
    };

    const handleMarkDone = (personId: number) => {
      const s = personStatuses[personId];
      if (s?.contact || s?.notPresent) {
        const next = household.find(p =>
          p.id !== personId && !personStatuses[p.id]?.contact && !personStatuses[p.id]?.notPresent
        );
        setExpandedPersonId(next?.id ?? null);
      } else {
        setExpandedPersonId(null);
      }
    };

    const handleContact = (id: number, v: string | null) => {
      setPersonContact(id, v);
      if (v !== null) {
        const next = household.find(p =>
          p.id !== id && !personStatuses[p.id]?.contact && !personStatuses[p.id]?.notPresent
        );
        setExpandedPersonId(next?.id ?? null);
      }
    };

    const handleNP = (id: number, v: string | null) => {
      setPersonNotPresent(id, v);
      if (v !== null) {
        const next = household.find(p =>
          p.id !== id && !personStatuses[p.id]?.contact && !personStatuses[p.id]?.notPresent
        );
        setExpandedPersonId(next?.id ?? null);
      }
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: T.muted }}>
              {household.length} voter{household.length !== 1 ? "s" : ""} at this address
            </div>
            <div className="text-[8px] mt-0.5 font-bold" style={{ color: allMarked || allNP ? "#00C853" : T.sub }}>
              {allMarked || allNP
                ? `✓ All ${household.length} voters recorded`
                : markedCount > 0
                  ? `${markedCount} of ${household.length} recorded · ${unmarked.length} remaining`
                  : "Tap a voter card to begin"}
            </div>
          </div>
          {household.length > 1 && (
            <div className="flex items-center gap-1">
              {household.map(p => {
                const s = personStatuses[p.id];
                const oc = CONTACT_OUTCOMES.find(o => o.id === s?.contact);
                const np = VOTER_NP_OPTS.find(o => o.id === s?.notPresent);
                const dotColor = oc?.color ?? np?.color;
                const isActive = p.id === activeId;
                return (
                  <motion.div key={p.id} layout className="rounded-full transition-all"
                    style={{
                      width: isActive ? 10 : 7, height: isActive ? 10 : 7,
                      backgroundColor: dotColor ?? (isActive ? T.accent : T.border),
                      boxShadow: isActive && isDark ? `0 0 6px ${T.accent}` : undefined,
                    }} />
                );
              })}
            </div>
          )}
        </div>

        {household.length > 1 && markedCount === 0 && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-1.5">
              <Zap size={10} style={{ color: "#FFD600" }} />
              <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: T.muted }}>
                Quick mark — entire household
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 px-3 pb-3">
              {CONTACT_OUTCOMES.map(o => (
                <motion.button key={o.id} whileTap={{ scale: 0.92 }} onClick={() => handleBulkMark(o.id)}
                  className="py-2.5 rounded-xl text-[8px] font-black uppercase text-center transition-all"
                  style={{ backgroundColor: `${o.color}15`, border: `1.5px solid ${o.color}35`, color: o.color }}>
                  {o.label}
                </motion.button>
              ))}
            </div>
            <div className="px-3 pb-2.5">
              <div className="text-[7px] text-center" style={{ color: T.muted }}>
                Marks all {household.length} voters · you can override individually below
              </div>
            </div>
          </motion.div>
        )}

        {markedCount > 0 && !allMarked && !allNP && firstOutcome && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: `${firstOutcome.color}0D`, border: `1px solid ${firstOutcome.color}35` }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: firstOutcome.color }} />
            <span className="text-[9px] flex-1" style={{ color: T.sub }}>
              Mark remaining <span className="font-black">{unmarked.length}</span> voter{unmarked.length !== 1 ? "s" : ""} as{" "}
              <span className="font-black" style={{ color: firstOutcome.color }}>{firstOutcome.label}</span>?
            </span>
            <motion.button whileTap={{ scale: 0.93 }} onClick={handleMarkRemaining}
              className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex-shrink-0 transition-all"
              style={{ backgroundColor: `${firstOutcome.color}20`, color: firstOutcome.color, border: `1px solid ${firstOutcome.color}40` }}>
              Apply
            </motion.button>
          </motion.div>
        )}

        <div className="space-y-2">
          <AnimatePresence>
            {household.map((person, idx) => {
              const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
              const s = personStatuses[person.id];
              const isMarked = !!(s?.contact || s?.notPresent);
              return (
                <motion.div key={person.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                  <PersonCard
                    person={person}
                    status={s ?? { contact: null, notPresent: null, fieldValues: {} }}
                    isActive={person.id === activeId}
                    onActivate={() => setExpandedPersonId(person.id)}
                    onMarkDone={() => handleMarkDone(person.id)}
                    onContact={handleContact}
                    onNotPresent={handleNP}
                    fields={activePersonFields}
                    onField={setPersonField}
                    isDark={isDark} T={T}
                    positionLabel={!isMarked && household.length > 1 ? ordinals[idx] : undefined}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {(allMarked || allNP) && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: "rgba(0,200,83,0.08)", border: "1.5px solid rgba(0,200,83,0.35)" }}>
              <CheckCircle size={20} style={{ color: "#00C853", flexShrink: 0 }} />
              <div className="flex-1">
                <div className="font-black text-[11px]" style={{ color: "#00C853" }}>
                  {allNP ? "Household flagged" : `All ${household.length} voters recorded`}
                </div>
                <div className="text-[8px]" style={{ color: T.muted }}>
                  {allNP ? "All voters flagged as not present — continuing to extras" : "Tap any voter above to edit · continue to survey when ready"}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button layout whileTap={{ scale: 0.97 }} onClick={goNext}
          className="w-full rounded-2xl font-black uppercase tracking-[0.13em] text-sm flex items-center justify-center gap-2 transition-all"
          style={{
            padding: "16px",
            backgroundColor: allMarked || allNP ? "#00C853" : markedCount > 0 ? T.accent : T.accentB,
            color: "#050A1F",
            boxShadow: isDark ? `0 0 22px ${allMarked || allNP ? "rgba(0,200,83,0.5)" : `${T.accent}50`}` : undefined,
          }}>
          {allMarked || allNP
            ? <><CheckCircle size={16} /> All Recorded · Continue to Survey</>
            : markedCount > 0
              ? <>{markedCount}/{household.length} Recorded · Continue Anyway <ChevronRight size={16} /></>
              : <>Continue to Survey <ChevronRight size={16} /></>}
        </motion.button>

        {!allMarked && !allNP && markedCount > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: isDark ? "rgba(255,159,10,0.06)" : "rgba(255,159,10,0.04)", border: "1px solid rgba(255,159,10,0.25)" }}>
            <TriangleAlert size={10} style={{ color: "#FF9F0A", flexShrink: 0 }} />
            <span className="text-[8px]" style={{ color: "#FF9F0A" }}>
              {unmarked.length} voter{unmarked.length !== 1 ? "s" : ""} not yet recorded — tap their card to go back, or continue anyway.
            </span>
          </motion.div>
        )}

        {household.length === 1 && markedCount === 0 && (
          <div className="text-[8px] text-center" style={{ color: T.muted }}>
            Record the voter&apos;s stance above, or use &ldquo;Not at Door&rdquo; if they weren&apos;t available.
          </div>
        )}
      </div>
    );
  };

  /* ─── STEP: QUESTIONS ─── */
  const StepQuestions = () => {
    const hFields = activeHouseholdFields.filter(f => f.id !== "sign_interest");
    const hasSignField = campaignFields.find(f => f.id === "sign_interest" && f.active);
    const signVal = householdFields["sign_interest"] as boolean | undefined;
    return (
      <div className="space-y-3">
        <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: T.muted }}>
          Campaign survey — {hFields.length} household question{hFields.length !== 1 ? "s" : ""}
        </div>
        {hFields.map(f => (
          <div key={f.id} className="rounded-xl p-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            {f.hint && <div className="text-[8px] italic mb-2" style={{ color: T.muted }}>{f.hint}</div>}
            <FieldRenderer field={f} value={householdFields[f.id]}
              onChange={v => setHouseholdFields(p => ({ ...p, [f.id]: v }))} T={T} isDark={isDark} />
          </div>
        ))}
        {hasSignField && (
          <div className="rounded-xl p-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <FieldRenderer field={hasSignField} value={householdFields["sign_interest"]}
              onChange={v => setHouseholdFields(p => ({ ...p, sign_interest: v }))} T={T} isDark={isDark} />
            {signVal === true && (
              <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} onClick={() => setSignMode(true)}
                className="w-full mt-2 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: "rgba(255,159,10,0.15)", border: "1px solid rgba(255,159,10,0.4)", color: "#FF9F0A" }}>
                <Flag size={12} /> YES — Open Sign Request
              </motion.button>
            )}
          </div>
        )}
        {campaignFields.filter(f => f.active).length === 0 && (
          <div className="text-center py-8" style={{ color: T.muted }}>
            <Settings size={24} className="mx-auto mb-2 opacity-40" />
            <div className="text-[10px]">No active survey fields. Add in Command → Builder.</div>
          </div>
        )}
        <button onClick={goNext}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-2 transition-all"
          style={{ backgroundColor: T.accent, color: "#050A1F", boxShadow: isDark ? `0 0 22px ${T.accent}50` : undefined }}>
          Continue to Actions <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  /* ─── STEP: EXTRAS / ACTIONS ─── */
  const StepExtras = () => (
    <div className="space-y-4">
      <LitAndInterestsPanel
        stops={stops} stopIdx={stopIdx}
        selectedLit={selectedLit} setSelectedLit={setSelectedLit}
        infoTopics={infoTopics} setInfoTopics={setInfoTopics}
        shareTarget={shareTarget} setShareTarget={setShareTarget}
        T={T} isDark={isDark} currentStop={currentStop} />

      <div className="rounded-xl p-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 mb-2" style={{ color: "#FF9F0A" }}>
          <MapPin size={11} /> Sign Request
        </div>
        {signSuccess ? (
          <div className="flex items-center gap-3 py-2">
            <CheckCircle size={16} style={{ color: "#00C853" }} />
            <span className="text-[10px] font-black" style={{ color: "#00C853" }}>{signSuccess.qty}× {SIGN_TYPES.find(t => t.id === signSuccess.type)?.label} queued ✓</span>
            <button onClick={() => setSignSuccess(null)} className="ml-auto text-[8px] font-black uppercase" style={{ color: T.muted }}>Change</button>
          </div>
        ) : (
          <button onClick={() => setSignMode(true)}
            className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ backgroundColor: "rgba(255,159,10,0.1)", border: "1px solid rgba(255,159,10,0.35)", color: "#FF9F0A" }}>
            <Flag size={13} /> Request Sign Install — 8 Types
          </button>
        )}
      </div>

      <CandidateBell
        candidateOnStreet={candidateOnStreet}
        notifSent={candidateNotifSent}
        onSend={() => setCandidateNotifSent(true)}
        address={currentStop?.address ?? ""}
        T={T} isDark={isDark} />

      <div className="rounded-xl p-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 mb-2" style={{ color: T.accent }}>
          <Smartphone size={11} /> Onboard to Poll City Social
        </div>
        <div className="text-[8px] mb-2" style={{ color: T.muted }}>
          Public app — voter can track their riding, answer polls, see campaign updates.
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "SMS", icon: MessageSquare, color: "#00C853" },
            { label: "Email", icon: Mail, color: "#2979FF" },
            { label: "QR Code", icon: QrCode, color: "#FF9F0A" },
          ].map(ch => {
            const I = ch.icon;
            return (
              <button key={ch.label} onClick={() => setInviteSent(true)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all active:scale-90"
                style={{ backgroundColor: inviteSent ? `${ch.color}12` : T.input, border: `1.5px solid ${inviteSent ? ch.color : T.border}`, color: inviteSent ? ch.color : T.muted }}>
                <I size={14} />
                <span className="text-[8px] font-black">{ch.label}</span>
              </button>
            );
          })}
        </div>
        {inviteSent && <div className="text-[8px] mt-1.5 font-bold text-center" style={{ color: "#00C853" }}>✓ Invite sent — voter will receive Poll City Social link</div>}
      </div>

      <div className="rounded-xl p-3" style={{ backgroundColor: T.card, border: "1px solid rgba(255,59,48,0.25)" }}>
        <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 mb-2" style={{ color: "#FF3B30" }}>
          <ShieldAlert size={11} /> Opponent Intel
        </div>
        <button onClick={() => {
          if (currentStop) {
            const ns = [...stops];
            ns[stopIdx] = { ...currentStop, hasOpponentSign: !currentStop.hasOpponentSign };
            setStops(ns);
            setOpponentCaptured(!opponentCaptured);
          }
        }}
          className="w-full py-2.5 rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all"
          style={{ backgroundColor: opponentCaptured ? "#FF3B3022" : "transparent", border: `1px solid ${opponentCaptured ? "#FF3B30" : "rgba(255,59,48,0.35)"}`, color: "#FF3B30" }}>
          <Camera size={13} /> {opponentCaptured ? "Opponent Sign Logged ✓" : "Log Opponent Signage"}
        </button>
      </div>

      <div className="rounded-xl p-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 mb-2" style={{ color: T.muted }}>
          <StickyNote size={11} /> Stop Notes
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {["Receptive", "Follow up", "French preferred", "Transit issue", "Housing concern"].map(chip => (
            <button key={chip} onClick={() => setStopNote(p => p ? `${p}, ${chip}` : chip)}
              className="px-2 py-1 rounded-lg text-[8px] font-bold transition-all active:scale-90"
              style={{ border: `1px solid ${T.border}`, color: T.muted, backgroundColor: T.input }}>
              + {chip}
            </button>
          ))}
        </div>
        <textarea value={stopNote || currentStop?.notes || ""} onChange={e => setStopNote(e.target.value)}
          placeholder="Field notes, concerns, follow-up…" rows={2}
          className="w-full p-2 rounded-lg text-[10px] resize-none focus:outline-none"
          style={{ backgroundColor: T.input, border: `1px solid ${T.border}`, color: T.text }} />
      </div>

      <button onClick={goNext}
        className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-2 transition-all"
        style={{ backgroundColor: T.accent, color: "#050A1F", boxShadow: isDark ? `0 0 22px ${T.accent}50` : undefined }}>
        Review &amp; Wrap <ChevronRight size={16} />
      </button>
    </div>
  );

  /* ─── STEP: SUMMARY ─── */
  const StepSummary = () => {
    const outcome = derivedOutcome();
    const oMap: Record<string, { label: string; color: string }> = {
      support: { label: "Support", color: "#00C853" },
      undecided: { label: "Undecided", color: "#FFD600" },
      refused: { label: "Refused", color: "#FF3B30" },
      "not-home": { label: "Not Home", color: "#6B72A0" },
      dropped: { label: "Lit Dropped", color: "#FFD600" },
      contacted: { label: "Contacted", color: "#2979FF" },
    };
    const oc = oMap[outcome ?? "contacted"] ?? { label: outcome ?? "—", color: T.accent };
    const household = currentStop?.household ?? [];
    const supportCount = household.filter(p => personStatuses[p.id]?.contact === "support").length;
    const undecidedCount = household.filter(p => personStatuses[p.id]?.contact === "undecided").length;
    const softNoCount = household.filter(p => personStatuses[p.id]?.contact === "soft-no").length;
    const opposeCount = household.filter(p => personStatuses[p.id]?.contact === "oppose").length;
    const npCount = household.filter(p => personStatuses[p.id]?.notPresent).length;
    const recordedCount = household.filter(p => personStatuses[p.id]?.contact || personStatuses[p.id]?.notPresent).length;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: `${oc.color}12`, border: `2px solid ${oc.color}40`, boxShadow: isDark ? `0 0 20px ${oc.color}20` : undefined }}>
          <div className="text-3xl font-black mb-1" style={{ color: oc.color }}>{oc.label}</div>
          <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: T.muted }}>
            {currentStop?.address}{currentStop?.unit ? ` · ${currentStop.unit}` : ""}
          </div>
          {doorOutcome === "answered" && household.length > 0 && (
            <div className="flex justify-center gap-3 mt-3 flex-wrap">
              {[
                { n: supportCount,   label: "Support",      c: "#00C853" },
                { n: undecidedCount, label: "Undecided",    c: "#FFD600" },
                { n: softNoCount,    label: "Soft No",      c: "#FF9F0A" },
                { n: opposeCount,    label: "Oppose",       c: "#FF3B30" },
                { n: npCount,        label: "Not Present",  c: "#6B72A0" },
              ].filter(x => x.n > 0).map(x => (
                <div key={x.label} className="text-center px-2">
                  <div className="font-black text-lg" style={{ color: x.c }}>{x.n}</div>
                  <div className="text-[7px] uppercase font-black" style={{ color: T.muted }}>{x.label}</div>
                </div>
              ))}
              {recordedCount < household.length && (
                <div className="text-center px-2">
                  <div className="font-black text-lg" style={{ color: T.muted }}>{household.length - recordedCount}</div>
                  <div className="text-[7px] uppercase font-black" style={{ color: T.muted }}>Unrecorded</div>
                </div>
              )}
            </div>
          )}
        </div>
        {[
          { label: "Door outcome", done: !!doorOutcome, val: DOOR_OUTCOMES.find(o => o.id === doorOutcome)?.label },
          { label: "Voter stances", done: doorOutcome !== "answered" || recordedCount > 0, val: doorOutcome !== "answered" ? "Auto" : `${recordedCount}/${household.length} voters` },
          { label: "Survey", done: Object.keys(householdFields).length > 0, val: `${Object.keys(householdFields).length} fields` },
          { label: "Lit left", done: !!selectedLit, val: LIT_PIECES.find(l => l.id === selectedLit)?.label },
          { label: "Voter interests", done: infoTopics.length > 0, val: infoTopics.length > 0 ? `${infoTopics.length} topics` : undefined },
          { label: "Sign requested", done: !!signSuccess, val: signSuccess ? `${signSuccess.qty}× ${SIGN_TYPES.find(t => t.id === signSuccess.type)?.label}` : undefined },
          { label: "Social invite", done: inviteSent, val: inviteSent ? "Sent" : undefined },
          { label: "Candidate pinged", done: candidateNotifSent, val: candidateNotifSent ? `→ ${currentStop?.address}` : undefined },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 py-1.5 border-b" style={{ borderColor: T.border }}>
            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: item.done ? "#00C85320" : "transparent", border: `1.5px solid ${item.done ? "#00C853" : T.border}` }}>
              {item.done && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#00C853" }} />}
            </div>
            <span className="flex-1 text-[10px] font-bold" style={{ color: item.done ? T.text : T.muted }}>{item.label}</span>
            {item.val && <span className="text-[8px] font-bold" style={{ color: T.accent }}>{item.val}</span>}
          </div>
        ))}
        <div className="text-[8px] text-center" style={{ color: T.muted }}>{completed} of {stops.length} done · {stops.length - completed - 1} remaining</div>
        <motion.button initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          onClick={() => outcome && commitStop(outcome)} disabled={!outcome}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all"
          style={{ background: "linear-gradient(135deg,#2979FF,#00E5FF)", color: "#050A1F", boxShadow: isDark ? "0 0 28px rgba(0,229,255,0.45)" : undefined }}>
          <ChevronRight size={18} /> Log Stop &amp; Next Address
        </motion.button>
      </div>
    );
  };

  /* ─── LIT DROP MODE ─── */
  if (activeMission && litDropMode) return (
    <div className="h-full w-full" style={{ backgroundColor: T.bg }}>
      <LitDropMode stops={stops} missionName={activeMission.name} teamData={teamData}
        onCommitBatch={() => setStops(stops.map(s => ({ ...s, status: "dropped" })))}
        onCommitStop={(id) => setStops(prev => prev.map(s => s.id === id ? { ...s, status: "dropped" } : s))}
        onExit={() => setLitDropMode(false)}
        T={T} isDark={isDark} />
    </div>
  );

  /* ─── ACTIVE CANVASS MISSION ─── */
  if (activeMission) return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: T.deep }}>
      <div className="h-14 border-b flex items-center px-4 justify-between z-20 flex-shrink-0"
        style={{ backgroundColor: T.overlay, borderColor: T.border }}>
        <button onClick={() => { setActiveMission(null); setStops([]); resetStop(); }}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, color: T.sub }}>
          <ChevronLeft size={16} />
        </button>
        <div className="text-center flex-1 px-2">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1" style={{ color: T.accent }}>
            <Zap size={8} /> {isLitDrop ? "Lit Drop" : "Canvassing"} · Apr 2026
          </div>
          <div className="text-[11px] font-black leading-tight truncate" style={{ color: T.text }}>{activeMission.name}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle isDark={isDark} setIsDark={setIsDark} T={T} size="sm" />
          {isLitDrop && (
            <button onClick={() => setLitDropMode(true)}
              className="h-7 px-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1"
              style={{ backgroundColor: "rgba(255,214,0,0.15)", border: "1px solid rgba(255,214,0,0.5)", color: "#FFD600" }}>
              <Rocket size={9} /> Fast
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-shrink-0 overflow-hidden" style={{ height: atDoor ? 80 : 160, backgroundColor: isDark ? "#090D24" : T.deep, transition: "height 0.4s cubic-bezier(0.4,0,0.2,1)" }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `linear-gradient(${T.gridLine} 1px,transparent 1px),linear-gradient(90deg,${T.gridLine} 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
        <div className="absolute inset-0 flex items-center justify-center gap-6">
          <Navigation size={20} className="-rotate-45" style={{ color: T.accent, filter: isDark ? `drop-shadow(0 0 10px ${T.accent})` : undefined }} />
          {currentStop && (
            <div className="flex flex-col items-center gap-1">
              <MapPin size={18} style={{ color: "#FF3B30" }} />
              <div className="text-[8px] font-black px-2 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: T.card, color: T.text, border: `1px solid ${T.border}` }}>{currentStop.address}</div>
            </div>
          )}
        </div>
        <div className="absolute top-2 left-2 right-2">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg" style={{ backgroundColor: isDark ? "rgba(5,10,31,0.8)" : "rgba(255,255,255,0.85)", border: `1px solid ${T.border}` }}>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "rgba(41,121,255,0.2)" : T.deep }}>
              <motion.div className="h-full rounded-full" animate={{ width: `${pct}%` }} style={{ backgroundColor: T.accent }} />
            </div>
            <span className="text-[9px] font-black whitespace-nowrap" style={{ color: T.accent }}>{completed}/{stops.length}</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none" style={{ background: `linear-gradient(to top, ${isDark ? "#0B0B0F" : "#E2E8FF"}, transparent)` }} />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col" style={{ backgroundColor: T.deep }}>
        <AnimatePresence mode="wait">
          {!atDoor ? (
            <motion.div key="nav" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="flex-1 flex flex-col px-5 pt-4 pb-6 space-y-3 overflow-y-auto">
              {currentStop ? (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: T.muted }}>Next Stop</div>
                      <h2 className="text-xl font-black" style={{ color: T.text }}>{currentStop.address}</h2>
                      {currentStop.unit && <div className="text-[10px] font-bold mt-0.5" style={{ color: T.sub }}>{currentStop.unit}</div>}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {Array.from(new Set(currentStop.household.map(p => p.party))).map(party => (
                          <span key={party} className="text-[7px] font-black px-1.5 py-0.5 rounded" style={{ backgroundColor: `${partyColor(party)}22`, color: partyColor(party) }}>{party}</span>
                        ))}
                        <span className="text-[9px] font-bold" style={{ color: T.sub }}>{currentStop.household.length} voter{currentStop.household.length !== 1 ? "s" : ""}</span>
                        {currentStop.hasOpponentSign && <span className="text-[8px] font-black" style={{ color: "#FF3B30" }}>⚠ Opp. sign</span>}
                      </div>
                      {currentStop.notes && <div className="text-[8px] italic mt-1" style={{ color: T.muted }}>📋 {currentStop.notes}</div>}
                    </div>
                    <div className="text-center px-3 py-2 rounded-xl" style={{ backgroundColor: `${T.accent}15`, border: `1px solid ${T.borderB}` }}>
                      <div className="font-black text-lg leading-none" style={{ color: T.accent }}>3m</div>
                      <div className="text-[7px] font-black uppercase" style={{ color: `${T.accent}99` }}>Walk</div>
                    </div>
                  </div>
                  <div className="rounded-xl p-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                    <div className="text-[8px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: T.muted }}>
                      <Layers size={9} /> Claim Turf
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TURF_SIDES.map(side => {
                        const claimed = claimedSide === side.id;
                        return (
                          <button key={side.id} onClick={() => claimTurf(side.id)}
                            className="py-2 rounded-lg text-[9px] font-black uppercase tracking-wide text-center transition-all active:scale-90"
                            style={{ backgroundColor: claimed ? `${T.accent}18` : T.input, border: `1.5px solid ${claimed ? T.accent : T.border}`, color: claimed ? T.accent : T.sub, boxShadow: claimed && isDark ? `0 0 10px ${T.accent}30` : undefined }}>
                            {side.label}
                            {claimed && <div className="text-[7px] font-bold normal-case opacity-70">claimed ✓</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {teamData.filter(m => m.status === "active").map(m => (
                      <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: `${m.color}12`, border: `1px solid ${m.color}25` }}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-black text-white" style={{ backgroundColor: m.color }}>{m.initials}</div>
                        <span className="text-[8px] font-bold" style={{ color: m.color }}>{m.name.split(" ")[0]}</span>
                        {m.side && <span className="text-[7px]" style={{ color: T.muted }}>{m.side}</span>}
                      </div>
                    ))}
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => setAtDoor(true)}
                    className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.18em] text-sm flex items-center justify-center gap-2 transition-all"
                    style={{ backgroundColor: T.accent, color: "#050A1F", boxShadow: isDark ? `0 0 22px ${T.accent}50` : undefined }}>
                    <MapPin size={16} /> Arrived — Start Interaction
                  </motion.button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle size={40} className="mb-4" style={{ color: T.accent }} />
                  <h2 className="font-black uppercase tracking-widest text-lg mb-2" style={{ color: T.text }}>Mission Complete!</h2>
                  <p className="text-xs mb-6" style={{ color: T.sub }}>All {stops.length} stops done · Riding 42 · Apr 2026</p>
                  <button onClick={() => { setActiveMission(null); setStops([]); resetStop(); }}
                    className="px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all"
                    style={{ backgroundColor: `${T.accentB}20`, color: T.accentB, border: `1px solid ${T.borderB}` }}>
                    Return to Command
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="wiz" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="flex-1 flex flex-col overflow-hidden relative">
              <div className="px-5 pt-3 flex-shrink-0" style={{ backgroundColor: T.deep }}>
                <div className="flex items-center justify-between mb-1">
                  <button onClick={goBack} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest" style={{ color: T.muted }}>
                    <ArrowLeft size={13} /> Back
                  </button>
                  <div className="text-[10px] font-black truncate flex-1 text-center mx-2" style={{ color: T.text }}>{currentStop?.address}</div>
                  <div className="flex items-center gap-1.5">
                    <ThemeToggle isDark={isDark} setIsDark={setIsDark} T={T} size="sm" />
                    <button onClick={resetStop} style={{ color: T.muted }}><X size={14} /></button>
                  </div>
                </div>
                <StepDots steps={stepFlow} current={wizardStep} T={T} />
              </div>

              <AnimatePresence>
                {signMode && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 overflow-y-auto p-5" style={{ backgroundColor: T.deep }}>
                    {signSuccess ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <CheckCircle size={36} className="mb-3" style={{ color: "#FF9F0A" }} />
                        <div className="font-black uppercase tracking-widest" style={{ color: T.text }}>Sign Queued!</div>
                        <button onClick={() => setSignMode(false)} className="mt-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: T.muted }}>
                          <ArrowLeft size={12} /> Back to Actions
                        </button>
                      </div>
                    ) : (
                      <SignPicker address={currentStop?.address ?? ""} T={T} isDark={isDark}
                        onConfirm={(type, qty) => { setSignSuccess({ type, qty }); setSignMode(false); }}
                        onCancel={() => setSignMode(false)} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {shareTarget && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                    onClick={() => setShareTarget(null)}>
                    <div onClick={e => e.stopPropagation()} className="absolute inset-x-0 bottom-0">
                      <ShareDrawer item={shareTarget} address={currentStop?.address ?? ""} onClose={() => setShareTarget(null)} T={T} isDark={isDark} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 overflow-y-auto px-5 pb-6 min-h-0">
                <AnimatePresence mode="wait" custom={slideDir}>
                  <motion.div key={wizardStep} custom={slideDir} variants={slide} initial="enter" animate="center" exit="exit" className="pt-2">
                    {wizardStep === "door" && <StepDoor />}
                    {wizardStep === "household" && <StepHousehold />}
                    {wizardStep === "questions" && <StepQuestions />}
                    {wizardStep === "extras" && <StepExtras />}
                    {wizardStep === "summary" && <StepSummary />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  /* ─── MISSION PICKER / COMMAND CENTER ─── */
  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: T.bg }}>
      <div className="h-14 flex items-center px-5 justify-between flex-shrink-0 border-b z-20"
        style={{ backgroundColor: T.overlay, borderColor: T.border }}>
        <div className="flex items-center gap-2">
          <Crosshair size={20} style={{ color: T.accent, filter: isDark ? `drop-shadow(0 0 12px ${T.accent})` : undefined }} />
          <div>
            <div className="font-black uppercase tracking-tighter leading-none text-sm" style={{ color: T.text }}>Poll City</div>
            <div className="text-[7px] font-bold uppercase tracking-widest" style={{ color: T.muted }}>Campaign Staff · Apr 2026</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle isDark={isDark} setIsDark={setIsDark} T={T} />
          {candidateOnStreet && (
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-1 px-2 py-1 rounded-full"
              style={{ backgroundColor: "rgba(255,159,10,0.15)", border: "1px solid rgba(255,159,10,0.5)" }}>
              <BellRing size={10} style={{ color: "#FF9F0A" }} />
              <span className="text-[8px] font-black uppercase" style={{ color: "#FF9F0A" }}>Candidate On Field</span>
            </motion.div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.4)" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#00E676" }} />
            <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: "#00E676" }}>Live</span>
          </div>
        </div>
      </div>

      <div className="flex p-1.5 mx-4 mt-3 rounded-xl mb-2 flex-shrink-0" style={{ backgroundColor: T.tabBg, border: `1px solid ${T.border}` }}>
        {[
          { id: "field", label: "Field Ops", icon: Target },
          { id: "command", label: "War Room", icon: Database },
        ].map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id as "field" | "command")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
            style={{ backgroundColor: mainTab === t.id ? (isDark ? "rgba(0,229,255,0.18)" : "rgba(25,118,210,0.12)") : "transparent", color: mainTab === t.id ? T.accent : T.muted, border: mainTab === t.id ? `1px solid ${T.borderB}` : "1px solid transparent" }}>
            <t.icon size={11} />{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {mainTab === "field" ? (
            <motion.div key="field" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full overflow-y-auto px-4 pb-24 space-y-3 pt-2">
              <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 mb-2" style={{ color: T.sub }}>
                <Zap size={11} style={{ color: "#FFD600" }} />
                Deployments · {ALL_STOPS.length} households
                {liveMissions && <span className="text-[7px] px-1.5 py-0.5 rounded font-black uppercase" style={{ backgroundColor: "rgba(0,230,118,0.12)", color: "#00E676", border: "1px solid rgba(0,230,118,0.3)" }}>Live</span>}
              </div>
              {displayMissions.map(mission => (
                <div key={mission.id} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                  <div className="flex gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: T.input, border: `1px solid ${T.border}` }}>
                      {mission.type === "lit-drop" ? <BookOpen size={16} style={{ color: T.accent }} /> : <Home size={16} style={{ color: T.accent }} />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black uppercase tracking-tight leading-tight text-sm" style={{ color: T.text }}>{mission.name}</h3>
                      <div className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1 flex-wrap" style={{ color: T.muted }}>
                        <span className="flex items-center gap-1">
                          {mission.type === "lit-drop"
                            ? <><BookOpen size={8} /> Lit Drop</>
                            : <><Home size={8} /> Canvass</>}
                        </span>
                        <span>·</span>
                        <span>{mission.doors} Doors</span>
                        <span>·</span>
                        <span style={{ color: T.accent }}>{mission.routing}</span>
                        {mission.type === "lit-drop" && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(255,214,0,0.1)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.25)" }}>
                            <Rocket size={7} /> Fast Mode
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: T.border }}>
                    <div className="flex gap-2">
                      <span className="text-[8px] font-black uppercase px-2 py-1 rounded"
                        style={{ backgroundColor: mission.priority === "Critical" ? "rgba(255,59,48,0.1)" : "rgba(41,121,255,0.1)", color: mission.priority === "Critical" ? "#FF3B30" : T.accentB, border: `1px solid ${mission.priority === "Critical" ? "rgba(255,59,48,0.3)" : T.border}` }}>
                        {mission.priority}
                      </span>
                      <span className="text-[8px] font-black uppercase px-2 py-1 rounded" style={{ backgroundColor: "rgba(255,214,0,0.1)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.3)" }}>
                        {mission.reward}
                      </span>
                    </div>
                    <button onClick={() => acceptMission(mission)}
                      className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all active:scale-95"
                      style={{ backgroundColor: T.accent, color: "#050A1F", boxShadow: isDark ? `0 0 12px ${T.accent}40` : undefined }}>
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="command" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
              <CommandCenter T={T} isDark={isDark} setIsDark={setIsDark}
                campaignFields={campaignFields} setCampaignFields={setCampaignFields}
                candidateOnStreet={candidateOnStreet} setCandidateOnStreet={setCandidateOnStreet} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SocialCommand;
