/**
 * Door Wizard — Field Command + War Room v3 (full Figma port)
 * Steps: Door → Household → Survey → Extras → Summary
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft, Bell, BellRing, BookMarked, Check, CheckCircle,
  ChevronRight, FileText, Flag, Home, Share2, Star,
  TriangleAlert, UserX, X,
} from "lucide-react-native";
import { enqueue } from "../../../lib/sync";
import {
  completeStop,
  skipStop,
  submitSignRequest,
  submitVolunteerLead,
} from "../../../lib/api";
import type { Contact, CreateInteractionPayload, SupportLevel } from "../../../lib/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      "#050A1F",
  card:    "#0F1440",
  input:   "#080D2C",
  deep:    "#060B26",
  blue:    "#2979FF",
  cyan:    "#00E5FF",
  red:     "#FF3B30",
  green:   "#00C853",
  amber:   "#FFD600",
  orange:  "#FF9F0A",
  purple:  "#9C27B0",
  text:    "#F5F7FF",
  sub:     "#AAB2FF",
  muted:   "#6B72A0",
  border:  "rgba(41,121,255,0.2)",
  borderB: "rgba(0,229,255,0.3)",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const CONTACT_OUTCOMES = [
  { id: "support",   label: "Support",   color: C.green,  level: "strong_support" as SupportLevel,      meter: "━━━━━" },
  { id: "undecided", label: "Undecided", color: C.amber,  level: "undecided" as SupportLevel,           meter: "━━━╌╌" },
  { id: "soft-no",   label: "Soft No",   color: C.orange, level: "leaning_opposition" as SupportLevel,  meter: "━━╌╌╌" },
  { id: "oppose",    label: "Oppose",    color: C.red,    level: "strong_opposition" as SupportLevel,   meter: "━╌╌╌╌" },
];

const DOOR_OUTCOMES = [
  { id: "answered",  label: "Door Answered",  icon: "🟢", color: C.cyan,   hint: "Someone came to the door" },
  { id: "not-home",  label: "No Answer",      icon: "🔕", color: C.muted,  hint: "Knocked — no response" },
  { id: "special",   label: "Special Case",   icon: "⚠️", color: C.orange, hint: "DNC, moved, inaccessible…" },
];

const VOTER_NP_OPTS = [
  { id: "not-home", label: "Not Home",         icon: "🚪", color: C.muted,  hint: "Lives here, wasn't in" },
  { id: "moved",    label: "Moved Away",        icon: "🚛", color: C.orange, hint: "No longer at address" },
  { id: "deceased", label: "Deceased",          icon: "🕊️", color: C.purple, hint: "Flag for file cleanup" },
  { id: "hostile",  label: "Hostile / Refused", icon: "⛔", color: C.red,    hint: "Refused engagement" },
  { id: "wrong",    label: "Wrong File",        icon: "❓", color: C.amber,  hint: "Person not known here" },
  { id: "minor",    label: "Under 18",          icon: "🧒", color: C.green,  hint: "Not eligible — remove" },
];

const SIGN_TYPES = [
  { id: "small-lawn", label: "Small Lawn",   size: '24"×18"', desc: "Standard residential",  color: C.cyan },
  { id: "large-lawn", label: "Large Lawn",   size: '36"×24"', desc: "High-visibility corner", color: C.blue },
  { id: "corner-lot", label: "Corner Lot",   size: '48"×36"', desc: "Double-sided stake",    color: C.orange },
  { id: "window",     label: "Window Sign",  size: '8.5"×11"', desc: "Interior-facing",      color: C.amber },
  { id: "fence",      label: "Fence Mount",  size: '24"×18"', desc: "Tie-mounted to fence",  color: C.purple },
  { id: "balcony",    label: "Balcony",      size: '36"×24"', desc: "High-rise visibility",  color: C.green },
  { id: "boulevard",  label: "Boulevard",    size: '48"×36"', desc: "City approved",         color: "#E91E63" },
  { id: "banner",     label: "Banner",       size: '96"×36"', desc: "Commercial/building",   color: C.red },
];

const LIT_PIECES = [
  { id: "intro",     label: "Intro Mailer",        color: C.blue },
  { id: "economy",   label: "Economy Door Hanger", color: C.amber },
  { id: "health",    label: "Healthcare Hanger",   color: C.red },
  { id: "gotv",      label: "GOTV Card",           color: C.green },
  { id: "palm",      label: "Palm Card",           color: C.purple },
  { id: "bilingual", label: "Bilingual Flyer",     color: C.cyan },
];

const INFO_TOPICS = [
  { id: "housing",     label: "Housing",       icon: "🏠", color: C.blue },
  { id: "healthcare",  label: "Healthcare",    icon: "🏥", color: C.red },
  { id: "cost",        label: "Cost of Living",icon: "💸", color: C.orange },
  { id: "transit",     label: "Transit",       icon: "🚌", color: C.green },
  { id: "climate",     label: "Climate",       icon: "🌱", color: "#3D9B35" },
  { id: "safety",      label: "Safety",        icon: "🛡️", color: C.purple },
  { id: "seniors",     label: "Seniors",       icon: "👴", color: "#FF6B35" },
  { id: "childcare",   label: "Childcare",     icon: "👶", color: C.cyan },
  { id: "jobs",        label: "Jobs",          icon: "💼", color: C.amber },
  { id: "immigration", label: "Immigration",   icon: "🌍", color: "#E91E63" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type WizardStep = "door" | "household" | "questions" | "extras" | "summary";
type SignType = typeof SIGN_TYPES[number]["id"];

interface PersonState {
  outcome: string | null;
  notPresent: string | null;
  notes: string;
}

interface PersonEntry {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  age?: number;
  isRegistered?: boolean;
}

// ─── Step flow ─────────────────────────────────────────────────────────────
function getStepFlow(doorStatus: string | null): WizardStep[] {
  if (doorStatus === "answered") return ["door", "household", "questions", "extras", "summary"];
  return ["door", "extras", "summary"];
}

const STEP_LABELS: Record<WizardStep, string> = {
  door: "Door", household: "Voters", questions: "Survey", extras: "Actions", summary: "Wrap",
};

// ─── Step Dots ────────────────────────────────────────────────────────────────
function StepDots({ steps, current }: { steps: WizardStep[]; current: WizardStep }) {
  const idx = steps.indexOf(current);
  return (
    <View style={sd.row}>
      {steps.map((s, i) => {
        const done   = i < idx;
        const active = s === current;
        return (
          <React.Fragment key={s}>
            {i > 0 && <View style={[sd.line, { backgroundColor: done ? C.cyan : C.border }]} />}
            <View style={sd.col}>
              <View style={[sd.dot, active && sd.dotActive, done && sd.dotDone]}>
                {done
                  ? <Check size={8} color={C.cyan} strokeWidth={3} />
                  : <Text style={[sd.num, active && sd.numActive]}>{i + 1}</Text>}
              </View>
              {active && <Text style={sd.label}>{STEP_LABELS[s].toUpperCase()}</Text>}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}
const sd = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  col:      { alignItems: "center" },
  line:     { flex: 1, height: 1, maxWidth: 28 },
  dot:      { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  dotActive:{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.cyan, borderColor: C.cyan, ...Platform.select({ ios: { shadowColor: C.cyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 10 } }) },
  dotDone:  { backgroundColor: "rgba(0,229,255,0.15)", borderColor: "rgba(0,229,255,0.4)" },
  num:      { fontSize: 8, fontWeight: "900", color: C.muted },
  numActive:{ color: C.bg, fontSize: 9, fontWeight: "900" },
  label:    { fontSize: 7, fontWeight: "900", color: C.cyan, letterSpacing: 1, marginTop: 2 },
});

// ─── Person Card ──────────────────────────────────────────────────────────────
// 3-state: pending (collapsed) → active (expanded) → done (marked+collapsed)
function PersonCard({
  person, state, isActive, onActivate, onMarkDone, onChange,
}: {
  person: PersonEntry;
  state: PersonState;
  isActive: boolean;
  onActivate: () => void;
  onMarkDone: () => void;
  onChange: (s: PersonState) => void;
}) {
  const [showNP, setShowNP] = useState(false);
  const initials = `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase();
  const outcome  = CONTACT_OUTCOMES.find(o => o.id === state.outcome);
  const npOpt    = VOTER_NP_OPTS.find(o => o.id === state.notPresent);
  const isMarked = !!state.outcome || !!state.notPresent;
  const badgeColor = outcome?.color ?? npOpt?.color ?? C.muted;

  if (!isActive) {
    return (
      <Pressable
        style={[pc.collapsed, isMarked && { borderColor: `${badgeColor}45`, backgroundColor: `${badgeColor}0A` }]}
        onPress={onActivate}
      >
        <View style={[pc.avatar, { borderColor: isMarked ? `${badgeColor}60` : C.blue }]}>
          <Text style={pc.avatarText}>{initials}</Text>
          {isMarked && (
            <View style={[pc.doneBadge, { backgroundColor: badgeColor }]}>
              <Check size={7} color={C.bg} strokeWidth={3} />
            </View>
          )}
        </View>
        <View style={pc.collapsedInfo}>
          <Text style={pc.collapsedName}>{person.firstName} {person.lastName}</Text>
          <View style={pc.collapsedMeta}>
            {person.age ? <Text style={pc.collapsedSub}>Age {person.age}</Text> : null}
            {person.isRegistered === false && (
              <Text style={pc.unregBadge}>⚠ Unregistered</Text>
            )}
          </View>
        </View>
        {isMarked ? (
          <View style={[pc.outcomePill, { backgroundColor: `${badgeColor}20`, borderColor: `${badgeColor}45` }]}>
            <Text style={[pc.outcomePillText, { color: badgeColor }]}>
              {npOpt?.icon ?? ""} {outcome?.label ?? npOpt?.label}
            </Text>
          </View>
        ) : (
          <View style={pc.recordCta}>
            <Text style={pc.recordCtaText}>Record</Text>
            <ChevronRight size={12} color={C.cyan} />
          </View>
        )}
      </Pressable>
    );
  }

  // Expanded
  return (
    <View style={[pc.expanded, isMarked && { borderColor: `${badgeColor}55` }]}>
      {/* Header */}
      <View style={pc.expandedHeader}>
        <View style={[pc.avatarLg, Platform.select({ ios: { shadowColor: C.blue, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8 } })]}>
          <Text style={pc.avatarLgText}>{initials}</Text>
        </View>
        <View style={pc.expandedHeaderInfo}>
          <Text style={pc.expandedName}>{person.firstName} {person.lastName}</Text>
          <View style={pc.expandedMeta}>
            {person.age ? <Text style={pc.expandedSub}>Age {person.age}</Text> : null}
            {person.phone ? <Text style={pc.expandedSub}>{person.phone}</Text> : null}
          </View>
        </View>
        <Pressable style={pc.closeBtn} onPress={onMarkDone} hitSlop={8}>
          <X size={13} color={C.muted} />
        </Pressable>
      </View>

      {/* Unregistered alert */}
      {person.isRegistered === false && (
        <View style={pc.unregAlert}>
          <TriangleAlert size={11} color={C.orange} />
          <Text style={pc.unregAlertText}>Not registered — flag for GOTV list</Text>
        </View>
      )}

      {/* Outcome grid */}
      <View style={pc.section}>
        <Text style={pc.sectionLabel}>{person.firstName}'s stance at the door?</Text>
        <View style={pc.outcomeGrid}>
          {CONTACT_OUTCOMES.map(o => {
            const sel = state.outcome === o.id;
            return (
              <Pressable
                key={o.id}
                style={[pc.outcomeBtn, sel && { backgroundColor: `${o.color}20`, borderColor: o.color, ...Platform.select({ ios: { shadowColor: o.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 10 } }) }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const next = sel ? null : o.id;
                  onChange({ ...state, outcome: next, notPresent: next ? null : state.notPresent });
                }}
              >
                {sel && <CheckCircle size={12} color={o.color} style={pc.outcomeTick} />}
                <View style={[pc.outcomeDot, { backgroundColor: o.color }]} />
                <Text style={[pc.outcomeLabel, { color: sel ? o.color : C.text }]}>{o.label}</Text>
                <Text style={[pc.outcomeMeter, { color: sel ? `${o.color}80` : C.muted }]}>{o.meter}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Not at door */}
      <Pressable
        style={[pc.npToggle, (showNP || state.notPresent) && pc.npToggleActive]}
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowNP(p => !p); }}
      >
        <UserX size={10} color={state.notPresent ? C.orange : C.muted} />
        <Text style={[pc.npToggleText, state.notPresent && { color: C.orange }]}>
          {state.notPresent ? `${npOpt?.icon} ${npOpt?.label}` : "Not at Door / Special Case"}
        </Text>
        <ChevronRight size={10} color={C.muted} style={showNP ? { transform: [{ rotate: "90deg" }] } : undefined} />
      </Pressable>

      {showNP && (
        <View style={pc.npGrid}>
          {VOTER_NP_OPTS.map(np => {
            const sel = state.notPresent === np.id;
            return (
              <Pressable
                key={np.id}
                style={[pc.npBtn, sel && { backgroundColor: `${np.color}18`, borderColor: np.color }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const next = sel ? null : np.id;
                  onChange({ ...state, notPresent: next, outcome: next ? null : state.outcome });
                  if (!sel) { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowNP(false); }
                }}
              >
                <Text style={pc.npIcon}>{np.icon}</Text>
                <View style={pc.npInfo}>
                  <Text style={[pc.npLabel, sel && { color: np.color }]}>{np.label}</Text>
                  <Text style={pc.npHint}>{np.hint}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Notes */}
      <View style={pc.notesWrap}>
        <TextInput
          style={pc.notesInput}
          placeholder={`Quick note about ${person.firstName}…`}
          placeholderTextColor={C.muted}
          value={state.notes}
          onChangeText={v => onChange({ ...state, notes: v })}
          multiline
        />
      </View>

      {/* Done CTA */}
      {isMarked && (
        <Pressable style={[pc.doneBtn, { backgroundColor: `${badgeColor}20`, borderColor: `${badgeColor}55` }]} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onMarkDone(); }}>
          <CheckCircle size={13} color={badgeColor} />
          <Text style={[pc.doneBtnText, { color: badgeColor }]}>
            {person.firstName} Recorded · Next Voter
          </Text>
        </Pressable>
      )}
    </View>
  );
}
const pc = StyleSheet.create({
  collapsed:     { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: C.border, backgroundColor: "rgba(41,121,255,0.04)", marginBottom: 10 },
  avatar:        { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(41,121,255,0.18)", borderWidth: 1.5, alignItems: "center", justifyContent: "center", position: "relative" },
  avatarText:    { fontSize: 15, fontWeight: "800", color: C.cyan, letterSpacing: 1 },
  doneBadge:     { position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
  collapsedInfo: { flex: 1 },
  collapsedName: { fontSize: 14, fontWeight: "800", color: C.text },
  collapsedMeta: { flexDirection: "row", gap: 8, marginTop: 2 },
  collapsedSub:  { fontSize: 10, color: C.muted },
  unregBadge:    { fontSize: 10, fontWeight: "800", color: C.orange },
  outcomePill:   { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1 },
  outcomePillText:{ fontSize: 9, fontWeight: "800" },
  recordCta:     { flexDirection: "row", alignItems: "center", gap: 2 },
  recordCtaText: { fontSize: 10, fontWeight: "900", color: C.cyan },

  expanded:        { borderRadius: 18, borderWidth: 2, borderColor: C.borderB, backgroundColor: C.card, marginBottom: 12, overflow: "hidden" },
  expandedHeader:  { flexDirection: "row", alignItems: "center", padding: 14, paddingBottom: 10 },
  avatarLg:        { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(41,121,255,0.2)", borderWidth: 1.5, borderColor: C.blue, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarLgText:    { fontSize: 17, fontWeight: "900", color: C.cyan, letterSpacing: 1 },
  expandedHeaderInfo:{ flex: 1 },
  expandedName:    { fontSize: 16, fontWeight: "900", color: C.text },
  expandedMeta:    { flexDirection: "row", gap: 10, marginTop: 2 },
  expandedSub:     { fontSize: 10, color: C.muted },
  closeBtn:        { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },

  unregAlert:    { marginHorizontal: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, backgroundColor: "rgba(255,159,10,0.08)", borderWidth: 1, borderColor: "rgba(255,159,10,0.3)" },
  unregAlertText:{ flex: 1, fontSize: 10, fontWeight: "700", color: C.orange },

  section:      { paddingHorizontal: 14, paddingBottom: 12 },
  sectionLabel: { fontSize: 9, fontWeight: "900", color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 },
  outcomeGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  outcomeBtn:   { width: "47%", paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: "rgba(41,121,255,0.05)", position: "relative" },
  outcomeTick:  { position: "absolute", top: 7, right: 8 },
  outcomeDot:   { width: 10, height: 10, borderRadius: 5, marginBottom: 8 },
  outcomeLabel: { fontSize: 13, fontWeight: "900", color: C.text, marginBottom: 4 },
  outcomeMeter: { fontSize: 9, letterSpacing: 2 },

  npToggle:       { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.border },
  npToggleActive: { backgroundColor: "rgba(255,159,10,0.05)" },
  npToggleText:   { flex: 1, fontSize: 10, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  npGrid:         { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  npBtn:          { width: "47%", flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.input },
  npIcon:         { fontSize: 16, lineHeight: 20 },
  npInfo:         { flex: 1 },
  npLabel:        { fontSize: 10, fontWeight: "800", color: C.sub },
  npHint:         { fontSize: 8, color: C.muted, marginTop: 2 },

  notesWrap:  { paddingHorizontal: 14, paddingBottom: 10 },
  notesInput: { backgroundColor: C.input, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 12, color: C.text, minHeight: 52 },

  doneBtn:     { margin: 14, marginTop: 4, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  doneBtnText: { fontSize: 11, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" },
});

// ─── Sign Picker ──────────────────────────────────────────────────────────────
type SignPickerStep = "pick" | "confirm";
function SignPicker({ onConfirm, onCancel }: {
  onConfirm: (type: SignType, qty: number, note: string) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<SignPickerStep>("pick");
  const [sel, setSel] = useState<SignType | null>(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const cfg = SIGN_TYPES.find(t => t.id === sel);

  if (step === "confirm" && cfg) {
    return (
      <View style={sp.wrap}>
        <View style={[sp.confirmCard, { borderColor: `${cfg.color}50`, backgroundColor: `${cfg.color}10` }]}>
          <Text style={[sp.confirmTitle, { color: cfg.color }]}>{cfg.label} × {qty}</Text>
          <Text style={sp.confirmSub}>{cfg.size} · {cfg.desc}</Text>
          {note ? <Text style={sp.confirmNote}>"{note}"</Text> : null}
        </View>
        <View style={sp.confirmBtns}>
          <Pressable style={sp.editBtn} onPress={() => setStep("pick")}>
            <Text style={sp.editBtnText}>Edit</Text>
          </Pressable>
          <Pressable style={sp.logBtn} onPress={() => onConfirm(sel!, qty, note)}>
            <CheckCircle size={13} color={C.bg} />
            <Text style={sp.logBtnText}>LOG REQUEST</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={sp.wrap}>
      <Pressable style={sp.backRow} onPress={onCancel} hitSlop={8}>
        <ArrowLeft size={14} color={C.muted} />
        <Text style={sp.backText}>SIGN REQUEST</Text>
      </Pressable>
      <View style={sp.grid}>
        {SIGN_TYPES.map(t => {
          const s = sel === t.id;
          return (
            <Pressable
              key={t.id}
              style={[sp.typeBtn, s && { backgroundColor: `${t.color}18`, borderColor: t.color }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSel(s ? null : t.id as SignType); }}
            >
              {s && <Check size={10} color={t.color} style={sp.typeTick} />}
              <Flag size={16} color={s ? t.color : C.muted} style={{ marginBottom: 4 }} />
              <Text style={[sp.typeLabel, { color: s ? t.color : C.sub }]}>{t.label}</Text>
              <Text style={sp.typeDesc}>{t.size}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Qty */}
      <View style={sp.qtyRow}>
        <Text style={sp.qtyLabel}>QUANTITY</Text>
        <View style={sp.qtyControls}>
          <Pressable style={sp.qtyBtn} onPress={() => setQty(q => Math.max(1, q - 1))}>
            <Text style={sp.qtyBtnText}>−</Text>
          </Pressable>
          <Text style={sp.qtyValue}>{qty}</Text>
          <Pressable style={sp.qtyBtn} onPress={() => setQty(q => Math.min(10, q + 1))}>
            <Text style={sp.qtyBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      <TextInput
        style={sp.noteInput}
        placeholder="Install notes (optional)…"
        placeholderTextColor={C.muted}
        value={note}
        onChangeText={setNote}
      />

      <Pressable
        style={[sp.reviewBtn, !sel && sp.reviewBtnDisabled]}
        disabled={!sel}
        onPress={() => { if (sel) setStep("confirm"); }}
      >
        <Text style={[sp.reviewBtnText, !sel && sp.reviewBtnTextDisabled]}>REVIEW REQUEST →</Text>
      </Pressable>
    </View>
  );
}
const sp = StyleSheet.create({
  wrap:          { marginTop: 10 },
  backRow:       { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  backText:      { fontSize: 9, fontWeight: "900", color: C.orange, letterSpacing: 2 },
  grid:          { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  typeBtn:       { width: "47%", padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.input, position: "relative" },
  typeTick:      { position: "absolute", top: 8, right: 8 },
  typeLabel:     { fontSize: 10, fontWeight: "800", marginTop: 4 },
  typeDesc:      { fontSize: 8, color: C.muted, marginTop: 2 },
  qtyRow:        { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  qtyLabel:      { flex: 1, fontSize: 9, fontWeight: "900", color: C.muted, letterSpacing: 2 },
  qtyControls:   { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn:        { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(0,229,255,0.12)", borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  qtyBtnText:    { fontSize: 18, fontWeight: "800", color: C.sub },
  qtyValue:      { fontSize: 18, fontWeight: "900", color: C.text, width: 28, textAlign: "center" },
  noteInput:     { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 13, color: C.text, marginBottom: 12 },
  reviewBtn:     { backgroundColor: C.orange, borderRadius: 14, paddingVertical: 16, alignItems: "center", ...Platform.select({ ios: { shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 } }) },
  reviewBtnDisabled: { backgroundColor: "rgba(255,159,10,0.18)" },
  reviewBtnText: { fontSize: 12, fontWeight: "900", color: C.bg, letterSpacing: 2 },
  reviewBtnTextDisabled: { color: C.muted },
  confirmCard:   { borderRadius: 14, padding: 16, borderWidth: 1.5, marginBottom: 12 },
  confirmTitle:  { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  confirmSub:    { fontSize: 11, color: C.sub },
  confirmNote:   { fontSize: 11, fontStyle: "italic", color: C.muted, marginTop: 8 },
  confirmBtns:   { flexDirection: "row", gap: 10 },
  editBtn:       { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  editBtnText:   { fontSize: 12, fontWeight: "800", color: C.sub },
  logBtn:        { flex: 2, paddingVertical: 14, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.orange, ...Platform.select({ ios: { shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 } }) },
  logBtnText:    { fontSize: 12, fontWeight: "900", color: C.bg, letterSpacing: 1.5 },
});

// ─── Candidate Bell ───────────────────────────────────────────────────────────
function CandidateBell({ candidateOnStreet, notifSent, onPing }: {
  candidateOnStreet: boolean; notifSent: boolean; onPing: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (candidateOnStreet && !notifSent) {
      const anim = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]));
      anim.start();
      return () => anim.stop();
    }
  }, [candidateOnStreet, notifSent, pulse]);

  return (
    <View style={[cb.card, { borderColor: candidateOnStreet ? (notifSent ? "rgba(0,200,83,0.5)" : "rgba(255,159,10,0.5)") : C.border, opacity: candidateOnStreet ? 1 : 0.65 }]}>
      <View style={[cb.iconWrap, { backgroundColor: candidateOnStreet ? (notifSent ? "rgba(0,200,83,0.15)" : "rgba(255,159,10,0.15)") : "rgba(255,255,255,0.05)" }]}>
        {notifSent
          ? <BellRing size={18} color={C.green} />
          : <Bell size={18} color={candidateOnStreet ? C.orange : C.muted} />}
        {candidateOnStreet && !notifSent && (
          <Animated.View style={[cb.pulse, { transform: [{ scale: pulse }] }]} />
        )}
      </View>
      <View style={cb.info}>
        <Text style={[cb.title, !candidateOnStreet && { color: C.muted }]}>
          {candidateOnStreet ? "🟢 Candidate On Street" : "🔒 Candidate Not On Field"}
        </Text>
        <Text style={cb.sub}>
          {notifSent ? "Candidate notified — heading over" : candidateOnStreet ? "Voter wants to meet — ping now" : "Unlocks when candidate checks in"}
        </Text>
      </View>
      {candidateOnStreet && !notifSent && (
        <Pressable style={cb.pingBtn} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onPing(); }}>
          <Text style={cb.pingText}>Ping!</Text>
        </Pressable>
      )}
      {notifSent && (
        <View style={cb.sentBadge}>
          <Check size={10} color={C.green} />
          <Text style={cb.sentText}>Sent</Text>
        </View>
      )}
    </View>
  );
}
const cb = StyleSheet.create({
  card:     { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, backgroundColor: C.card },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", position: "relative" },
  pulse:    { position: "absolute", top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: C.orange },
  info:     { flex: 1 },
  title:    { fontSize: 11, fontWeight: "900", color: C.text },
  sub:      { fontSize: 9, color: C.muted, marginTop: 2 },
  pingBtn:  { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: C.orange, ...Platform.select({ ios: { shadowColor: C.orange, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 } }) },
  pingText: { fontSize: 11, fontWeight: "900", color: C.bg },
  sentBadge:{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(0,200,83,0.12)", borderWidth: 1, borderColor: "rgba(0,200,83,0.4)" },
  sentText: { fontSize: 9, fontWeight: "800", color: C.green },
});

// ─── Lit + Interests Panel ────────────────────────────────────────────────────
function LitAndInterestsPanel({ selectedLit, setSelectedLit, infoTopics, setInfoTopics }: {
  selectedLit: string | null; setSelectedLit: (v: string | null) => void;
  infoTopics: string[];       setInfoTopics: (v: string[]) => void;
}) {
  const [tab, setTab] = useState<"lit" | "interests">("lit");

  return (
    <View style={li.wrap}>
      {/* Tabs */}
      <View style={li.tabRow}>
        {([["lit", "Lit Piece Left", FileText], ["interests", "Voter Interests", Star]] as const).map(([id, label, Icon]) => (
          <Pressable key={id} style={[li.tab, tab === id && li.tabActive]} onPress={() => setTab(id)}>
            <Icon size={10} color={tab === id ? C.cyan : C.muted} />
            <Text style={[li.tabText, tab === id && li.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "lit" ? (
        <View style={li.body}>
          <Text style={li.hint}>Select the piece you left at this door.</Text>
          <View style={li.litGrid}>
            {LIT_PIECES.map(lp => {
              const sel = selectedLit === lp.id;
              return (
                <Pressable key={lp.id} style={[li.litBtn, sel && { backgroundColor: `${lp.color}18`, borderColor: lp.color }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedLit(sel ? null : lp.id); }}>
                  <View style={[li.litDot, { backgroundColor: lp.color }]} />
                  <Text style={[li.litLabel, { color: sel ? lp.color : C.sub }]} numberOfLines={2}>{lp.label}</Text>
                  {sel && <Check size={10} color={lp.color} />}
                </Pressable>
              );
            })}
          </View>
          {selectedLit && (
            <View style={li.shareRow}>
              <Share2 size={12} color={C.cyan} />
              <Text style={li.shareText}>Send info to voter via Poll City Social</Text>
              <View style={[li.shareBadge, { backgroundColor: "rgba(0,229,255,0.12)", borderColor: C.borderB }]}>
                <Text style={li.shareBadgeText}>Ready</Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={li.body}>
          <Text style={li.hint}>What topics did the voter want more info on?</Text>
          <View style={li.topicGrid}>
            {INFO_TOPICS.map(t => {
              const sel = infoTopics.includes(t.id);
              return (
                <Pressable key={t.id} style={[li.topicBtn, sel && { backgroundColor: `${t.color}18`, borderColor: t.color }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setInfoTopics(sel ? infoTopics.filter(x => x !== t.id) : [...infoTopics, t.id]); }}>
                  <Text style={li.topicIcon}>{t.icon}</Text>
                  <Text style={[li.topicLabel, { color: sel ? t.color : C.sub }]}>{t.label}</Text>
                  {sel && <Check size={9} color={t.color} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
const li = StyleSheet.create({
  wrap:       { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  tabRow:     { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border },
  tab:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive:  { borderBottomColor: C.cyan },
  tabText:    { fontSize: 9, fontWeight: "900", color: C.muted, textTransform: "uppercase", letterSpacing: 1 },
  tabTextActive:{ color: C.cyan },
  body:       { padding: 14 },
  hint:       { fontSize: 9, color: C.muted, marginBottom: 10 },
  litGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  litBtn:     { width: "47%", flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.input },
  litDot:     { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  litLabel:   { flex: 1, fontSize: 9, fontWeight: "800" },
  shareRow:   { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.borderB, backgroundColor: "rgba(0,229,255,0.05)" },
  shareText:  { flex: 1, fontSize: 9, color: C.sub },
  shareBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  shareBadgeText:{ fontSize: 8, fontWeight: "900", color: C.cyan },
  topicGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topicBtn:   { width: "47%", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.input },
  topicIcon:  { fontSize: 14 },
  topicLabel: { flex: 1, fontSize: 9, fontWeight: "800" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DoorWizardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    contactJson?: string;
    stopId?: string;
    campaignId?: string;
  }>();

  const contact = React.useMemo<PersonEntry>(() => {
    if (params.contactJson) {
      try {
        const c = JSON.parse(params.contactJson) as Contact;
        return { id: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone };
      } catch { /**/ }
    }
    return { id: params.id, firstName: "Unknown", lastName: "Resident" };
  }, [params.contactJson, params.id]);

  // ── State ─────────────────────────────────────────────────────────────
  const [doorStatus,    setDoorStatus]    = useState<string | null>(null);
  const [personStates,  setPersonStates]  = useState<Record<string, PersonState>>({
    [contact.id]: { outcome: null, notPresent: null, notes: "" },
  });
  const [activePersonId, setActivePersonId] = useState<string>(contact.id);
  const [notes,         setNotes]         = useState("");
  const [infoTopics,    setInfoTopics]    = useState<string[]>([]);
  const [selectedLit,   setSelectedLit]   = useState<string | null>(null);
  const [wantsSign,     setWantsSign]     = useState(false);
  const [signLogged,    setSignLogged]    = useState(false);
  const [signSummary,   setSignSummary]   = useState<{ type: SignType; qty: number } | null>(null);
  const [wantsVolunteer, setWantsVolunteer] = useState(false);
  const [followUp,      setFollowUp]      = useState(false);
  const [candidatePinged, setCandidatePinged] = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [countdown,     setCountdown]     = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didEnqueue = useRef(false);

  const stepFlow  = getStepFlow(doorStatus);
  const [step, setStep] = useState<WizardStep>("door");

  const stepIndex = stepFlow.indexOf(step);
  const personState = personStates[contact.id] ?? { outcome: null, notPresent: null, notes: "" };
  const outcome = CONTACT_OUTCOMES.find(o => o.id === personState.outcome);
  const npOpt   = VOTER_NP_OPTS.find(o => o.id === personState.notPresent);

  // ── Navigation ────────────────────────────────────────────────────────
  const next = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextStep = stepFlow[stepIndex + 1];
    if (nextStep) setStep(nextStep);
  }, [stepFlow, stepIndex]);

  const back = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stepIndex === 0) { router.back(); return; }
    setStep(stepFlow[stepIndex - 1]);
  }, [stepFlow, stepIndex, router]);

  // When door status changes, re-derive the step flow
  useEffect(() => {
    if (doorStatus && step === "door") {
      // stay on door step until they tap Next
    }
  }, [doorStatus, step]);

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitted(true);
    setCountdown(10);
    timerRef.current = setInterval(() => {
      setCountdown(p => { if (p <= 1) return 0; return p - 1; });
    }, 1000);
  }, []);

  useEffect(() => {
    if (submitted && countdown <= 0 && !didEnqueue.current) {
      didEnqueue.current = true;
      if (timerRef.current) clearInterval(timerRef.current);

      const parts: string[] = [];
      if (doorStatus === "not-home") parts.push("No answer");
      if (doorStatus === "special")  parts.push("Special case");
      if (npOpt)       parts.push(`${npOpt.label}: ${npOpt.hint}`);
      if (infoTopics.length) parts.push(`Topics: ${infoTopics.join(", ")}`);
      if (selectedLit) parts.push(`Lit: ${LIT_PIECES.find(l => l.id === selectedLit)?.label}`);
      if (notes.trim()) parts.push(notes.trim());
      if (personState.notes.trim()) parts.push(personState.notes.trim());

      const notesText = parts.join(" · ") || undefined;
      const cid = params.campaignId;

      // Enqueue to legacy interactions endpoint (offline-safe)
      const payload: CreateInteractionPayload = {
        contactId:         params.id,
        type:              "door_knock",
        supportLevel:      outcome?.level ?? "unknown",
        notes:             notesText,
        signRequested:     wantsSign && signLogged,
        volunteerInterest: wantsVolunteer,
        followUpNeeded:    followUp,
        issues:            infoTopics,
        source:            "canvass",
      };
      enqueue("/api/interactions", "POST", payload).catch(() => {});

      // Call new canvasser endpoints directly when campaignId + stopId are available
      if (cid && params.stopId) {
        completeStop(params.stopId, {
          campaignId: cid,
          supportLevel: outcome?.level,
          notes: notesText,
          issues: infoTopics,
          signRequested: wantsSign && signLogged,
          volunteerInterest: wantsVolunteer,
          followUpNeeded: followUp,
        }).catch(() => {});
      }

      if (cid && wantsSign && signLogged) {
        submitSignRequest({
          campaignId: cid,
          contactId: params.id,
          signType: signSummary?.type ?? undefined,
          quantity: signSummary?.qty ?? 1,
        }).catch(() => {});
      }

      if (cid && wantsVolunteer) {
        submitVolunteerLead(cid, params.id).catch(() => {});
      }

      router.back();
    }
  }, [submitted, countdown, params.id, params.stopId, params.campaignId, outcome, npOpt, doorStatus, notes, infoTopics, selectedLit, personState.notes, wantsSign, signLogged, signSummary, wantsVolunteer, followUp, router]);

  const handleUndo = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(false);
    setCountdown(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const canNext = step !== "door" || !!doorStatus;

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable style={s.backBtn} onPress={back} hitSlop={8}>
          <ArrowLeft size={18} color={C.cyan} />
        </Pressable>
        <View style={s.topCenter}>
          <Text style={s.topStep}>{STEP_LABELS[step].toUpperCase()}</Text>
          <Text style={s.topAddress} numberOfLines={1}>
            {(params.contactJson ? JSON.parse(params.contactJson) as Contact : null)?.address1
              ?? `${contact.firstName} ${contact.lastName}`}
          </Text>
        </View>
        <View style={s.backBtn} />
      </View>

      {/* Step dots */}
      <StepDots steps={stepFlow} current={step} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ══ DOOR ══════════════════════════════════════════════════════ */}
        {step === "door" && (
          <View>
            <View style={s.addressCard}>
              <View style={s.addressIcon}><Home size={20} color={C.cyan} /></View>
              <View style={s.addressInfo}>
                <Text style={s.addressMain}>
                  {(params.contactJson ? JSON.parse(params.contactJson) as Contact : null)?.address1 ?? "Unknown Address"}
                </Text>
                <Text style={s.addressSub}>{contact.firstName} {contact.lastName}</Text>
              </View>
            </View>
            <Text style={s.sectionLabel}>DOOR STATUS</Text>
            <View style={s.doorGrid}>
              {DOOR_OUTCOMES.map(d => {
                const sel = doorStatus === d.id;
                return (
                  <Pressable key={d.id} style={[s.doorBtn, sel && { backgroundColor: `${d.color}18`, borderColor: d.color }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setDoorStatus(sel ? null : d.id); }}>
                    <Text style={s.doorIcon}>{d.icon}</Text>
                    <View style={s.doorInfo}>
                      <Text style={[s.doorLabel, { color: sel ? d.color : C.text }]}>{d.label}</Text>
                      <Text style={s.doorHint}>{d.hint}</Text>
                    </View>
                    {sel && <CheckCircle size={16} color={d.color} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ══ HOUSEHOLD ════════════════════════════════════════════════ */}
        {step === "household" && (
          <View>
            <Text style={s.sectionLabel}>VOTERS AT THIS DOOR</Text>
            <PersonCard
              person={contact}
              state={personStates[contact.id] ?? { outcome: null, notPresent: null, notes: "" }}
              isActive={activePersonId === contact.id}
              onActivate={() => setActivePersonId(contact.id)}
              onMarkDone={() => setActivePersonId("")}
              onChange={st => setPersonStates(p => ({ ...p, [contact.id]: st }))}
            />
          </View>
        )}

        {/* ══ SURVEY ═══════════════════════════════════════════════════ */}
        {step === "questions" && (
          <View>
            <LitAndInterestsPanel
              selectedLit={selectedLit}
              setSelectedLit={setSelectedLit}
              infoTopics={infoTopics}
              setInfoTopics={setInfoTopics}
            />
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>CANVASSER NOTES</Text>
            <TextInput
              style={s.notesInput}
              placeholder="Anything else the campaign should know…"
              placeholderTextColor={C.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        )}

        {/* ══ EXTRAS ═══════════════════════════════════════════════════ */}
        {step === "extras" && (
          <View>
            {/* Sign Request */}
            <View style={s.toggleCard}>
              <View style={s.toggleRow}>
                <View style={s.toggleLeft}>
                  <Flag size={16} color={wantsSign ? C.orange : C.muted} />
                  <View style={s.toggleInfo}>
                    <Text style={[s.toggleLabel, wantsSign && { color: C.orange }]}>Lawn Sign Request</Text>
                    <Text style={s.toggleSub}>Added to sign queue</Text>
                  </View>
                </View>
                <Switch value={wantsSign} onValueChange={v => { setWantsSign(v); if (!v) { setSignLogged(false); setSignSummary(null); }; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  trackColor={{ false: C.border, true: `${C.orange}80` }} thumbColor={wantsSign ? C.orange : C.muted} ios_backgroundColor={C.card} />
              </View>
              {wantsSign && !signLogged && (
                <View style={s.signPickerWrap}>
                  <SignPicker
                    onConfirm={(type, qty, note) => { setSignSummary({ type, qty }); setSignLogged(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                    onCancel={() => setWantsSign(false)}
                  />
                </View>
              )}
              {wantsSign && signLogged && signSummary && (
                <View style={s.signConfirmed}>
                  <CheckCircle size={14} color={C.orange} />
                  <Text style={s.signConfirmedText}>
                    {SIGN_TYPES.find(t => t.id === signSummary.type)?.label} × {signSummary.qty} — logged
                  </Text>
                  <Pressable onPress={() => { setSignLogged(false); setSignSummary(null); }}>
                    <Text style={s.signEditText}>Edit</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Volunteer */}
            <View style={s.toggleCard}>
              <View style={s.toggleRow}>
                <View style={s.toggleLeft}>
                  <CheckCircle size={16} color={wantsVolunteer ? C.cyan : C.muted} />
                  <View style={s.toggleInfo}>
                    <Text style={[s.toggleLabel, wantsVolunteer && { color: C.cyan }]}>Volunteer Interest</Text>
                    <Text style={s.toggleSub}>Flag for coordinator</Text>
                  </View>
                </View>
                <Switch value={wantsVolunteer} onValueChange={v => { setWantsVolunteer(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  trackColor={{ false: C.border, true: `${C.cyan}80` }} thumbColor={wantsVolunteer ? C.cyan : C.muted} ios_backgroundColor={C.card} />
              </View>
            </View>

            {/* Follow-up */}
            <View style={s.toggleCard}>
              <View style={s.toggleRow}>
                <View style={s.toggleLeft}>
                  <BookMarked size={16} color={followUp ? C.blue : C.muted} />
                  <View style={s.toggleInfo}>
                    <Text style={[s.toggleLabel, followUp && { color: C.blue }]}>Follow-Up Needed</Text>
                    <Text style={s.toggleSub}>Add to follow-up list</Text>
                  </View>
                </View>
                <Switch value={followUp} onValueChange={v => { setFollowUp(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  trackColor={{ false: C.border, true: `${C.blue}80` }} thumbColor={followUp ? C.blue : C.muted} ios_backgroundColor={C.card} />
              </View>
            </View>

            {/* Candidate Bell */}
            <View style={{ marginTop: 6 }}>
              <CandidateBell
                candidateOnStreet={false}
                notifSent={candidatePinged}
                onPing={() => setCandidatePinged(true)}
              />
            </View>
          </View>
        )}

        {/* ══ SUMMARY ══════════════════════════════════════════════════ */}
        {step === "summary" && !submitted && (
          <View>
            <Text style={s.sectionLabel}>REVIEW & SUBMIT</Text>

            {/* Door */}
            <View style={s.summaryCard}>
              <Text style={s.summaryCardLabel}>DOOR</Text>
              <Text style={s.summaryValue}>
                {DOOR_OUTCOMES.find(d => d.id === doorStatus)?.label ?? "Not recorded"}
              </Text>
            </View>

            {/* Voter outcome */}
            {(outcome || npOpt) && (
              <View style={[s.summaryCard, { borderColor: `${(outcome?.color ?? npOpt?.color ?? C.muted)}50` }]}>
                <Text style={s.summaryCardLabel}>VOTER OUTCOME</Text>
                <View style={s.summaryRow}>
                  {outcome && <View style={[s.summaryDot, { backgroundColor: outcome.color }]} />}
                  {npOpt && <Text style={s.summaryIcon}>{npOpt.icon}</Text>}
                  <Text style={[s.summaryValue, { color: outcome?.color ?? npOpt?.color ?? C.text }]}>
                    {outcome?.label ?? npOpt?.label}
                  </Text>
                </View>
              </View>
            )}

            {/* Topics */}
            {infoTopics.length > 0 && (
              <View style={s.summaryCard}>
                <Text style={s.summaryCardLabel}>TOPICS RAISED</Text>
                <View style={s.summaryChips}>
                  {infoTopics.map(id => {
                    const t = INFO_TOPICS.find(x => x.id === id);
                    return t ? (
                      <View key={id} style={[s.summaryChip, { borderColor: t.color, backgroundColor: `${t.color}18` }]}>
                        <Text style={[s.summaryChipText, { color: t.color }]}>{t.icon} {t.label}</Text>
                      </View>
                    ) : null;
                  })}
                </View>
              </View>
            )}

            {/* Flags */}
            {(wantsSign || wantsVolunteer || followUp) && (
              <View style={s.summaryCard}>
                <Text style={s.summaryCardLabel}>FLAGS</Text>
                {wantsSign && signSummary && (
                  <View style={s.summaryRow}>
                    <Flag size={12} color={C.orange} />
                    <Text style={[s.summaryValue, { color: C.orange }]}>
                      Sign — {SIGN_TYPES.find(t => t.id === signSummary.type)?.label} × {signSummary.qty}
                    </Text>
                  </View>
                )}
                {wantsVolunteer && (
                  <View style={s.summaryRow}>
                    <CheckCircle size={12} color={C.cyan} />
                    <Text style={[s.summaryValue, { color: C.cyan }]}>Volunteer Interest</Text>
                  </View>
                )}
                {followUp && (
                  <View style={s.summaryRow}>
                    <BookMarked size={12} color={C.blue} />
                    <Text style={[s.summaryValue, { color: C.blue }]}>Follow-Up Needed</Text>
                  </View>
                )}
              </View>
            )}

            <Pressable style={({ pressed }) => [s.submitBtn, pressed && s.submitBtnPressed]} onPress={handleSubmit}>
              <CheckCircle size={18} color={C.bg} />
              <Text style={s.submitBtnText}>SUBMIT INTERACTION</Text>
            </Pressable>
          </View>
        )}

        {/* Undo countdown */}
        {submitted && countdown > 0 && (
          <View style={s.undoBanner}>
            <View style={s.undoLeft}>
              <CheckCircle size={18} color={C.green} />
              <View>
                <Text style={s.undoTitle}>Saved! Closing in {countdown}s…</Text>
                <Text style={s.undoSub}>{outcome?.label ?? npOpt?.label ?? "Interaction recorded"}</Text>
              </View>
            </View>
            <Pressable style={s.undoBtn} onPress={handleUndo}>
              <Text style={s.undoBtnText}>UNDO</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Footer CTA */}
      {step !== "summary" && !submitted && (
        <View style={s.footer}>
          <Pressable style={[s.nextBtn, !canNext && s.nextBtnDisabled]} disabled={!canNext} onPress={next}>
            <Text style={[s.nextBtnText, !canNext && s.nextBtnTextDisabled]}>
              {step === "extras" ? "REVIEW" : "NEXT"} →
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  topBar:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:     { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,229,255,0.08)", borderWidth: 1, borderColor: "rgba(0,229,255,0.2)" },
  topCenter:   { flex: 1, alignItems: "center" },
  topStep:     { fontSize: 10, fontWeight: "900", color: C.cyan, letterSpacing: 2 },
  topAddress:  { fontSize: 11, color: C.muted, marginTop: 1 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 130 },

  sectionLabel:  { fontSize: 9, fontWeight: "900", color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, marginTop: 4 },

  addressCard:   { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  addressIcon:   { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(0,229,255,0.08)", borderWidth: 1, borderColor: "rgba(0,229,255,0.2)", alignItems: "center", justifyContent: "center", marginRight: 12 },
  addressInfo:   { flex: 1 },
  addressMain:   { fontSize: 15, fontWeight: "800", color: C.text },
  addressSub:    { fontSize: 11, color: C.muted, marginTop: 2 },

  doorGrid:      { gap: 10 },
  doorBtn:       { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: "rgba(15,20,64,0.6)" },
  doorIcon:      { fontSize: 20 },
  doorInfo:      { flex: 1 },
  doorLabel:     { fontSize: 14, fontWeight: "800", color: C.text },
  doorHint:      { fontSize: 10, color: C.muted, marginTop: 2 },

  notesInput:    { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 14, color: C.text, minHeight: 100, textAlignVertical: "top", marginBottom: 16 },

  toggleCard:    { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: "hidden" },
  toggleRow:     { flexDirection: "row", alignItems: "center", padding: 14 },
  toggleLeft:    { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  toggleInfo:    { flex: 1 },
  toggleLabel:   { fontSize: 14, fontWeight: "700", color: C.text },
  toggleSub:     { fontSize: 11, color: C.muted, marginTop: 2 },

  signPickerWrap:   { padding: 14, paddingTop: 0, borderTopWidth: 1, borderTopColor: C.border },
  signConfirmed:    { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border },
  signConfirmedText:{ flex: 1, fontSize: 11, fontWeight: "700", color: C.orange },
  signEditText:     { fontSize: 11, fontWeight: "800", color: C.blue },

  summaryCard:      { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  summaryCardLabel: { fontSize: 8, fontWeight: "900", color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  summaryRow:       { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  summaryDot:       { width: 10, height: 10, borderRadius: 5 },
  summaryIcon:      { fontSize: 14 },
  summaryValue:     { fontSize: 14, fontWeight: "700", color: C.text },
  summaryChips:     { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  summaryChip:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  summaryChipText:  { fontSize: 11, fontWeight: "700" },

  submitBtn:        { backgroundColor: C.blue, borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8, ...Platform.select({ ios: { shadowColor: C.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 16 } }) },
  submitBtnPressed: { backgroundColor: "#1565C0" },
  submitBtnText:    { fontSize: 14, fontWeight: "900", color: C.bg, letterSpacing: 2, textTransform: "uppercase" },

  undoBanner:  { backgroundColor: "rgba(0,200,83,0.08)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(0,200,83,0.3)", flexDirection: "row", alignItems: "center", gap: 12 },
  undoLeft:    { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  undoTitle:   { fontSize: 14, fontWeight: "800", color: C.green },
  undoSub:     { fontSize: 11, color: C.muted, marginTop: 2 },
  undoBtn:     { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  undoBtnText: { fontSize: 11, fontWeight: "800", color: C.text, letterSpacing: 1 },

  footer:           { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  nextBtn:          { backgroundColor: C.cyan, borderRadius: 14, paddingVertical: 16, alignItems: "center", ...Platform.select({ ios: { shadowColor: C.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 } }) },
  nextBtnDisabled:  { backgroundColor: "rgba(0,229,255,0.15)" },
  nextBtnText:      { fontSize: 14, fontWeight: "900", color: C.bg, letterSpacing: 2, textTransform: "uppercase" },
  nextBtnTextDisabled:{ color: C.muted },
});
