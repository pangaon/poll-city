/**
 * Canvassing tab — My Turfs screen.
 *
 * Shows the list of turfs assigned to this canvasser.
 * Tapping a turf navigates to the walk list for that turf.
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
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Map, ChevronRight, WifiOff, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { fetchTurfs, type TurfSummary } from '../../../lib/api';
import { processQueue, getQueueStats } from '../../../lib/sync';
import { OfflineIndicator } from '../../../components/offline-indicator';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAVY = '#0A2342';
const GREEN = '#1D9E75';
const AMBER = '#EF9F27';
const RED = '#E24B4A';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#94a3b8' },
  active: { label: 'Active', color: GREEN },
  completed: { label: 'Done', color: '#64748b' },
  assigned: { label: 'Assigned', color: AMBER },
};

// ---------------------------------------------------------------------------
// Progress bar component
// ---------------------------------------------------------------------------

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${clamped}%` as unknown as number }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    backgroundColor: GREEN,
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

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(turf)}
      accessibilityRole="button"
      accessibilityLabel={`Turf: ${turf.name}, ${turf.completedCount} of ${turf.contactCount} doors completed`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Map size={16} color={NAVY} style={styles.cardIcon} />
          <Text style={styles.cardName} numberOfLines={1}>
            {turf.name}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.color }]}>
          <Text style={styles.statusBadgeText}>{statusCfg.label}</Text>
        </View>
      </View>

      {turf.ward ? (
        <Text style={styles.cardWard} numberOfLines={1}>
          Ward {turf.ward}
        </Text>
      ) : null}

      <View style={styles.cardStats}>
        <Text style={styles.cardStatsText}>
          {turf.completedCount} / {turf.contactCount} doors
          {pct > 0 ? ` · ${pct}%` : ''}
        </Text>
        {turf.estimatedMinutes ? (
          <Text style={styles.cardEst}>~{turf.estimatedMinutes} min</Text>
        ) : null}
      </View>

      <ProgressBar percent={turf.completionPercent} />

      <View style={styles.cardFooter}>
        <Text style={styles.startText}>Start Canvassing</Text>
        <ChevronRight size={16} color={NAVY} />
      </View>
    </Pressable>
  );
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

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading your turfs...</Text>
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
            <WifiOff size={14} color="#92400e" />
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
              <ActivityIndicator size="small" color="#92400e" />
            ) : (
              <>
                <RefreshCw size={12} color="#92400e" />
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
            tintColor={NAVY}
          />
        }
        ListHeaderComponent={
          turfs.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                {turfs.length} turf{turfs.length !== 1 ? 's' : ''} assigned
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Map size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No turfs assigned</Text>
            <Text style={styles.emptySubtitle}>
              Ask your campaign manager to assign you a canvassing turf.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 15,
  },

  // Sync banner
  syncBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  syncBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fde68a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },

  // List
  listContent: {
    padding: 12,
    paddingBottom: 32,
    gap: 10,
  },
  listHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  listHeaderText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  // Turf card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: '#f0f9ff',
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
    marginRight: 8,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardWard: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardStatsText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  cardEst: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  startText: {
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
    marginRight: 4,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
