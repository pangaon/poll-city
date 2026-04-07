/**
 * Door screen — record an interaction at a single door.
 *
 * Large one-thumb-friendly buttons for support level, plus notes,
 * "not home" shortcut, and optional fields. POSTs to /api/interactions
 * via the offline sync queue so it works without connectivity.
 *
 * Touch targets are 56px+ per MOBILE_APP_ARCHITECTURE.md.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { enqueue } from "../../../lib/sync";
import type {
  Contact,
  CreateInteractionPayload,
  SupportLevel,
} from "../../../lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRAND_BLUE = "#1e40af";

interface SupportOption {
  level: SupportLevel;
  label: string;
  color: string;
  pressedColor: string;
}

const SUPPORT_OPTIONS: SupportOption[] = [
  {
    level: "strong_support",
    label: "Strong Support",
    color: "#16a34a",
    pressedColor: "#15803d",
  },
  {
    level: "leaning_support",
    label: "Leaning",
    color: "#65a30d",
    pressedColor: "#4d7c0f",
  },
  {
    level: "undecided",
    label: "Undecided",
    color: "#ca8a04",
    pressedColor: "#a16207",
  },
  {
    level: "leaning_opposition",
    label: "Lean Opp",
    color: "#ea580c",
    pressedColor: "#c2410c",
  },
  {
    level: "strong_opposition",
    label: "Opposed",
    color: "#dc2626",
    pressedColor: "#b91c1c",
  },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DoorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; contactJson?: string }>();

  const contact: Contact | null = useMemo(() => {
    if (params.contactJson) {
      try {
        return JSON.parse(params.contactJson) as Contact;
      } catch {
        return null;
      }
    }
    return null;
  }, [params.contactJson]);

  const contactId = params.id;

  const [selectedSupport, setSelectedSupport] = useState<SupportLevel | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [signRequested, setSignRequested] = useState(false);
  const [volunteerInterest, setVolunteerInterest] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Record a support-level interaction
  const recordSupport = useCallback(
    async (level: SupportLevel) => {
      setSelectedSupport(level);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [],
  );

  // Submit the full interaction
  const submitInteraction = useCallback(
    async (notHomeOverride = false) => {
      if (!contactId) return;
      if (submitted) return;

      const payload: CreateInteractionPayload = {
        contactId,
        type: "door_knock",
        supportLevel: notHomeOverride ? "unknown" : (selectedSupport ?? "unknown"),
        notes: notHomeOverride ? "Not home" : notes.trim() || undefined,
        signRequested,
        volunteerInterest,
      };

      setSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Queue for offline sync — this writes locally first
      await enqueue("/api/interactions", "POST", payload);

      // Navigate back to walk list
      router.back();
    },
    [contactId, selectedSupport, notes, signRequested, volunteerInterest, submitted, router],
  );

  // "Not Home" shortcut
  const handleNotHome = useCallback(() => {
    submitInteraction(true);
  }, [submitInteraction]);

  // "Do Not Contact" requires confirmation
  const handleDoNotContact = useCallback(() => {
    Alert.alert(
      "Mark as Do Not Contact?",
      "This voter will be removed from future walk lists.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            const payload: CreateInteractionPayload = {
              contactId,
              type: "door_knock",
              supportLevel: "unknown",
              notes: "Do Not Contact",
            };
            setSubmitted(true);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            );
            await enqueue("/api/interactions", "POST", payload);
            router.back();
          },
        },
      ],
    );
  }, [contactId, router]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Contact header */}
        <View style={styles.contactHeader}>
          <View style={styles.initialsCircle}>
            <Text style={styles.initialsText}>
              {(contact?.firstName?.[0] ?? "").toUpperCase()}
              {(contact?.lastName?.[0] ?? "").toUpperCase()}
            </Text>
          </View>
          <View style={styles.contactHeaderInfo}>
            <Text style={styles.contactName}>
              {contact
                ? `${contact.firstName} ${contact.lastName}`
                : `Contact ${contactId}`}
            </Text>
            <Text style={styles.contactAddress}>
              {contact?.address1 ?? "No address on file"}
            </Text>
            {contact?.phone && (
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            )}
          </View>
        </View>

        {/* Previous support level, if any */}
        {contact && contact.supportLevel !== "unknown" && (
          <View style={styles.previousSupport}>
            <Text style={styles.previousSupportText}>
              Previous: {contact.supportLevel.replace(/_/g, " ")}
            </Text>
          </View>
        )}

        {/* Support level buttons — the core canvassing UI */}
        <Text style={styles.sectionTitle}>How do they feel?</Text>
        <View style={styles.supportGrid}>
          {SUPPORT_OPTIONS.map((option) => (
            <Pressable
              key={option.level}
              style={({ pressed }) => [
                styles.supportButton,
                {
                  backgroundColor:
                    selectedSupport === option.level
                      ? option.pressedColor
                      : pressed
                        ? option.pressedColor
                        : option.color,
                },
                selectedSupport === option.level && styles.supportButtonSelected,
              ]}
              onPress={() => recordSupport(option.level)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: selectedSupport === option.level }}
            >
              <Text style={styles.supportButtonText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Not Home — large, easy target */}
        <Pressable
          style={({ pressed }) => [
            styles.notHomeButton,
            pressed && styles.notHomeButtonPressed,
          ]}
          onPress={handleNotHome}
          disabled={submitted}
          accessibilityRole="button"
          accessibilityLabel="Not home"
        >
          <Text style={styles.notHomeButtonText}>Not Home</Text>
        </Pressable>

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Anything the next canvasser should know..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={notes}
          onChangeText={setNotes}
          accessibilityLabel="Interaction notes"
        />

        {/* Toggle options */}
        <View style={styles.toggleRow}>
          <Pressable
            style={[
              styles.toggleButton,
              signRequested && styles.toggleButtonActive,
            ]}
            onPress={() => setSignRequested((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: signRequested }}
            accessibilityLabel="Wants a lawn sign"
          >
            <Text
              style={[
                styles.toggleText,
                signRequested && styles.toggleTextActive,
              ]}
            >
              Wants Sign
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.toggleButton,
              volunteerInterest && styles.toggleButtonActive,
            ]}
            onPress={() => setVolunteerInterest((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: volunteerInterest }}
            accessibilityLabel="Interested in volunteering"
          >
            <Text
              style={[
                styles.toggleText,
                volunteerInterest && styles.toggleTextActive,
              ]}
            >
              Will Volunteer
            </Text>
          </Pressable>
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitButtonPressed,
            (!selectedSupport || submitted) && styles.submitButtonDisabled,
          ]}
          onPress={() => submitInteraction(false)}
          disabled={!selectedSupport || submitted}
          accessibilityRole="button"
          accessibilityLabel="Save and continue to next door"
        >
          <Text style={styles.submitButtonText}>
            {submitted ? "Saved" : "Save & Next Door"}
          </Text>
        </Pressable>

        {/* Do Not Contact */}
        <Pressable
          style={styles.dncButton}
          onPress={handleDoNotContact}
          disabled={submitted}
          accessibilityRole="button"
          accessibilityLabel="Mark as do not contact"
        >
          <Text style={styles.dncButtonText}>Do Not Contact</Text>
        </Pressable>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Contact header
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  initialsCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: BRAND_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  initialsText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  contactHeaderInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  contactAddress: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },

  // Previous support
  previousSupport: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  previousSupportText: {
    fontSize: 13,
    color: BRAND_BLUE,
    fontWeight: "600",
  },

  // Section
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 4,
  },

  // Support buttons — BIG one-thumb targets
  supportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  supportButton: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  supportButtonSelected: {
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  supportButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Not Home button
  notHomeButton: {
    minHeight: 56,
    backgroundColor: "#64748b",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  notHomeButtonPressed: {
    backgroundColor: "#475569",
  },
  notHomeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Notes
  notesInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#0f172a",
    minHeight: 80,
    marginBottom: 16,
  },

  // Toggle buttons
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  toggleButtonActive: {
    borderColor: BRAND_BLUE,
    backgroundColor: "#eff6ff",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  toggleTextActive: {
    color: BRAND_BLUE,
  },

  // Submit button
  submitButton: {
    minHeight: 56,
    backgroundColor: BRAND_BLUE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },

  // Do Not Contact
  dncButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dncButtonText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "600",
  },
});
