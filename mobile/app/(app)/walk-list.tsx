/**
 * Walk List screen — ordered doors for a turf.
 *
 * Accepts params: { turfId, turfName, campaignId }
 *
 * Data:  GET /api/canvassing/walk?turfId=X&campaignId=Y
 * Offline fallback: AsyncStorage cache keyed by turfId
 *
 * Features:
 * - Progress header: X / Y doors visited
 * - 56px touch targets
 * - Support level colour badge
 * - Green checkmark for visited doors
 * - Offline indicator banner
 * - Pull-to-refresh
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchWalkList, type WalkStop } from "../../lib/api";
import { getQueueStats } from "../../lib/sync";
import { OfflineIndicator } from "../../components/offline-indicator";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

function cacheKey(turfId: string) {
  return `@poll_city_walk_turf_${turfId}`;
}

const SUPPORT_COLORS: Record<string, string> = {
  strong_support: GREEN,
  leaning_support: "#6BBF8A",
  undecided: AMBER,
  leaning_opposition: "#E8764B",
  strong_opposition: RED,
  unknown: "#94a3b8",
};

const SUPPORT_LABELS: Record<string, string> = {
  strong_support: "Strong",
  leaning_support: "Lean",
  undecided: "Undecided",
  leaning_opposition: "Lean Opp",
  strong_opposition: "Opp",
  unknown: "Unknown",
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function WalkListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    turfId?: string;
    turfName?: string;
    campaignId?: string;
  }>();

  const turfId = params.turfId ?? "";
  const campaignId = params.campaignId ?? "";

  const [stops, setStops] = useState<WalkStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState(0);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  // Load visited IDs for today
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("@poll_city_visited_today");
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { ids: string[]; date: string };
          const today = new Date().toISOString().split("T")[0];
          if (parsed.date === today) {
            setVisitedIds(new Set(parsed.ids));
          }
        } catch {
          // ignore
        }
      }
    })();
  }, []);

  const markVisited = useCallback((contactId: string) => {
    setVisitedIds((prev) => {
      const next = new Set(prev);
      next.add(contactId);
      const today = new Date().toISOString().split("T")[0];
      AsyncStorage.setItem(
        "@poll_city_visited_today",
        JSON.stringify({ ids: Array.from(next), date: today }),
      ).catch(() => {});
      return next;
    });
  }, []);

  // Load walk list
  const loadStops = useCallback(
    async (showRefresh = false) => {
      if (!turfId || !campaignId) {
        setLoading(false);
        return;
      }
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await fetchWalkList(turfId, campaignId);
        setStops(result.data);
        await AsyncStorage.setItem(cacheKey(turfId), JSON.stringify(result.data));
      } catch {
        // Offline — try cache
        const cached = await AsyncStorage.getItem(cacheKey(turfId));
        if (cached) {
          setStops(JSON.parse(cached) as WalkStop[]);
          setError("Offline — showing cached walk list");
        } else {
          setError("Could not load walk list. Check your connection.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [turfId, campaignId],
  );

  // Sync stats
  useEffect(() => {
    const interval = setInterval(async () => {
      const stats = await getQueueStats();
      setSyncPending(stats.total);
    }, 5_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadStops();
  }, [loadStops]);

  // Navigate to door screen
  const openDoor = useCallback(
    (stop: WalkStop) => {
      markVisited(stop.contactId);
      router.push({
        pathname: "/(app)/door/[id]",
        params: {
          id: stop.contactId,
          contactJson: JSON.stringify({
            id: stop.contact.id,
            firstName: stop.contact.firstName,
            lastName: stop.contact.lastName,
            address1: stop.contact.address1,
            phone: stop.contact.phone,
            supportLevel: stop.contact.supportLevel,
            doNotContact: stop.contact.doNotContact,
          }),
        },
      });
    },
    [router, markVisited],
  );

  // Stats
  const totalDoors = stops.length;
  const doorsVisited = stops.filter((s) => visitedIds.has(s.contactId) || s.visited).length;
  const progressPct =
    totalDoors > 0 ? Math.round((doorsVisited / totalDoors) * 100) : 0;

  const renderStop = useCallback(
    ({ item, index }: { item: WalkStop; index: number }) => {
      if (item.contact.doNotContact) return null;

      const visited = visitedIds.has(item.contactId) || item.visited;
      const supportColor = SUPPORT_COLORS[item.contact.supportLevel] ?? SUPPORT_COLORS.unknown;
      const supportLabel = SUPPORT_LABELS[item.contact.supportLevel] ?? "Unknown";

      return (
        <Pressable
          style={({ pressed }) => [
            styles.contactRow,
            visited && styles.contactRowVisited,
            pressed && styles.contactRowPressed,
          ]}
          onPress={() => openDoor(item)}
          accessibilityRole="button"
          accessibilityLabel={`Door ${index + 1}: ${item.contact.firstName} ${item.contact.lastName}`}
        >
          {/* Sequence badge */}
          <View style={[styles.sequenceBadge, visited && styles.sequenceBadgeVisited]}>
            <Text style={[styles.sequenceText, visited && styles.sequenceTextVisited]}>
              {visited ? "\u2713" : item.order}
            </Text>
          </View>

          {/* Contact info */}
          <View style={styles.contactInfo}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.contact.firstName} {item.contact.lastName}
            </Text>
            <Text style={styles.contactAddress} numberOfLines={1}>
              {item.contact.address1 ?? "No address"}
              {item.contact.city ? `, ${item.contact.city}` : ""}
            </Text>
          </View>

          {/* Support badge */}
          <View style={[styles.supportBadge, { backgroundColor: supportColor }]}>
            <Text style={styles.supportBadgeText}>{supportLabel}</Text>
          </View>
        </Pressable>
      );
    },
    [visitedIds, openDoor],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading walk list...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <OfflineIndicator />

      {/* Progress header */}
      <View style={styles.progressHeader}>
        <View style={styles.progressStats}>
          <Text style={styles.progressNumber}>
            {doorsVisited}
            <Text style={styles.progressSlash}> / {totalDoors}</Text>
          </Text>
          <Text style={styles.progressLabel}>doors visited ({progressPct}%)</Text>
        </View>

        {syncPending > 0 && (
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>{syncPending} pending sync</Text>
          </View>
        )}

        <Pressable
          style={styles.endShiftButton}
          onPress={() => router.push("/(app)/shift-summary")}
          accessibilityRole="button"
          accessibilityLabel="End shift"
        >
          <Text style={styles.endShiftText}>End Shift</Text>
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progressPct}%` as unknown as number },
          ]}
        />
      </View>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Contact list */}
      <FlatList
        data={stops}
        keyExtractor={(item) => item.id}
        renderItem={renderStop}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStops(true)}
            tintColor={NAVY}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No doors in this turf</Text>
            <Text style={styles.emptySubtitle}>
              Ask your campaign manager to add contacts to this turf.
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
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" },
  loadingText: { marginTop: 12, color: "#64748b", fontSize: 15 },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  progressStats: { flex: 1 },
  progressNumber: { fontSize: 28, fontWeight: "800", color: NAVY },
  progressSlash: { fontSize: 18, fontWeight: "500", color: "#94a3b8" },
  progressLabel: { fontSize: 13, color: "#64748b", marginTop: 2 },
  syncBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  syncBadgeText: { fontSize: 12, fontWeight: "600", color: "#92400e" },
  endShiftButton: {
    backgroundColor: RED,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 56,
    justifyContent: "center",
  },
  endShiftText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },

  progressBarTrack: { height: 4, backgroundColor: "#e2e8f0" },
  progressBarFill: { height: 4, backgroundColor: GREEN },

  errorBanner: { backgroundColor: "#fef3c7", paddingHorizontal: 16, paddingVertical: 8 },
  errorText: { color: "#92400e", fontSize: 13, textAlign: "center" },

  listContent: { paddingVertical: 8 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 12,
    marginVertical: 3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 64,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contactRowVisited: { opacity: 0.6, backgroundColor: "#f1f5f9" },
  contactRowPressed: { backgroundColor: "#eff6ff" },

  sequenceBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8EDF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sequenceBadgeVisited: { backgroundColor: "#dcfce7" },
  sequenceText: { fontSize: 14, fontWeight: "700", color: NAVY },
  sequenceTextVisited: { color: GREEN, fontSize: 18 },

  contactInfo: { flex: 1, marginRight: 8 },
  contactName: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  contactAddress: { fontSize: 13, color: "#64748b", marginTop: 2 },

  supportBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 56,
    alignItems: "center",
  },
  supportBadgeText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#334155" },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
