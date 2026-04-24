/**
 * Canvassing tab — Field Command + War Room v3
 * Complete self-contained React Native port of the SocialCommand Figma component.
 *
 * Screen A: Mission Picker (Field Ops tab) + War Room (Command tab)
 * Screen B: Active mission — stop navigation, turf claim, team status
 * Wizard: navigates to /(app)/door/[id] with stop data as params
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, Platform,
  FlatList, TextInput, Switch, LayoutAnimation, UIManager, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Crosshair, Target, Database, Zap, BookOpen, Home, MapPin,
  Navigation, Layers, ChevronRight, CheckCircle, BellRing, Activity,
  Users, Settings, Plus, Trash2, ToggleLeft, ToggleRight, List,
  ArrowLeft, Rocket, Check, X, Globe, Smartphone, Cpu, Wifi,
  TrendingUp, Flag, Star,
} from 'lucide-react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../lib/auth';
import { fetchTurfs, fetchWalkList, type TurfSummary, type WalkStop } from '../../../lib/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────

const C = {
  bg: '#050A1F',
  card: '#0F1440',
  overlay: '#0A0F35',
  input: 'rgba(15,20,64,0.8)',
  blue: '#2979FF',
  cyan: '#00E5FF',
  red: '#FF3B30',
  green: '#00C853',
  amber: '#FFD600',
  orange: '#FF9F0A',
  purple: '#9C27B0',
  textPrimary: '#F5F7FF',
  textSecondary: '#AAB2FF',
  textMuted: '#6B72A0',
  border: 'rgba(41,121,255,0.2)',
  borderB: 'rgba(0,229,255,0.3)',
};

const PARTY_COLOR: Record<string, string> = {
  LIB: '#E53935', CON: '#1565C0', NDP: '#E65100', BQ: '#0097A7', GRN: '#2E7D32', IND: '#616161',
};

// ─── INLINE DATA ─────────────────────────────────────────────────────────────

interface Mission {
  id: string; name: string; type: 'canvass' | 'lit-drop';
  doors: number; routing: string; priority: 'Critical' | 'High' | 'Normal';
  reward: string; start: number; end: number;
}

interface Person { id: string; name: string; party: string; }
interface Stop {
  id: string; address: string; unit?: string;
  household: Person[]; notes?: string; hasOpponentSign?: boolean; status: string;
  phone?: string | null; supportLevel?: string;
}

interface TeamMember {
  id: string; name: string; initials: string; color: string; status: 'active' | 'offline'; side: string | null;
}

interface CampaignField {
  id: string; label: string; type: 'boolean' | 'choice' | 'multi' | 'text' | 'scale';
  scope: 'household' | 'person'; active: boolean; icon: string; hint?: string;
}


const INITIAL_TEAM: TeamMember[] = [
  { id: 't1', name: 'You', initials: 'ME', color: '#00E5FF', status: 'active', side: null },
  { id: 't2', name: 'S. Bouchard', initials: 'SB', color: '#2979FF', status: 'active', side: 'Even' },
  { id: 't3', name: 'K. Nguyen', initials: 'KN', color: '#FF9F0A', status: 'active', side: null },
  { id: 't4', name: 'A. Diallo', initials: 'AD', color: '#9C27B0', status: 'offline', side: null },
];

const TURF_SIDES = [
  { id: 'odd', label: 'Odd Side' },
  { id: 'even', label: 'Even Side' },
  { id: 'full', label: 'Full Street' },
];


const DEFAULT_CAMPAIGN_FIELDS: CampaignField[] = [
  { id: 'support_level', label: 'Support Level', type: 'choice', scope: 'person', active: true, icon: '🎯' },
  { id: 'vote_intent', label: 'Voting Intent', type: 'boolean', scope: 'person', active: true, icon: '✅' },
  { id: 'top_issue', label: 'Top Issue', type: 'multi', scope: 'household', active: true, icon: '🏷️', hint: 'Select all that apply' },
  { id: 'sign_interest', label: 'Sign Interest', type: 'boolean', scope: 'household', active: true, icon: '🪧' },
  { id: 'donation_ask', label: 'Donation Ask', type: 'boolean', scope: 'person', active: true, icon: '💰' },
  { id: 'vol_interest', label: 'Volunteer Interest', type: 'boolean', scope: 'person', active: false, icon: '🤝' },
  { id: 'age_range', label: 'Age Range', type: 'choice', scope: 'person', active: false, icon: '👤' },
  { id: 'accessibility', label: 'Accessibility Needs', type: 'text', scope: 'household', active: false, icon: '♿' },
];

const PARTY_DISTRIBUTION = [
  { party: 'LIB', count: 178, color: PARTY_COLOR.LIB },
  { party: 'NDP', count: 134, color: PARTY_COLOR.NDP },
  { party: 'CON', count: 89, color: PARTY_COLOR.CON },
  { party: 'GRN', count: 47, color: PARTY_COLOR.GRN },
  { party: 'IND', count: 42, color: PARTY_COLOR.IND },
];
const TOTAL_VOTERS = PARTY_DISTRIBUTION.reduce((a, p) => a + p.count, 0);

const AREA_VELOCITY = [12, 18, 14, 24, 31, 19, 28, 35, 22, 29, 38, 42, 33];
const MAX_VELOCITY = Math.max(...AREA_VELOCITY);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function partyColor(party: string): string {
  return PARTY_COLOR[party] ?? C.textMuted;
}

function turfToMission(turf: TurfSummary): Mission {
  return {
    id: turf.id,
    name: turf.name,
    type: 'canvass',
    doors: turf.contactCount,
    routing: turf.streets.length > 0 ? turf.streets.slice(0, 2).join(' / ') : 'Optimised Route',
    priority: turf.contactCount >= 40 ? 'High' : 'Normal',
    reward: '1× pts',
    start: turf.completedCount,
    end: turf.contactCount,
  };
}

function walkStopToStop(ws: WalkStop): Stop {
  return {
    id: ws.contact.id,
    address: ws.contact.address1 ?? 'Unknown Address',
    unit: ws.contact.address2 ?? undefined,
    household: [{
      id: ws.contact.id,
      name: `${ws.contact.firstName} ${ws.contact.lastName}`,
      party: 'IND',
    }],
    notes: ws.contact.notes ?? undefined,
    hasOpponentSign: false,
    status: ws.visited ? 'done' : 'pending',
    phone: ws.contact.phone,
    supportLevel: ws.contact.supportLevel,
  };
}

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────

function Bar({ pct, color = C.cyan, height = 4 }: { pct: number; color?: string; height?: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <View style={{ height, backgroundColor: 'rgba(41,121,255,0.12)', borderRadius: height, overflow: 'hidden' }}>
      <View style={{ width: `${clamped}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

// ─── STAT PILL ────────────────────────────────────────────────────────────────

function StatPill({ label, value, color = C.cyan }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={ss.statPill}>
      <Text style={[ss.statValue, { color }]}>{value}</Text>
      <Text style={ss.statLabel}>{label}</Text>
    </View>
  );
}

// ─── MISSION CARD ─────────────────────────────────────────────────────────────

function MissionCard({ mission, onAccept }: { mission: Mission; onAccept: () => void }) {
  const isLit = mission.type === 'lit-drop';
  const priColor = mission.priority === 'Critical' ? C.red : mission.priority === 'High' ? C.blue : C.textMuted;
  return (
    <View style={ss.missionCard}>
      <View style={ss.missionHeader}>
        <View style={ss.missionIcon}>
          {isLit
            ? <BookOpen size={18} color={C.cyan} />
            : <Home size={18} color={C.cyan} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ss.missionName}>{mission.name}</Text>
          <View style={ss.missionMeta}>
            {isLit
              ? <><BookOpen size={8} color={C.textMuted} /><Text style={ss.missionMetaText}>Lit Drop</Text></>
              : <><Home size={8} color={C.textMuted} /><Text style={ss.missionMetaText}>Canvass</Text></>}
            <Text style={ss.missionMetaDot}>·</Text>
            <Text style={ss.missionMetaText}>{mission.doors} Doors</Text>
            <Text style={ss.missionMetaDot}>·</Text>
            <Text style={[ss.missionMetaText, { color: C.cyan }]}>{mission.routing}</Text>
          </View>
          {isLit && (
            <View style={ss.fastBadge}>
              <Rocket size={7} color={C.amber} />
              <Text style={ss.fastBadgeText}>Fast Mode</Text>
            </View>
          )}
        </View>
      </View>
      <View style={ss.missionFooter}>
        <View style={ss.missionBadges}>
          <View style={[ss.badge, { borderColor: priColor, backgroundColor: `${priColor}18` }]}>
            <Text style={[ss.badgeText, { color: priColor }]}>{mission.priority}</Text>
          </View>
          <View style={[ss.badge, { borderColor: 'rgba(255,214,0,0.3)', backgroundColor: 'rgba(255,214,0,0.1)' }]}>
            <Text style={[ss.badgeText, { color: C.amber }]}>{mission.reward}</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [ss.acceptBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onAccept(); }}
        >
          <Text style={ss.acceptBtnText}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── WAR ROOM / COMMAND CENTER ────────────────────────────────────────────────

function CommandCenter({
  campaignFields, setCampaignFields, candidateOnStreet, setCandidateOnStreet, stopsCount,
}: {
  campaignFields: CampaignField[];
  setCampaignFields: (fn: (p: CampaignField[]) => CampaignField[]) => void;
  candidateOnStreet: boolean;
  setCandidateOnStreet: (v: boolean) => void;
  stopsCount: number;
}) {
  const [tab, setTab] = useState<'stats' | 'team' | 'builder' | 'platform'>('stats');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CampaignField['type']>('boolean');
  const [newScope, setNewScope] = useState<CampaignField['scope']>('household');

  const activeCount = campaignFields.filter(f => f.active).length;

  const addField = useCallback(() => {
    if (!newLabel.trim()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCampaignFields(prev => [...prev, {
      id: `custom_${Date.now()}`, label: newLabel.trim(),
      type: newType, scope: newScope, active: true, icon: '⚙️',
    }]);
    setNewLabel('');
  }, [newLabel, newType, newScope, setCampaignFields]);

  const toggleField = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCampaignFields(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f));
  }, [setCampaignFields]);

  const deleteField = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCampaignFields(prev => prev.filter(f => f.id !== id));
  }, [setCampaignFields]);

  const CC_TABS = [
    { id: 'stats', label: 'Stats', icon: Activity },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'builder', label: 'Builder', icon: Settings },
    { id: 'platform', label: 'Platform', icon: Database },
  ] as const;

  return (
    <View style={{ flex: 1 }}>
      {/* CC inner tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ss.ccTabBar} contentContainerStyle={ss.ccTabBarContent}>
        {CC_TABS.map(t => {
          const active = tab === t.id;
          const I = t.icon;
          return (
            <Pressable
              key={t.id}
              style={[ss.ccTab, active && ss.ccTabActive]}
              onPress={() => setTab(t.id)}
            >
              <I size={11} color={active ? C.cyan : C.textMuted} />
              <Text style={[ss.ccTabText, active && { color: C.cyan }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Candidate toggle */}
      <View style={ss.candidateToggle}>
        <BellRing size={13} color={candidateOnStreet ? C.orange : C.textMuted} />
        <Text style={[ss.candidateToggleText, candidateOnStreet && { color: C.orange }]}>
          Candidate on Field
        </Text>
        <Switch
          value={candidateOnStreet}
          onValueChange={v => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCandidateOnStreet(v); }}
          trackColor={{ false: C.border, true: 'rgba(255,159,10,0.4)' }}
          thumbColor={candidateOnStreet ? C.orange : C.textMuted}
          style={{ marginLeft: 'auto' }}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={ss.ccBody}>
        {/* STATS TAB */}
        {tab === 'stats' && (
          <>
            {/* Headline stats */}
            <View style={ss.statsStrip}>
              <StatPill label="HOUSEHOLDS" value={stopsCount || '—'} color={C.cyan} />
              <StatPill label="VOTERS" value={TOTAL_VOTERS} color={C.blue} />
              <StatPill label="ACTIVE" value="3" color={C.green} />
              <StatPill label="DONE" value="0" color={C.textMuted} />
            </View>

            {/* Contact velocity */}
            <View style={ss.ccCard}>
              <View style={ss.ccCardHeader}>
                <Activity size={11} color={C.cyan} />
                <Text style={ss.ccCardTitle}>Daily Contact Velocity</Text>
              </View>
              <View style={ss.velocityChart}>
                {AREA_VELOCITY.map((v, i) => (
                  <View key={i} style={ss.velocityBarWrap}>
                    <View style={[ss.velocityBar, { height: Math.max(4, (v / MAX_VELOCITY) * 80), backgroundColor: i === AREA_VELOCITY.length - 1 ? C.cyan : `${C.blue}99` }]} />
                  </View>
                ))}
              </View>
              <View style={ss.velocityLabels}>
                <Text style={ss.velocityLabel}>Apr 11</Text>
                <Text style={ss.velocityLabel}>Today</Text>
              </View>
            </View>

            {/* Party distribution */}
            <View style={ss.ccCard}>
              <Text style={ss.ccCardTitle}>Riding 42 Voter Distribution</Text>
              {PARTY_DISTRIBUTION.map(p => (
                <View key={p.party} style={ss.partyRow}>
                  <Text style={[ss.partyLabel, { color: p.color }]}>{p.party}</Text>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Bar pct={(p.count / TOTAL_VOTERS) * 100} color={p.color} height={6} />
                  </View>
                  <Text style={ss.partyCount}>{p.count} ({Math.round((p.count / TOTAL_VOTERS) * 100)}%)</Text>
                </View>
              ))}
            </View>

            {/* Efficacy */}
            <View style={ss.ccCard}>
              <View style={ss.ccCardHeader}>
                <TrendingUp size={11} color={C.cyan} />
                <Text style={ss.ccCardTitle}>Field Efficacy</Text>
              </View>
              {[
                { label: 'Doors Contacted', pct: 68, color: C.cyan },
                { label: 'Voter ID Rate', pct: 51, color: C.green },
                { label: 'Survey Completion', pct: 44, color: C.blue },
                { label: 'Sign Requests', pct: 19, color: C.orange },
              ].map(s => (
                <View key={s.label} style={ss.efficacyRow}>
                  <Text style={ss.efficacyLabel}>{s.label}</Text>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Bar pct={s.pct} color={s.color} height={5} />
                  </View>
                  <Text style={[ss.efficacyPct, { color: s.color }]}>{s.pct}%</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* TEAM TAB */}
        {tab === 'team' && (
          <>
            {INITIAL_TEAM.map(m => (
              <View key={m.id} style={ss.teamCard}>
                <View style={[ss.teamAvatar, { backgroundColor: m.color }]}>
                  <Text style={ss.teamAvatarText}>{m.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ss.teamName}>{m.name}</Text>
                  <View style={ss.teamStatusRow}>
                    <View style={[ss.teamDot, { backgroundColor: m.status === 'active' ? '#00E676' : C.textMuted }]} />
                    <Text style={[ss.teamStatus, m.status === 'active' && { color: '#00E676' }]}>
                      {m.status === 'active' ? 'Active' : 'Offline'}
                    </Text>
                    {m.side && <Text style={ss.teamSide}> · {m.side}</Text>}
                  </View>
                </View>
                <View style={ss.teamDoors}>
                  <Text style={ss.teamDoorsValue}>{m.status === 'active' ? '14' : '—'}</Text>
                  <Text style={ss.teamDoorsLabel}>doors</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* BUILDER TAB */}
        {tab === 'builder' && (
          <>
            {/* Info banner */}
            <View style={ss.builderBanner}>
              <Text style={ss.builderBannerTitle}>Dynamic Field System</Text>
              <Text style={ss.builderBannerBody}>
                Fields created here appear live in the canvass wizard Survey step.
                Add, remove, and toggle fields without a code release.
              </Text>
            </View>

            <Text style={ss.builderSectionLabel}>
              <List size={10} color={C.textMuted} /> Fields ({activeCount}/{campaignFields.length} active)
            </Text>

            {campaignFields.map(f => (
              <View key={f.id} style={[ss.fieldRow, { opacity: f.active ? 1 : 0.5 }]}>
                <Text style={ss.fieldIcon}>{f.icon}</Text>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={ss.fieldLabel}>{f.label}</Text>
                  <View style={ss.fieldBadges}>
                    <View style={ss.fieldTypeBadge}>
                      <Text style={ss.fieldTypeBadgeText}>{f.type}</Text>
                    </View>
                    <View style={ss.fieldScopeBadge}>
                      <Text style={ss.fieldScopeBadgeText}>{f.scope}</Text>
                    </View>
                  </View>
                </View>
                <Pressable onPress={() => toggleField(f.id)} hitSlop={8}>
                  {f.active
                    ? <ToggleRight size={22} color={C.cyan} />
                    : <ToggleLeft size={22} color={C.textMuted} />}
                </Pressable>
                {f.id.startsWith('custom_') && (
                  <Pressable onPress={() => deleteField(f.id)} hitSlop={8} style={{ marginLeft: 8 }}>
                    <Trash2 size={14} color={C.red} />
                  </Pressable>
                )}
              </View>
            ))}

            {/* Add field */}
            <View style={ss.addFieldCard}>
              <Text style={ss.addFieldTitle}><Plus size={10} color={C.green} /> Add Custom Field</Text>
              <TextInput
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="Field label (e.g. Accessibility Needs)"
                placeholderTextColor={C.textMuted}
                style={ss.addFieldInput}
              />
              <View style={ss.addFieldRow}>
                <View style={ss.addFieldPickerWrap}>
                  {(['boolean', 'choice', 'multi', 'text', 'scale'] as const).map(t => (
                    <Pressable
                      key={t}
                      style={[ss.typeChip, newType === t && ss.typeChipActive]}
                      onPress={() => setNewType(t)}
                    >
                      <Text style={[ss.typeChipText, newType === t && { color: C.cyan }]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={ss.addFieldRow}>
                {(['household', 'person'] as const).map(s => (
                  <Pressable
                    key={s}
                    style={[ss.scopeChip, newScope === s && ss.scopeChipActive]}
                    onPress={() => setNewScope(s)}
                  >
                    <Text style={[ss.scopeChipText, newScope === s && { color: C.cyan }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={[ss.addFieldBtn, !newLabel.trim() && { opacity: 0.4 }]}
                onPress={addField}
                disabled={!newLabel.trim()}
              >
                <Plus size={13} color="#050A1F" />
                <Text style={ss.addFieldBtnText}>Add to Campaign</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* PLATFORM TAB */}
        {tab === 'platform' && (
          <>
            <View style={ss.platformCard}>
              <View style={ss.platformCardHeader}>
                <Globe size={13} color={C.cyan} />
                <Text style={ss.platformCardTitle}>Platform Status</Text>
              </View>
              {[
                { label: 'API', value: 'Healthy', color: C.green, icon: Wifi },
                { label: 'Sync Queue', value: '0 pending', color: C.green, icon: Activity },
                { label: 'Offline Mode', value: 'Ready', color: C.amber, icon: Smartphone },
                { label: 'AI Engine', value: 'Active', color: C.cyan, icon: Cpu },
              ].map(s => {
                const I = s.icon;
                return (
                  <View key={s.label} style={ss.platformRow}>
                    <I size={12} color={s.color} />
                    <Text style={ss.platformRowLabel}>{s.label}</Text>
                    <View style={[ss.platformStatusBadge, { backgroundColor: `${s.color}18`, borderColor: `${s.color}40` }]}>
                      <Text style={[ss.platformStatusText, { color: s.color }]}>{s.value}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={ss.platformCard}>
              <Text style={[ss.platformCardTitle, { color: C.orange, marginBottom: 10 }]}>
                iOS Build Path
              </Text>
              {[
                { title: 'Option A — Expo EAS (Current)', detail: 'This is the live Expo app. Submit to App Store via EAS Build + Submit.', color: C.green },
                { title: 'Option B — Full Native (Swift)', detail: 'Use this Expo prototype as wireframe spec for Swift rewrite.', color: C.blue },
              ].map(o => (
                <View key={o.title} style={[ss.buildOption, { borderColor: `${o.color}35`, backgroundColor: `${o.color}08` }]}>
                  <Text style={[ss.buildOptionTitle, { color: o.color }]}>{o.title}</Text>
                  <Text style={ss.buildOptionDetail}>{o.detail}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── ACTIVE MISSION VIEW ──────────────────────────────────────────────────────

function ActiveMissionView({
  mission, stops, stopIdx, claimedSide, teamData,
  onClaimTurf, onArrived, onComplete, onBack, isLitDrop,
}: {
  mission: Mission;
  stops: Stop[];
  stopIdx: number;
  claimedSide: string | null;
  teamData: TeamMember[];
  onClaimTurf: (side: string) => void;
  onArrived: (stop: Stop) => void;
  onComplete: () => void;
  onBack: () => void;
  isLitDrop: boolean;
}) {
  const currentStop = stops[stopIdx] ?? null;
  const completed = stops.filter(s => s.status !== 'pending').length;
  const pct = stops.length ? Math.round((completed / stops.length) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Mission header */}
      <View style={ss.missionActiveHeader}>
        <Pressable style={ss.backBtn} onPress={onBack} hitSlop={8}>
          <ArrowLeft size={16} color={C.cyan} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
          <Text style={ss.missionActiveType}>
            {isLitDrop ? '📋 Lit Drop' : '🚶 Canvassing'} · Apr 2026
          </Text>
          <Text style={ss.missionActiveName} numberOfLines={1}>{mission.name}</Text>
        </View>
        {isLitDrop && (
          <Pressable style={ss.fastBtn} onPress={() => {}}>
            <Rocket size={9} color={C.amber} />
            <Text style={ss.fastBtnText}>Fast</Text>
          </Pressable>
        )}
      </View>

      {/* Compact map header */}
      <View style={ss.mapHeader}>
        <View style={ss.mapGrid} pointerEvents="none">
          {Array.from({ length: 80 }).map((_, i) => (
            <View key={i} style={ss.mapDot} />
          ))}
        </View>
        {/* Progress overlay */}
        <View style={ss.mapProgressRow}>
          <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(41,121,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: 6, backgroundColor: C.cyan, borderRadius: 3 }} />
          </View>
          <Text style={ss.mapProgressText}>{completed}/{stops.length}</Text>
        </View>
        {/* Navigation indicator */}
        <View style={ss.mapNavRow}>
          <Navigation size={18} color={C.cyan} style={{ transform: [{ rotate: '-45deg' }] }} />
          {currentStop && (
            <View style={ss.mapAddressChip}>
              <MapPin size={12} color={C.red} />
              <Text style={ss.mapAddressText}>{currentStop.address}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Body */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={ss.activeMissionBody}>
        {currentStop ? (
          <>
            {/* Next stop card */}
            <View style={ss.nextStopHeader}>
              <View>
                <Text style={ss.nextStopLabel}>Next Stop</Text>
                <Text style={ss.nextStopAddress}>{currentStop.address}</Text>
                {currentStop.unit && <Text style={ss.nextStopUnit}>{currentStop.unit}</Text>}
                <View style={ss.partyChips}>
                  {Array.from(new Set(currentStop.household.map(p => p.party))).map(party => (
                    <View key={party} style={[ss.partyChip, { backgroundColor: `${partyColor(party)}22` }]}>
                      <Text style={[ss.partyChipText, { color: partyColor(party) }]}>{party}</Text>
                    </View>
                  ))}
                  <Text style={ss.voterCount}>
                    {currentStop.household.length} voter{currentStop.household.length !== 1 ? 's' : ''}
                  </Text>
                  {currentStop.hasOpponentSign && (
                    <Text style={ss.oppSign}>⚠ Opp. sign</Text>
                  )}
                </View>
                {currentStop.notes && (
                  <Text style={ss.stopNotes}>📋 {currentStop.notes}</Text>
                )}
              </View>
              <View style={ss.walkTime}>
                <Text style={ss.walkTimeValue}>3m</Text>
                <Text style={ss.walkTimeLabel}>Walk</Text>
              </View>
            </View>

            {/* Turf claim */}
            <View style={ss.turfCard}>
              <View style={ss.turfCardHeader}>
                <Layers size={10} color={C.textMuted} />
                <Text style={ss.turfCardTitle}>Claim Turf</Text>
              </View>
              <View style={ss.turfSides}>
                {TURF_SIDES.map(side => {
                  const claimed = claimedSide === side.id;
                  return (
                    <Pressable
                      key={side.id}
                      style={[ss.turfSideBtn, claimed && ss.turfSideBtnActive]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClaimTurf(side.id); }}
                    >
                      <Text style={[ss.turfSideBtnText, claimed && { color: C.cyan }]}>{side.label}</Text>
                      {claimed && <Text style={ss.turfClaimedText}>claimed ✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Team status */}
            {teamData.filter(m => m.status === 'active').length > 0 && (
              <View style={ss.teamStrip}>
                {teamData.filter(m => m.status === 'active').map(m => (
                  <View key={m.id} style={[ss.teamChip, { backgroundColor: `${m.color}12`, borderColor: `${m.color}25` }]}>
                    <View style={[ss.teamMiniAvatar, { backgroundColor: m.color }]}>
                      <Text style={ss.teamMiniAvatarText}>{m.initials}</Text>
                    </View>
                    <Text style={[ss.teamChipName, { color: m.color }]}>{m.name.split(' ')[0]}</Text>
                    {m.side && <Text style={ss.teamChipSide}>{m.side}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Arrived button */}
            <Pressable
              style={({ pressed }) => [ss.arrivedBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onArrived(currentStop); }}
            >
              <MapPin size={18} color="#050A1F" />
              <Text style={ss.arrivedBtnText}>Arrived — Start Interaction</Text>
            </Pressable>
          </>
        ) : (
          /* Mission complete */
          <View style={ss.missionComplete}>
            <CheckCircle size={48} color={C.cyan} />
            <Text style={ss.missionCompleteTitle}>Mission Complete!</Text>
            <Text style={ss.missionCompleteBody}>
              All {stops.length} stops done · Riding 42 · Apr 2026
            </Text>
            <Pressable style={ss.returnBtn} onPress={onComplete}>
              <Text style={ss.returnBtnText}>Return to Command</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function CanvassingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [turfs, setTurfs] = useState<TurfSummary[]>([]);
  const [isLoadingTurfs, setIsLoadingTurfs] = useState(false);
  const [turfsError, setTurfsError] = useState<string | null>(null);
  const [isLoadingWalkList, setIsLoadingWalkList] = useState(false);

  const [mainTab, setMainTab] = useState<'field' | 'command'>('field');
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopIdx, setStopIdx] = useState(0);
  const [claimedSide, setClaimedSide] = useState<string | null>(null);
  const [teamData, setTeamData] = useState<TeamMember[]>(INITIAL_TEAM);
  const [campaignFields, setCampaignFields] = useState<CampaignField[]>(DEFAULT_CAMPAIGN_FIELDS);
  const [candidateOnStreet, setCandidateOnStreet] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@poll_city_active_campaign').then(id => {
      if (!id) {
        router.replace('/(app)/campaigns');
        return;
      }
      setCampaignId(id);
      setIsLoadingTurfs(true);
      setTurfsError(null);
      fetchTurfs(id)
        .then(res => setTurfs(res.data))
        .catch(() => setTurfsError('Could not load your turfs. Check your connection.'))
        .finally(() => setIsLoadingTurfs(false));
    }).catch(() => {});
  }, [user]);

  const acceptMission = useCallback((m: Mission) => {
    if (!campaignId) return;
    setIsLoadingWalkList(true);
    setTurfsError(null);
    fetchWalkList(m.id, campaignId)
      .then(res => {
        const realStops = res.data.map(ws => walkStopToStop(ws));
        setActiveMission(m);
        setStops(realStops);
        setStopIdx(0);
        setClaimedSide(null);
        setTeamData(INITIAL_TEAM.map(t => ({ ...t, side: null })));
      })
      .catch(() => setTurfsError('Could not load the walk list. Try again.'))
      .finally(() => setIsLoadingWalkList(false));
  }, [campaignId]);

  const claimTurf = useCallback((side: string) => {
    const ns = claimedSide === side ? null : side;
    setClaimedSide(ns);
    setTeamData(prev => prev.map(m => m.id === 't1' ? { ...m, side: ns } : m));
  }, [claimedSide]);

  const handleArrived = useCallback((stop: Stop) => {
    arrivedStopId.current = stop.id;
    const firstPerson = stop.household[0];
    const nameParts = firstPerson?.name.split(' ') ?? [];
    router.push({
      pathname: '/(app)/door/[id]',
      params: {
        id: stop.id,
        contactJson: JSON.stringify({
          id: stop.id,
          firstName: nameParts[0] ?? 'Resident',
          lastName: nameParts.slice(1).join(' ') || '',
          address1: stop.address,
          phone: stop.phone ?? null,
          supportLevel: stop.supportLevel ?? 'unknown',
          doNotContact: false,
        }),
        householdCount: String(stop.household.length),
        stopNotes: stop.notes ?? '',
      },
    });
  }, [router]);

  const arrivedStopId = useRef<string | null>(null);

  useFocusEffect(useCallback(() => {
    const id = arrivedStopId.current;
    if (!id) return;
    arrivedStopId.current = null;
    setStops(prev => prev.map(s => s.id === id ? { ...s, status: 'done' } : s));
    setStopIdx(prev => prev + 1);
  }, []));

  const handleComplete = useCallback(() => {
    setActiveMission(null);
    setStops([]);
    setStopIdx(0);
  }, []);

  // ── ACTIVE MISSION VIEW ──
  if (activeMission) {
    const isLitDrop = activeMission.type === 'lit-drop';
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ActiveMissionView
          mission={activeMission}
          stops={stops}
          stopIdx={stopIdx}
          claimedSide={claimedSide}
          teamData={teamData}
          onClaimTurf={claimTurf}
          onArrived={handleArrived}
          onComplete={handleComplete}
          onBack={() => setActiveMission(null)}
          isLitDrop={isLitDrop}
        />
      </SafeAreaView>
    );
  }

  // ── MISSION PICKER + WAR ROOM ──
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Crosshair size={20} color={C.cyan} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.topBarTitle}>Poll City</Text>
            <Text style={styles.topBarSub}>Campaign Staff · Apr 2026</Text>
          </View>
        </View>
        <View style={styles.topBarRight}>
          {candidateOnStreet && (
            <View style={styles.candidateBadge}>
              <BellRing size={10} color={C.orange} />
              <Text style={styles.candidateBadgeText}>Candidate On Field</Text>
            </View>
          )}
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>
      </View>

      {/* Main tab bar */}
      <View style={styles.mainTabBar}>
        {[
          { id: 'field', label: 'Field Ops', icon: Target },
          { id: 'command', label: 'War Room', icon: Database },
        ].map(t => {
          const active = mainTab === t.id;
          const I = t.icon;
          return (
            <Pressable
              key={t.id}
              style={[styles.mainTab, active && styles.mainTabActive]}
              onPress={() => setMainTab(t.id as 'field' | 'command')}
            >
              <I size={13} color={active ? C.cyan : C.textMuted} />
              <Text style={[styles.mainTabText, active && { color: C.cyan }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {mainTab === 'field' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.fieldContent}>
          <View style={styles.fieldHeader}>
            <Zap size={12} color={C.amber} />
            <Text style={styles.fieldHeaderText}>
              {isLoadingTurfs
                ? 'Loading turfs…'
                : `Deployments · ${turfs.length} turf${turfs.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          {isLoadingTurfs && (
            <ActivityIndicator color={C.cyan} style={{ marginTop: 40 }} />
          )}
          {isLoadingWalkList && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={C.cyan} />
              <Text style={styles.loadingText}>Loading walk list…</Text>
            </View>
          )}
          {turfsError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{turfsError}</Text>
            </View>
          ) : null}
          {!isLoadingTurfs && !campaignId && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No campaign selected</Text>
              <Text style={styles.emptySubtitle}>Select a campaign in Settings to load your turfs.</Text>
            </View>
          )}
          {!isLoadingTurfs && campaignId && turfs.length === 0 && !turfsError && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No turfs assigned</Text>
              <Text style={styles.emptySubtitle}>Ask your campaign manager to assign you a turf.</Text>
            </View>
          )}
          {turfs.map(t => {
            const m = turfToMission(t);
            return <MissionCard key={m.id} mission={m} onAccept={() => acceptMission(m)} />;
          })}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <CommandCenter
            campaignFields={campaignFields}
            setCampaignFields={setCampaignFields}
            candidateOnStreet={candidateOnStreet}
            setCandidateOnStreet={setCandidateOnStreet}
            stopsCount={stops.length}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.overlay, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center' },
  topBarTitle: { fontSize: 14, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.3 },
  topBarSub: { fontSize: 8, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  candidateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(255,159,10,0.15)', borderWidth: 1, borderColor: 'rgba(255,159,10,0.5)',
  },
  candidateBadgeText: { fontSize: 8, fontWeight: '900', color: C.orange, textTransform: 'uppercase', letterSpacing: 0.5 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(0,230,118,0.1)', borderWidth: 1, borderColor: 'rgba(0,230,118,0.4)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00E676' },
  liveText: { fontSize: 8, fontWeight: '900', color: '#00E676', letterSpacing: 1.5, textTransform: 'uppercase' },

  mainTabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginVertical: 10,
    backgroundColor: 'rgba(15,20,64,0.8)', borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 4,
  },
  mainTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 10,
  },
  mainTabActive: {
    backgroundColor: 'rgba(0,229,255,0.12)', borderWidth: 1, borderColor: C.borderB,
  },
  mainTabText: { fontSize: 10, fontWeight: '900', color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase' },

  fieldContent: { paddingHorizontal: 14, paddingBottom: 80, paddingTop: 4 },
  fieldHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, marginBottom: 4,
  },
  fieldHeaderText: { fontSize: 10, fontWeight: '900', color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  loadingOverlay: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10,
    backgroundColor: 'rgba(0,229,255,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)',
  },
  loadingText: { fontSize: 11, fontWeight: '700', color: C.textSecondary },
  errorBanner: {
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10,
    backgroundColor: 'rgba(255,59,48,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,59,48,0.3)',
  },
  errorText: { fontSize: 11, fontWeight: '700', color: '#FF3B30', textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: C.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 11, color: C.textMuted, textAlign: 'center', lineHeight: 18 },
});

// Sub-component styles
const ss = StyleSheet.create({
  // STAT PILL
  statPill: {
    flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
    backgroundColor: 'rgba(15,20,64,0.8)', borderRadius: 10, borderWidth: 1, borderColor: C.border,
    marginHorizontal: 3, minHeight: 56, justifyContent: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 7, fontWeight: '800', color: C.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  statsStrip: { flexDirection: 'row', marginBottom: 14 },

  // MISSION CARD
  missionCard: {
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 10,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }),
  },
  missionHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  missionIcon: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: 'rgba(15,20,64,0.9)', borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  missionName: { fontSize: 14, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.2, marginBottom: 4 },
  missionMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  missionMetaText: { fontSize: 9, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  missionMetaDot: { fontSize: 9, color: C.textMuted },
  fastBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,214,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,214,0,0.25)',
  },
  fastBadgeText: { fontSize: 7, fontWeight: '900', color: C.amber, letterSpacing: 0.5, textTransform: 'uppercase' },
  missionFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  missionBadges: { flexDirection: 'row', gap: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  badgeText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  acceptBtn: {
    backgroundColor: C.cyan, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9, minHeight: 36,
    ...Platform.select({ ios: { shadowColor: C.cyan, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 8 } }),
  },
  acceptBtnText: { fontSize: 10, fontWeight: '900', color: '#050A1F', letterSpacing: 1.5, textTransform: 'uppercase' },

  // COMMAND CENTER
  ccTabBar: { borderBottomWidth: 1, borderBottomColor: C.border, maxHeight: 46, flexShrink: 0 },
  ccTabBarContent: { paddingHorizontal: 12, flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 6 },
  ccTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  ccTabActive: { backgroundColor: 'rgba(0,229,255,0.1)', borderWidth: 1, borderColor: C.borderB },
  ccTabText: { fontSize: 9, fontWeight: '900', color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  candidateToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(255,159,10,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,159,10,0.2)',
  },
  candidateToggleText: { fontSize: 11, fontWeight: '700', color: C.textMuted },
  ccBody: { paddingHorizontal: 14, paddingBottom: 80, paddingTop: 4 },
  ccCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12 },
  ccCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  ccCardTitle: { fontSize: 9, fontWeight: '900', color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },

  // VELOCITY CHART
  velocityChart: { flexDirection: 'row', alignItems: 'flex-end', height: 90, marginVertical: 6 },
  velocityBarWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 1 },
  velocityBar: { width: '75%', borderRadius: 3, minHeight: 4 },
  velocityLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  velocityLabel: { fontSize: 8, color: C.textMuted, fontWeight: '600' },

  // PARTY BARS
  partyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  partyLabel: { fontSize: 10, fontWeight: '900', width: 32, letterSpacing: 0.3 },
  partyCount: { fontSize: 9, fontWeight: '700', color: C.textMuted, width: 72, textAlign: 'right' },

  // EFFICACY
  efficacyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  efficacyLabel: { fontSize: 9, color: C.textSecondary, fontWeight: '600', width: 110 },
  efficacyPct: { fontSize: 9, fontWeight: '900', width: 30, textAlign: 'right' },

  // TEAM
  teamCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8,
  },
  teamAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  teamAvatarText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  teamName: { fontSize: 14, fontWeight: '900', color: C.textPrimary, letterSpacing: 0.2 },
  teamStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  teamDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  teamStatus: { fontSize: 9, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  teamSide: { fontSize: 9, color: C.textMuted },
  teamDoors: { alignItems: 'flex-end' },
  teamDoorsValue: { fontSize: 14, fontWeight: '900', color: C.textPrimary },
  teamDoorsLabel: { fontSize: 8, color: C.textMuted },

  // BUILDER
  builderBanner: {
    backgroundColor: 'rgba(0,229,255,0.07)', borderRadius: 12, borderWidth: 1, borderColor: C.borderB,
    padding: 14, marginBottom: 14,
  },
  builderBannerTitle: { fontSize: 10, fontWeight: '900', color: C.cyan, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  builderBannerBody: { fontSize: 10, color: C.textSecondary, lineHeight: 16 },
  builderSectionLabel: { fontSize: 9, fontWeight: '800', color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
  },
  fieldIcon: { fontSize: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '900', color: C.textPrimary, marginBottom: 3 },
  fieldBadges: { flexDirection: 'row', gap: 4 },
  fieldTypeBadge: { backgroundColor: 'rgba(41,121,255,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  fieldTypeBadgeText: { fontSize: 7, fontWeight: '900', color: C.blue, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldScopeBadge: { backgroundColor: 'rgba(0,200,83,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  fieldScopeBadgeText: { fontSize: 7, fontWeight: '900', color: C.green, textTransform: 'uppercase', letterSpacing: 0.5 },
  addFieldCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 8 },
  addFieldTitle: { fontSize: 10, fontWeight: '900', color: C.green, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  addFieldInput: {
    backgroundColor: 'rgba(15,20,64,0.8)', borderRadius: 10, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 11, color: C.textPrimary, marginBottom: 8,
  },
  addFieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  addFieldPickerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(41,121,255,0.08)', borderWidth: 1, borderColor: C.border },
  typeChipActive: { borderColor: C.cyan, backgroundColor: 'rgba(0,229,255,0.12)' },
  typeChipText: { fontSize: 9, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  scopeChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(41,121,255,0.08)', borderWidth: 1, borderColor: C.border, flex: 1, alignItems: 'center' },
  scopeChipActive: { borderColor: C.cyan, backgroundColor: 'rgba(0,229,255,0.12)' },
  scopeChipText: { fontSize: 9, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  addFieldBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.green, borderRadius: 10, paddingVertical: 12, marginTop: 4,
  },
  addFieldBtnText: { fontSize: 10, fontWeight: '900', color: '#050A1F', letterSpacing: 1, textTransform: 'uppercase' },

  // PLATFORM
  platformCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12 },
  platformCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  platformCardTitle: { fontSize: 10, fontWeight: '900', color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  platformRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  platformRowLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: C.textSecondary },
  platformStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  platformStatusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  buildOption: { borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1 },
  buildOptionTitle: { fontSize: 9, fontWeight: '900', marginBottom: 4, letterSpacing: 0.3 },
  buildOptionDetail: { fontSize: 8, color: C.textMuted, lineHeight: 14 },

  // ACTIVE MISSION
  missionActiveHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(0,229,255,0.08)', borderWidth: 1, borderColor: C.borderB,
    alignItems: 'center', justifyContent: 'center',
  },
  missionActiveType: { fontSize: 8, fontWeight: '900', color: C.cyan, textTransform: 'uppercase', letterSpacing: 1 },
  missionActiveName: { fontSize: 13, fontWeight: '900', color: C.textPrimary },
  fastBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
    backgroundColor: 'rgba(255,214,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,214,0,0.5)',
  },
  fastBtnText: { fontSize: 8, fontWeight: '900', color: C.amber, textTransform: 'uppercase', letterSpacing: 0.5 },

  mapHeader: {
    height: 140, backgroundColor: '#090D24', overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  mapGrid: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row', flexWrap: 'wrap', padding: 8, opacity: 0.25,
  },
  mapDot: { width: 12, height: 12, margin: 4, borderWidth: 0.5, borderColor: C.borderB, borderRadius: 2, opacity: 0.4 },
  mapProgressRow: {
    position: 'absolute', top: 10, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(5,10,31,0.85)', borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: C.border,
  },
  mapProgressText: { fontSize: 10, fontWeight: '900', color: C.cyan, minWidth: 40, textAlign: 'right' },
  mapNavRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mapAddressChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.border,
  },
  mapAddressText: { fontSize: 10, fontWeight: '900', color: C.textPrimary },

  activeMissionBody: { padding: 16, paddingBottom: 60 },
  nextStopHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  nextStopLabel: { fontSize: 9, fontWeight: '900', color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  nextStopAddress: { fontSize: 22, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.3 },
  nextStopUnit: { fontSize: 11, fontWeight: '600', color: C.textSecondary, marginTop: 2 },
  partyChips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 },
  partyChip: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  partyChipText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  voterCount: { fontSize: 10, fontWeight: '700', color: C.textSecondary },
  oppSign: { fontSize: 9, fontWeight: '900', color: C.red },
  stopNotes: { fontSize: 9, color: C.textMuted, fontStyle: 'italic', marginTop: 6 },
  walkTime: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(0,229,255,0.1)', borderWidth: 1, borderColor: C.borderB,
  },
  walkTimeValue: { fontSize: 20, fontWeight: '900', color: C.cyan, letterSpacing: -0.5 },
  walkTimeLabel: { fontSize: 7, fontWeight: '900', color: `${C.cyan}99`, textTransform: 'uppercase', letterSpacing: 0.5 },

  turfCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 12 },
  turfCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  turfCardTitle: { fontSize: 8, fontWeight: '900', color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  turfSides: { flexDirection: 'row', gap: 8 },
  turfSideBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(15,20,64,0.6)', borderWidth: 1.5, borderColor: C.border,
  },
  turfSideBtnActive: { borderColor: C.cyan, backgroundColor: 'rgba(0,229,255,0.1)' },
  turfSideBtnText: { fontSize: 9, fontWeight: '900', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  turfClaimedText: { fontSize: 7, fontWeight: '700', color: C.cyan, opacity: 0.7, marginTop: 2 },

  teamStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  teamChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  teamMiniAvatar: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  teamMiniAvatarText: { fontSize: 6, fontWeight: '900', color: '#fff' },
  teamChipName: { fontSize: 9, fontWeight: '800' },
  teamChipSide: { fontSize: 8, color: C.textMuted },

  arrivedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.cyan, borderRadius: 20, paddingVertical: 18, marginTop: 4,
    ...Platform.select({ ios: { shadowColor: C.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 16 }, android: { elevation: 8 } }),
  },
  arrivedBtnText: { fontSize: 15, fontWeight: '900', color: '#050A1F', letterSpacing: 1.5, textTransform: 'uppercase' },

  missionComplete: { alignItems: 'center', paddingTop: 60, gap: 12 },
  missionCompleteTitle: { fontSize: 22, fontWeight: '900', color: C.textPrimary, textTransform: 'uppercase', letterSpacing: 1 },
  missionCompleteBody: { fontSize: 13, color: C.textSecondary, textAlign: 'center' },
  returnBtn: {
    backgroundColor: 'rgba(41,121,255,0.15)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 1, borderColor: C.borderB, marginTop: 8,
  },
  returnBtnText: { fontSize: 12, fontWeight: '900', color: C.blue, letterSpacing: 1, textTransform: 'uppercase' },
});
