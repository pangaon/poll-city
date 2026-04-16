/**
 * Walk List screen — ordered doors for a turf.
 *
 * Dark-theme redesign matching the Figma "Field Command + War Room v3" design.
 *
 * Accepts params: { turfId, turfName, campaignId }
 *
 * Data:  GET /api/canvassing/walk?turfId=X&campaignId=Y
 * Offline fallback: AsyncStorage cache keyed by turfId
 *
 * Features:
 * - Progress header: X / Y doors visited
 * - Support level colour left-border stripe
 * - Green checkmark for visited doors
 * - Offline indicator banner
 * - Pull-to-refresh
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChevronLeft, MapPin, Check, Zap } from "lucide-react-native";
import { fetchWalkList, vcardUrl, type WalkStop } from "../../lib/api";
import { getQueueStats } from "../../lib/sync";
import { OfflineIndicator } from "../../components/offline-indicator";

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
};

function cacheKey(turfId: string) {
  return `@poll_city_walk_turf_${turfId}`;
}

const SUPPORT_COLORS: Record<string, string> = {
  strong_support: C.green,
  leaning_support: '#4CAF50',
  undecided: C.amber,
  leaning_opposition: '#FF9F0A',
  strong_opposition: C.red,
  unknown: C.textMuted,
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
  const turfName = params.turfName ?? "Turf";
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

  // Open native maps
  const openMaps = useCallback((stop: WalkStop) => {
    const addr = [stop.contact.address1, stop.contact.city].filter(Boolean).join(", ");
    if (!addr) return;
    const encoded = encodeURIComponent(addr);
    const url =
      Platform.OS === "ios"
        ? `maps://?q=${encoded}`
        : `geo:0,0?q=${encoded}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${encoded}`);
    });
  }, []);

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
            styles.doorCard,
            pressed && styles.doorCardPressed,
          ]}
          onPress={() => openDoor(item)}
          accessibilityRole="button"
          accessibilityLabel={`Door ${index + 1}: ${item.contact.firstName} ${item.contact.lastName}`}
        >
          {/* Support colour stripe */}
          <View style={[styles.doorStripe, { backgroundColor: supportColor, opacity: visited ? 0.4 : 1 }]} />

          {/* Door number badge */}
          <View style={[styles.doorBadge, visited && styles.doorBadgeVisited]}>
            {visited ? (
              <Check size={16} color={C.green} strokeWidth={3} />
            ) : (
              <Text style={styles.doorBadgeText}>{item.order}</Text>
            )}
          </View>

          {/* Contact info */}
          <View style={styles.doorInfo}>
            <Text
              style={[styles.doorName, visited && styles.doorNameVisited]}
              numberOfLines={1}
            >
              {item.contact.firstName} {item.contact.lastName}
            </Text>
            <Text style={styles.doorAddress} numberOfLines={1}>
              {item.contact.address1 ?? "No address"}
              {item.contact.city ? `, ${item.contact.city}` : ""}
            </Text>
            {item.contact.phone ? (
              <Text style={styles.doorPhone} numberOfLines={1}>
                {item.contact.phone}
              </Text>
            ) : null}
          </View>

          {/* Right side: support badge + map */}
          <View style={styles.doorRight}>
            <View style={[styles.supportBadge, { borderColor: `${supportColor}50`, backgroundColor: `${supportColor}18` }]}>
              <Text style={[styles.supportBadgeText, { color: supportColor }]}>
                {supportLabel}
              </Text>
            </View>

            {item.contact.address1 && (
              <Pressable
                style={({ pressed }) => [styles.mapButton, pressed && styles.mapButtonPressed]}
                onPress={(e) => { e.stopPropagation?.(); openMaps(item); }}
                accessibilityRole="button"
                accessibilityLabel={`Open map for ${item.contact.firstName}`}
                hitSlop={8}
              >
                <MapPin size={14} color={C.textMuted} />
              </Pressable>
            )}
          </View>
        </Pressable>
      );
    },
    [visitedIds, openDoor, openMaps],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={C.cyan} />
        <Text style={styles.loadingText}>Loading walk list...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <OfflineIndicator />

      {/* Dark header with back button, turf name, and progress */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <ChevronLeft size={22} color={C.cyan} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{turfName}</Text>
          <Text style={styles.headerSubtitle}>
            {doorsVisited} of {totalDoors} doors
          </Text>
        </View>

        <View style={styles.headerRight}>
          {syncPending > 0 && (
            <View style={styles.syncBadge}>
              <Text style={styles.syncBadgeText}>{syncPending}</Text>
            </View>
          )}
          <Pressable
            style={styles.endShiftButton}
            onPress={() => router.push("/(app)/shift-summary")}
            accessibilityRole="button"
            accessibilityLabel="End shift"
          >
            <Text style={styles.endShiftText}>END</Text>
          </Pressable>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progressPct}%` as unknown as number },
          ]}
        />
        <View style={styles.progressPctLabel}>
          <Text style={styles.progressPctText}>{progressPct}%</Text>
        </View>
      </View>

      {/* Error / offline banner */}
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
            tintColor={C.cyan}
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

      {/* Quick Capture FAB */}
      {stops.length > 0 && (
        <View style={styles.fabContainer} pointerEvents="box-none">
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            onPress={() => {
              // Find first unvisited stop and open it
              const nextStop = stops.find(s => !visitedIds.has(s.contactId) && !s.visited && !s.contact.doNotContact);
              if (nextStop) openDoor(nextStop);
            }}
            accessibilityRole="button"
            accessibilityLabel="Quick capture — next door"
          >
            <Zap size={16} color={C.bg} />
            <Text style={styles.fabText}>NEXT DOOR</Text>
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
  safe: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  loadingText: {
    marginTop: 12,
    color: C.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBadge: {
    backgroundColor: 'rgba(255, 214, 0, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.amber,
  },
  endShiftButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  endShiftText: {
    color: C.red,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Progress bar
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(41, 121, 255, 0.15)',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: C.cyan,
    ...Platform.select({
      ios: {
        shadowColor: C.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
    }),
  },
  progressPctLabel: {
    position: 'absolute',
    right: 8,
    top: -12,
  },
  progressPctText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.cyan,
    letterSpacing: 0.5,
  },

  errorBanner: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 59, 48, 0.2)',
  },
  errorText: {
    color: C.red,
    fontSize: 12,
    textAlign: "center",
    fontWeight: '600',
  },

  listContent: { paddingVertical: 10, paddingBottom: 100 },

  // Door card
  doorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    minHeight: 72,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  doorCardPressed: {
    backgroundColor: 'rgba(41, 121, 255, 0.12)',
  },
  doorStripe: {
    width: 3,
    alignSelf: 'stretch',
  },
  doorBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(41, 121, 255, 0.1)',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
    flexShrink: 0,
  },
  doorBadgeVisited: {
    backgroundColor: 'rgba(0, 200, 83, 0.1)',
    borderColor: 'rgba(0, 200, 83, 0.3)',
  },
  doorBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.textSecondary,
  },
  doorInfo: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
  },
  doorName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: 0.2,
  },
  doorNameVisited: {
    color: C.textMuted,
  },
  doorAddress: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  doorPhone: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
  },
  doorRight: {
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
    paddingVertical: 10,
  },
  supportBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    minWidth: 60,
    alignItems: "center",
  },
  supportBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mapButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(107, 114, 160, 0.1)',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  mapButtonPressed: {
    backgroundColor: 'rgba(107, 114, 160, 0.2)',
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.blue,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 50,
    ...Platform.select({
      ios: {
        shadowColor: C.blue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabPressed: {
    backgroundColor: '#1565C0',
  },
  fabText: {
    fontSize: 12,
    fontWeight: '900',
    color: C.bg,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
