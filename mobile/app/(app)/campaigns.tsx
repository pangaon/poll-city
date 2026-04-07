/**
 * Campaign Select screen — choose which campaign to canvass for.
 *
 * Lists all campaigns the user belongs to. Each card shows name,
 * candidate, election date, and days remaining. Tapping selects
 * the campaign and navigates to the walk list.
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
import { fetchCampaigns } from "../../lib/api";
import { OfflineIndicator } from "../../components/offline-indicator";
import type { Campaign } from "../../lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const CACHE_KEY = "@poll_city_campaigns";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysUntil(dateString: string | null): number | null {
  if (!dateString) return null;
  const target = new Date(dateString);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "No date set";
  const d = new Date(dateString);
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CampaignSelectScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await fetchCampaigns();
        setCampaigns(result.data);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(result.data));
      } catch {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          setCampaigns(JSON.parse(cached) as Campaign[]);
          setError("Offline mode — showing cached campaigns");
        } else {
          setError("Could not load campaigns. Check your connection.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const selectCampaign = useCallback(
    (campaign: Campaign) => {
      // Store selected campaign and navigate to walk list
      AsyncStorage.setItem("@poll_city_active_campaign", campaign.id).catch(
        () => {},
      );
      router.replace("/(app)/walk-list");
    },
    [router],
  );

  const renderCampaign = useCallback(
    ({ item }: { item: Campaign }) => {
      const days = daysUntil(item.electionDate);
      const isUrgent = days !== null && days >= 0 && days <= 7;
      const isPast = days !== null && days < 0;

      return (
        <Pressable
          style={({ pressed }) => [
            styles.card,
            pressed && styles.cardPressed,
          ]}
          onPress={() => selectCampaign(item)}
          accessibilityRole="button"
          accessibilityLabel={`Select campaign: ${item.name}`}
        >
          {/* Campaign name */}
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>

          {/* Candidate */}
          <Text style={styles.cardCandidate} numberOfLines={1}>
            {item.candidateName}
          </Text>

          {/* Election date */}
          <Text style={styles.cardDate}>
            {formatDate(item.electionDate)}
          </Text>

          {/* Days remaining badge */}
          {days !== null && (
            <View
              style={[
                styles.daysBadge,
                isPast && styles.daysBadgePast,
                isUrgent && !isPast && styles.daysBadgeUrgent,
              ]}
            >
              <Text
                style={[
                  styles.daysBadgeText,
                  isPast && styles.daysBadgeTextPast,
                  isUrgent && !isPast && styles.daysBadgeTextUrgent,
                ]}
              >
                {isPast
                  ? "Election passed"
                  : days === 0
                    ? "Election day!"
                    : `${days} day${days !== 1 ? "s" : ""} remaining`}
              </Text>
            </View>
          )}

          {/* Municipality / Province */}
          {item.municipality && (
            <Text style={styles.cardLocation} numberOfLines={1}>
              {item.municipality}
              {item.province ? `, ${item.province}` : ""}
            </Text>
          )}
        </Pressable>
      );
    },
    [selectCampaign],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading campaigns...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <OfflineIndicator />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Your Campaigns</Text>
          <Text style={styles.headerSubtitle}>
            {user?.name ?? "Canvasser"}
          </Text>
        </View>
        <Pressable
          style={styles.signOutButton}
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Campaign list */}
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={renderCampaign}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCampaigns(true)}
            tintColor={NAVY}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No campaigns found</Text>
            <Text style={styles.emptySubtitle}>
              Ask your campaign manager to add you to a campaign.
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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: NAVY,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  signOutButton: {
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
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
    padding: 16,
    gap: 12,
  },

  // Campaign card
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 56,
  },
  cardPressed: {
    backgroundColor: "#f1f5f9",
  },
  cardName: {
    fontSize: 18,
    fontWeight: "700",
    color: NAVY,
    marginBottom: 4,
  },
  cardCandidate: {
    fontSize: 15,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 6,
  },
  cardDate: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 8,
  },
  cardLocation: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 6,
  },

  // Days badge
  daysBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  daysBadgeUrgent: {
    backgroundColor: "#fef3c7",
  },
  daysBadgePast: {
    backgroundColor: "#f1f5f9",
  },
  daysBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN,
  },
  daysBadgeTextUrgent: {
    color: AMBER,
  },
  daysBadgeTextPast: {
    color: "#94a3b8",
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
