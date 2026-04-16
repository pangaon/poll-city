/**
 * Canvassing tab — Field Command screen.
 *
 * Dark-theme redesign matching the Figma "Field Command + War Room v3" design.
 * Design system: #050A1F bg, #0F1440 cards, #2979FF blue, #00E5FF cyan, etc.
 *
 * Data flow:
 *   GET /api/canvassing/turfs?campaignId=X  (real API, Bearer token)
 *   Offline fallback: cached contacts from walk-list screen
 *
 * Auth: uses the JWT stored in expo-secure-store via lib/auth.ts + lib/api.ts
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Map, ChevronRight, WifiOff, RefreshCw, Activity, Zap } from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { fetchTurfs, type TurfSummary } from '../../../lib/api';
import { processQueue, getQueueStats } from '../../../lib/sync';
import { OfflineIndicator } from '../../../components/offline-indicator';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const C = {
  bg: '#050A1F',
  card: '#0F1440',
  blue: '#2979FF',
  cyan: '#00E5FF',
  red: '#FF3B30',
  green: '#00C853',
  amber: '#FFD600',
  textPrimary: '#F5F7FF',
  textSecondary: '#AAB2FF',
  textMuted: '#6B72A0',
  border: 'rgba(41, 121, 255, 0.2)',
  borderB: 'rgba(0, 229, 255, 0.3)',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: 'DRAFT',       color: C.textMuted },
  active:    { label: 'ACTIVE',      color: C.green },
  completed: { label: 'COMPLETE',    color: '#444E7C' },
  assigned:  { label: 'ASSIGNED',    color: C.amber },
  in_progress: { label: 'IN PROGRESS', color: C.cyan },
};

// ---------------------------------------------------------------------------
// Progress bar component
// ---------------------------------------------------------------------------

function ProgressBar({ percent, color = C.cyan }: { percent: number; color?: string }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${clamped}%` as unknown as number, backgroundColor: color }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: 'rgba(41, 121, 255, 0.15)',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  fill: {
    height: 3,
    borderRadius: 2,
  },
});

// ---------------------------------------------------------------------------
// Turf card
// ---------------------------------------------------------------------------

interface TurfCardProps {
  turf: TurfSummary;
  onPress: (turf: TurfSummary) => void;
}

const TurfCard = React.memo(function TurfCard({ turf, onPress }: TurfCardProps) {
  const statusCfg = STATUS_CONFIG[turf.status] ?? STATUS_CONFIG.active;
  const pct = Math.round(turf.completionPercent);
  const isActive = turf.status === 'active' || turf.status === 'in_progress';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isActive && styles.cardActive,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(turf)}
      accessibilityRole="button"
      accessibilityLabel={`Turf: ${turf.name}, ${turf.completedCount} of ${turf.contactCount} doors completed`}
    >
      {/* Left accent bar */}
      <View style={[styles.cardAccentBar, { backgroundColor: statusCfg.color }]} />

      <View style={styles.cardInner}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Map size={14} color={C.cyan} style={styles.cardIcon} />
            <Text style={styles.cardName} numberOfLines={1}>
              {turf.name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: statusCfg.color }]}>
            <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Ward label */}
        {turf.ward ? (
          <Text style={styles.cardWard} numberOfLines={1}>
            Ward {turf.ward}
          </Text>
        ) : null}

        {/* Stats row */}
        <View style={styles.cardStats}>
          <Text style={styles.cardStatsText}>
            <Text style={styles.cardStatsHighlight}>{turf.completedCount}</Text>
            <Text style={styles.cardStatsDivider}> / </Text>
            <Text style={styles.cardStatsDivider}>{turf.contactCount}</Text>
            <Text style={styles.cardStatsDivider}> doors</Text>
          </Text>
          <Text style={styles.cardPct}>{pct}%</Text>
        </View>

        {/* Progress bar */}
        <ProgressBar
          percent={turf.completionPercent}
          color={pct >= 80 ? C.green : pct >= 40 ? C.cyan : C.blue}
        />

        {/* Footer */}
        <View style={styles.cardFooter}>
          {turf.estimatedMinutes ? (
            <Text style={styles.cardEst}>~{turf.estimatedMinutes} min</Text>
          ) : (
            <View />
          )}
          <View style={styles.cardAction}>
            <Text style={styles.cardActionText}>OPEN TURF</Text>
            <ChevronRight size={12} color={C.cyan} />
          </View>
        </View>
      </View>
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Stats strip
// ---------------------------------------------------------------------------

interface StatPillProps {
  label: string;
  value: string | number;
  color?: string;
}

function StatPill({ label, value, color = C.cyan }: StatPillProps) {
  return (
    <View style={statStyles.pill}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(15, 20, 64, 0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginHorizontal: 3,
    minHeight: 56,
    justifyContent: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 8,
    fontWeight: '700',
    color: C.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CanvassingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const campaignId = user?.activeCampaignId ?? '';

  const [turfs, setTurfs] = useState<TurfSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadTurfs = useCallback(
    async (showRefresh = false) => {
      if (!campaignId) {
        setLoading(false);
        setError('No active campaign. Ask your campaign manager to assign you to a campaign.');
        return;
      }

      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await fetchTurfs(campaignId);
        setTurfs(result.data);
      } catch {
        setError('Could not load turfs. Check your connection.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    loadTurfs();
  }, [loadTurfs]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const stats = await getQueueStats();
      setSyncPending(stats.pending + stats.failed);
    }, 8_000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await processQueue();
      const stats = await getQueueStats();
      setSyncPending(stats.pending + stats.failed);
    } finally {
      setSyncing(false);
    }
  }, []);

  const openTurf = useCallback(
    (turf: TurfSummary) => {
      router.push({
        pathname: '/(app)/walk-list',
        params: { turfId: turf.id, turfName: turf.name, campaignId },
      });
    },
    [router, campaignId],
  );

  // Aggregate stats
  const totalTurfs = turfs.length;
  const activeTurfs = turfs.filter(t => t.status === 'active' || t.status === 'in_progress').length;
  const totalDoors = turfs.reduce((acc, t) => acc + t.contactCount, 0);
  const doorsKnocked = turfs.reduce((acc, t) => acc + t.completedCount, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={styles.loadingText}>Loading field command...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <OfflineIndicator />

      {/* Sync banner */}
      {syncPending > 0 && (
        <View style={styles.syncBanner}>
          <View style={styles.syncBannerLeft}>
            <WifiOff size={13} color={C.amber} />
            <Text style={styles.syncBannerText}>
              {'  '}{syncPending} interaction{syncPending !== 1 ? 's' : ''} pending sync
            </Text>
          </View>
          <Pressable
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={syncing}
            accessibilityRole="button"
            accessibilityLabel="Sync pending interactions"
          >
            {syncing ? (
              <ActivityIndicator size="small" color={C.amber} />
            ) : (
              <>
                <RefreshCw size={11} color={C.amber} />
                <Text style={styles.syncButtonText}> Sync</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={turfs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TurfCard turf={item} onPress={openTurf} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTurfs(true)}
            tintColor={C.cyan}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Field Command header */}
            <View style={styles.headerBlock}>
              <View style={styles.headerTitleRow}>
                <View style={styles.liveDot} />
                <Text style={styles.headerTitle}>FIELD COMMAND</Text>
              </View>
              <Text style={styles.headerSubtitle}>
                {activeTurfs} active · {totalTurfs} total turf{totalTurfs !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Stats strip */}
            <View style={styles.statsStrip}>
              <StatPill label="TURFS ACTIVE" value={activeTurfs} color={C.cyan} />
              <StatPill label="DOORS KNOCKED" value={doorsKnocked} color={C.blue} />
              <StatPill label="TOTAL DOORS" value={totalDoors} color={C.textSecondary} />
            </View>

            {turfs.length > 0 && (
              <View style={styles.listLabelRow}>
                <Activity size={11} color={C.textMuted} />
                <Text style={styles.listLabel}>
                  {'  '}YOUR ASSIGNED TURFS
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Map size={32} color={C.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Turfs Assigned</Text>
            <Text style={styles.emptySubtitle}>
              Ask your campaign manager to assign you a canvassing turf.
            </Text>
          </View>
        }
      />

      {/* FAB — Deploy */}
      {turfs.length > 0 && (
        <View style={styles.fabContainer} pointerEvents="box-none">
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            onPress={() => {
              const firstActive = turfs.find(t => t.status === 'active' || t.status === 'in_progress' || t.status === 'assigned');
              if (firstActive) openTurf(firstActive);
            }}
            accessibilityRole="button"
            accessibilityLabel="Start knocking doors"
          >
            <Zap size={18} color={C.bg} />
            <Text style={styles.fabText}>START KNOCKING</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  loadingText: {
    marginTop: 12,
    color: C.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Sync banner
  syncBanner: {
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 214, 0, 0.2)',
  },
  syncBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.amber,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.amber,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Error banner
  errorBanner: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 59, 48, 0.2)',
  },
  errorBannerText: {
    fontSize: 12,
    color: C.red,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Header block
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.green,
    marginRight: 8,
    ...Platform.select({
      ios: {
        shadowColor: C.green,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
    }),
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: C.cyan,
    letterSpacing: 2,
    textTransform: 'uppercase',
    ...Platform.select({
      ios: {
        shadowColor: C.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
      },
    }),
  },
  headerSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    paddingHorizontal: 13,
    paddingBottom: 16,
  },

  // List label
  listLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
  },
  listLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // List
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
    gap: 10,
  },

  // Turf card
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardActive: {
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  cardPressed: {
    backgroundColor: 'rgba(41, 121, 255, 0.15)',
  },
  cardAccentBar: {
    width: 3,
    borderRadius: 0,
  },
  cardInner: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 7,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '800',
    color: C.textPrimary,
    flex: 1,
    letterSpacing: 0.2,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardWard: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 2,
    fontWeight: '500',
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  cardStatsText: {
    fontSize: 13,
    color: C.textSecondary,
  },
  cardStatsHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: C.cyan,
  },
  cardStatsDivider: {
    color: C.textMuted,
    fontWeight: '500',
  },
  cardPct: {
    fontSize: 13,
    fontWeight: '800',
    color: C.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  cardEst: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500',
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.cyan,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.blue,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 16,
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: C.blue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabPressed: {
    backgroundColor: '#1565C0',
    transform: [{ scale: 0.97 }],
  },
  fabText: {
    fontSize: 14,
    fontWeight: '900',
    color: C.bg,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
