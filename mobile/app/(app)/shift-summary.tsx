/**
 * Shift Summary screen — end-of-shift celebration for canvassers.
 *
 * "Celebrate the wins publicly. Debrief after every shift."
 *
 * Shows doors knocked, supporters found, conversion rate, leaderboard
 * rank, and a personalised encouragement message from the server.
 * Falls back to local stats if offline.
 */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../lib/auth";
import { fetchShiftSummary } from "../../lib/api";
import { getQueueStats } from "../../lib/sync";
import type { ShiftSummary } from "../../lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRAND_BLUE = "#1e40af";

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ShiftSummaryScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(0);

  const campaignId = user?.activeCampaignId;

  useEffect(() => {
    (async () => {
      // Check sync queue
      const stats = await getQueueStats();
      setPendingSync(stats.total);

      if (!campaignId) {
        setLoading(false);
        setError("No active campaign.");
        return;
      }

      try {
        const data = await fetchShiftSummary(campaignId);
        setSummary(data);
      } catch {
        // Build a local fallback from visited doors today
        const raw = await AsyncStorage.getItem("@poll_city_visited_today");
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as { ids: string[]; date: string };
            const today = new Date().toISOString().split("T")[0];
            if (parsed.date === today) {
              setSummary({
                shift: {
                  doors: parsed.ids.length,
                  supportersFound: 0,
                  conversionRate: 0,
                  minutesOnShift: 0,
                  doorsPerHour: 0,
                },
                allTime: {
                  totalDoors: 0,
                  rank: 0,
                  totalVolunteers: 0,
                  avgDoorsPerVolunteer: 0,
                  aboveAverage: false,
                },
                message: `${parsed.ids.length} doors — every single one matters. Thank you for showing up.`,
                emoji: "",
                milestones: [],
                volunteerName: user?.name?.split(" ")[0] ?? "there",
              });
            }
          } catch {
            // ignore
          }
        }

        if (!summary) {
          setError("Could not load shift summary. You may be offline.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignId, user]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={styles.loadingText}>Loading your shift results...</Text>
      </SafeAreaView>
    );
  }

  if (error && !summary) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <Text style={styles.errorTitle}>Shift Summary</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace("/(app)/walk-list")}
        >
          <Text style={styles.backButtonText}>Back to Walk List</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const s = summary!;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting */}
        <Text style={styles.greeting}>Great work, {s.volunteerName}!</Text>
        <Text style={styles.motivationMessage}>{s.message}</Text>

        {/* Main stat: doors knocked */}
        <View style={styles.heroStat}>
          <Text style={styles.heroNumber}>{s.shift.doors}</Text>
          <Text style={styles.heroLabel}>doors this shift</Text>
        </View>

        {/* Stat grid */}
        <View style={styles.statsGrid}>
          <StatCard
            value={String(s.shift.supportersFound)}
            label="Supporters Found"
            color="#16a34a"
          />
          <StatCard
            value={`${s.shift.conversionRate}%`}
            label="Conversion Rate"
            color="#ca8a04"
          />
          <StatCard
            value={
              s.shift.doorsPerHour > 0
                ? String(s.shift.doorsPerHour)
                : "--"
            }
            label="Doors / Hour"
            color={BRAND_BLUE}
          />
          <StatCard
            value={
              s.shift.minutesOnShift > 0
                ? `${s.shift.minutesOnShift}m`
                : "--"
            }
            label="Time on Shift"
            color="#7c3aed"
          />
        </View>

        {/* All-time stats */}
        {s.allTime.totalDoors > 0 && (
          <View style={styles.allTimeSection}>
            <Text style={styles.sectionTitle}>All-Time Stats</Text>
            <View style={styles.allTimeRow}>
              <View style={styles.allTimeStat}>
                <Text style={styles.allTimeNumber}>
                  {s.allTime.totalDoors}
                </Text>
                <Text style={styles.allTimeLabel}>Total Doors</Text>
              </View>
              {s.allTime.rank > 0 && (
                <View style={styles.allTimeStat}>
                  <Text style={styles.allTimeNumber}>
                    #{s.allTime.rank}
                  </Text>
                  <Text style={styles.allTimeLabel}>
                    of {s.allTime.totalVolunteers} volunteers
                  </Text>
                </View>
              )}
            </View>
            {s.allTime.aboveAverage && (
              <View style={styles.aboveAverageBadge}>
                <Text style={styles.aboveAverageText}>
                  Above campaign average ({s.allTime.avgDoorsPerVolunteer}{" "}
                  doors/volunteer)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Milestones */}
        {s.milestones.length > 0 && (
          <View style={styles.milestonesSection}>
            <Text style={styles.sectionTitle}>Milestones</Text>
            {s.milestones.map((m, i) => (
              <View key={i} style={styles.milestoneRow}>
                <Text style={styles.milestoneText}>{m}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Sync status */}
        {pendingSync > 0 && (
          <View style={styles.syncWarning}>
            <Text style={styles.syncWarningText}>
              {pendingSync} interaction{pendingSync !== 1 ? "s" : ""} waiting
              to sync. They will upload automatically when you have a
              connection.
            </Text>
          </View>
        )}

        {/* Actions */}
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={() => router.replace("/(app)/walk-list")}
          accessibilityRole="button"
          accessibilityLabel="Start another shift"
        >
          <Text style={styles.primaryButtonText}>Start Another Shift</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Stat card component
// ---------------------------------------------------------------------------

function StatCard({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={statStyles.card}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    width: "48%" as unknown as number,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  value: {
    fontSize: 28,
    fontWeight: "800",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
});

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
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 15,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Greeting
  greeting: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
  },
  motivationMessage: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  // Hero stat
  heroStat: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroNumber: {
    fontSize: 72,
    fontWeight: "900",
    color: BRAND_BLUE,
    lineHeight: 80,
  },
  heroLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },

  // All-time
  allTimeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },
  allTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  allTimeStat: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  allTimeNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
  },
  allTimeLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
  aboveAverageBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  aboveAverageText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
    textAlign: "center",
  },

  // Milestones
  milestonesSection: {
    marginBottom: 24,
  },
  milestoneRow: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  milestoneText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
  },

  // Sync warning
  syncWarning: {
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
  },
  syncWarningText: {
    fontSize: 13,
    color: "#92400e",
    textAlign: "center",
    lineHeight: 19,
  },

  // Buttons
  primaryButton: {
    minHeight: 56,
    backgroundColor: BRAND_BLUE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
  },
});
