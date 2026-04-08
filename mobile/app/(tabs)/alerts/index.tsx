/**
 * Alerts screen.
 *
 * - Calls GET /api/alerts/summary?campaignId=X
 * - Shows critical alerts in red, warning in amber, watch in blue
 * - Tap alert → deep-link to web app
 * - Pull-to-refresh
 * - Summary counts at top (critical / warning)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ChevronRight, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { apiFetch, ApiError } from '../../../lib/api';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AlertSeverity = 'critical' | 'warning' | 'watch';

interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  module: string;
}

interface AlertsSummary {
  critical: number;
  warning: number;
  top: AlertItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAVY = '#0A2342';

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { bg: string; border: string; dot: string; label: string; textColor: string }
> = {
  critical: {
    bg: '#fef2f2',
    border: '#fecaca',
    dot: '#E24B4A',
    label: 'Critical',
    textColor: '#991b1b',
  },
  warning: {
    bg: '#fffbeb',
    border: '#fde68a',
    dot: '#EF9F27',
    label: 'Warning',
    textColor: '#92400e',
  },
  watch: {
    bg: '#eff6ff',
    border: '#bfdbfe',
    dot: '#3b82f6',
    label: 'Watch',
    textColor: '#1e40af',
  },
};

// ---------------------------------------------------------------------------
// Alert card
// ---------------------------------------------------------------------------

function AlertCard({
  alert,
  onPress,
}: {
  alert: AlertItem;
  onPress: (alert: AlertItem) => void;
}) {
  const cfg = SEVERITY_CONFIG[alert.severity];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cfg.bg, borderColor: cfg.border },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(alert)}
      accessibilityRole="button"
      accessibilityLabel={`${cfg.label}: ${alert.title}`}
    >
      <View style={styles.cardLeft}>
        {/* Severity dot */}
        <View style={[styles.dot, { backgroundColor: cfg.dot }]} />

        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: cfg.textColor }]} numberOfLines={2}>
            {alert.title}
          </Text>
          <View style={styles.moduleBadge}>
            <Text style={[styles.moduleBadgeText, { color: cfg.textColor }]}>
              {alert.module}
            </Text>
          </View>
        </View>
      </View>

      <ChevronRight size={16} color={cfg.dot} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const BASE_URL: string =
  (Constants.expoConfig?.extra as { EXPO_PUBLIC_API_URL?: string } | undefined)
    ?.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  'https://app.poll.city';

export default function AlertsScreen() {
  const { user } = useAuth();
  const campaignId = user?.activeCampaignId ?? '';

  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(
    async (showRefresh = false) => {
      if (!campaignId) {
        setLoading(false);
        setError('No active campaign.');
        return;
      }

      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await apiFetch<AlertsSummary>('/api/alerts/summary', {
          params: { campaignId },
        });
        setSummary(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Error ${err.status}: ${err.message}`);
        } else {
          setError('Could not load alerts. Check your connection.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleAlertPress = useCallback(
    (alert: AlertItem) => {
      // Deep-link to the relevant web app module
      const moduleSlugMap: Record<string, string> = {
        GOTV: 'gotv',
        'Field Ops': 'canvassing',
        Finance: 'budget',
        Signs: 'signs',
        Volunteers: 'volunteers',
      };
      const slug = moduleSlugMap[alert.module] ?? 'dashboard';
      const url = `${BASE_URL}/campaigns/${campaignId}/${slug}`;
      Linking.openURL(url).catch(() => {});
    },
    [campaignId],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading alerts…</Text>
      </SafeAreaView>
    );
  }

  const alerts = summary?.top ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Summary header */}
      {summary ? (
        <View style={styles.summaryHeader}>
          <View style={styles.summaryBlock}>
            <Text style={[styles.summaryCount, { color: '#E24B4A' }]}>
              {summary.critical}
            </Text>
            <Text style={styles.summaryLabel}>Critical</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBlock}>
            <Text style={[styles.summaryCount, { color: '#EF9F27' }]}>
              {summary.warning}
            </Text>
            <Text style={styles.summaryLabel}>Warning</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBlock}>
            <Text style={[styles.summaryCount, { color: '#3b82f6' }]}>
              {Math.max(0, alerts.length - summary.critical - summary.warning)}
            </Text>
            <Text style={styles.summaryLabel}>Watch</Text>
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadAlerts()} style={styles.retryBtn}>
            <RefreshCw size={14} color="#92400e" />
            <Text style={styles.retryBtnText}> Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertCard alert={item} onPress={handleAlertPress} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAlerts(true)}
            tintColor={NAVY}
          />
        }
        ListHeaderComponent={
          alerts.length > 0 ? (
            <Text style={styles.listHeader}>
              Tap any alert to open in the web app
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyState}>
              <Bell size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>All clear</Text>
              <Text style={styles.emptySubtitle}>
                No active alerts for this campaign.
              </Text>
            </View>
          ) : null
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

  // Summary header
  summaryHeader: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 16,
  },
  summaryBlock: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 13,
    color: '#92400e',
    flex: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fde68a',
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },

  // List
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  listHeader: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    minHeight: 64,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 8,
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 6,
  },
  moduleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  moduleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
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
