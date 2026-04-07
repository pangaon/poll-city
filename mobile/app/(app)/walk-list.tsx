/**
 * Walk List screen — today's doors to knock.
 *
 * Fetches contacts from /api/contacts, displays them as an ordered list
 * grouped by street address. Tap a contact to navigate to the Door screen.
 * Pull-to-refresh to re-fetch from the server.
 *
 * Design principles (from MOBILE_APP_ARCHITECTURE.md):
 *   - One hand, one thumb: 56px+ touch targets
 *   - Offline first: contacts cached in AsyncStorage
 *   - Sub-100ms interactions
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
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../lib/auth";
import { fetchContacts } from "../../lib/api";
import { getQueueStats } from "../../lib/sync";
import type { Contact } from "../../lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRAND_BLUE = "#1e40af";
const CACHE_KEY = "@poll_city_walk_list";

const SUPPORT_COLORS: Record<string, string> = {
  strong_support: "#16a34a",
  leaning_support: "#65a30d",
  undecided: "#ca8a04",
  leaning_opposition: "#ea580c",
  strong_opposition: "#dc2626",
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
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState(0);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  const campaignId = user?.activeCampaignId;

  // Load visited IDs from storage
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("@poll_city_visited_today");
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { ids: string[]; date: string };
          // Reset if it's a new day
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

  const markVisited = useCallback(
    async (contactId: string) => {
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
    },
    [],
  );

  // Load contacts
  const loadContacts = useCallback(
    async (showRefresh = false) => {
      if (!campaignId) return;
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await fetchContacts(campaignId, { pageSize: "200" });
        setContacts(result.data);
        // Cache for offline
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(result.data));
      } catch {
        // Try loading from cache
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          setContacts(JSON.parse(cached) as Contact[]);
          setError("Offline mode — showing cached walk list");
        } else {
          setError("Could not load walk list. Check your connection.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [campaignId],
  );

  // Sync stats
  useEffect(() => {
    const interval = setInterval(async () => {
      const stats = await getQueueStats();
      setSyncPending(stats.total);
    }, 5_000);
    return () => clearInterval(interval);
  }, []);

  // Initial load
  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Navigate to door screen
  const openDoor = useCallback(
    (contact: Contact) => {
      markVisited(contact.id);
      router.push({
        pathname: "/(app)/door/[id]",
        params: { id: contact.id, contactJson: JSON.stringify(contact) },
      });
    },
    [router, markVisited],
  );

  // Stats
  const totalDoors = contacts.length;
  const doorsVisited = contacts.filter((c) => visitedIds.has(c.id)).length;

  // Render
  const renderContact = useCallback(
    ({ item, index }: { item: Contact; index: number }) => {
      const visited = visitedIds.has(item.id);
      const supportColor =
        SUPPORT_COLORS[item.supportLevel] ?? SUPPORT_COLORS.unknown;
      const supportLabel =
        SUPPORT_LABELS[item.supportLevel] ?? "Unknown";

      return (
        <Pressable
          style={({ pressed }) => [
            styles.contactRow,
            visited && styles.contactRowVisited,
            pressed && styles.contactRowPressed,
          ]}
          onPress={() => openDoor(item)}
          accessibilityRole="button"
          accessibilityLabel={`Door ${index + 1}: ${item.firstName} ${item.lastName} at ${item.address1 ?? "no address"}`}
        >
          {/* Sequence number */}
          <View
            style={[
              styles.sequenceBadge,
              visited && styles.sequenceBadgeVisited,
            ]}
          >
            <Text
              style={[
                styles.sequenceText,
                visited && styles.sequenceTextVisited,
              ]}
            >
              {visited ? "\u2713" : index + 1}
            </Text>
          </View>

          {/* Contact info */}
          <View style={styles.contactInfo}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.contactAddress} numberOfLines={1}>
              {item.address1 ?? "No address"}
              {item.city ? `, ${item.city}` : ""}
            </Text>
          </View>

          {/* Support level badge */}
          <View
            style={[styles.supportBadge, { backgroundColor: supportColor }]}
          >
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
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={styles.loadingText}>Loading walk list...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Progress header */}
      <View style={styles.progressHeader}>
        <View style={styles.progressStats}>
          <Text style={styles.progressNumber}>
            {doorsVisited}
            <Text style={styles.progressSlash}> / {totalDoors}</Text>
          </Text>
          <Text style={styles.progressLabel}>doors visited</Text>
        </View>

        {syncPending > 0 && (
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>
              {syncPending} pending sync
            </Text>
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
            {
              width:
                totalDoors > 0
                  ? `${Math.round((doorsVisited / totalDoors) * 100)}%`
                  : "0%",
            },
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
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadContacts(true)}
            tintColor={BRAND_BLUE}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No doors assigned</Text>
            <Text style={styles.emptySubtitle}>
              Ask your campaign manager to assign you a walk list.
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
    backgroundColor: "#f8fafc",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 15,
  },

  // Progress header
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  progressStats: {
    flex: 1,
  },
  progressNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  progressSlash: {
    fontSize: 18,
    fontWeight: "500",
    color: "#94a3b8",
  },
  progressLabel: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  syncBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  syncBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },
  endShiftButton: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  endShiftText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Progress bar
  progressBarTrack: {
    height: 4,
    backgroundColor: "#e2e8f0",
  },
  progressBarFill: {
    height: 4,
    backgroundColor: "#16a34a",
  },

  // Error
  errorBanner: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    color: "#92400e",
    fontSize: 13,
    textAlign: "center",
  },

  // List
  listContent: {
    paddingVertical: 8,
  },
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
  contactRowVisited: {
    opacity: 0.6,
    backgroundColor: "#f1f5f9",
  },
  contactRowPressed: {
    backgroundColor: "#eff6ff",
  },

  // Sequence badge
  sequenceBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sequenceBadgeVisited: {
    backgroundColor: "#dcfce7",
  },
  sequenceText: {
    fontSize: 14,
    fontWeight: "700",
    color: BRAND_BLUE,
  },
  sequenceTextVisited: {
    color: "#16a34a",
    fontSize: 18,
  },

  // Contact info
  contactInfo: {
    flex: 1,
    marginRight: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  contactAddress: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },

  // Support badge
  supportBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 56,
    alignItems: "center",
  },
  supportBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
