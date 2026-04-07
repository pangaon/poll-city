/**
 * Door screen — record an interaction at a single door.
 *
 * 6 result buttons at 56px height:
 *   Not Home (gray), Supporter (green), Leaning (light green),
 *   Undecided (amber), Against (red), Refused (dark red)
 *
 * Notes field, 10-second undo after submission.
 * Touch targets are 56px+ per spec. Offline-first via sync queue.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { OfflineIndicator } from "../../../components/offline-indicator";
import type {
  Contact,
  CreateInteractionPayload,
  SupportLevel,
} from "../../../lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const LIGHT_GREEN = "#6BBF8A";
const AMBER = "#EF9F27";
const RED = "#E24B4A";
const DARK_RED = "#8B1A1A";
const GRAY = "#6B7280";

const UNDO_SECONDS = 10;

interface ResultOption {
  key: string;
  level: SupportLevel;
  label: string;
  color: string;
  pressedColor: string;
}

const RESULT_OPTIONS: ResultOption[] = [
  {
    key: "not_home",
    level: "unknown",
    label: "Not Home",
    color: GRAY,
    pressedColor: "#4B5563",
  },
  {
    key: "supporter",
    level: "strong_support",
    label: "Supporter",
    color: GREEN,
    pressedColor: "#167A5C",
  },
  {
    key: "leaning",
    level: "leaning_support",
    label: "Leaning",
    color: LIGHT_GREEN,
    pressedColor: "#4FA46E",
  },
  {
    key: "undecided",
    level: "undecided",
    label: "Undecided",
    color: AMBER,
    pressedColor: "#D08B1F",
  },
  {
    key: "against",
    level: "strong_opposition",
    label: "Against",
    color: RED,
    pressedColor: "#C13A39",
  },
  {
    key: "refused",
    level: "leaning_opposition",
    label: "Refused",
    color: DARK_RED,
    pressedColor: "#6B1111",
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

  const [selectedResult, setSelectedResult] = useState<ResultOption | null>(null);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(0);
  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didEnqueueRef = useRef(false);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    };
  }, []);

  // When countdown reaches 0 after submission, actually enqueue and navigate
  useEffect(() => {
    if (submitted && undoCountdown <= 0 && !didEnqueueRef.current) {
      didEnqueueRef.current = true;
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);

      const payload: CreateInteractionPayload = {
        contactId,
        type: "door_knock",
        supportLevel: selectedResult?.level ?? "unknown",
        notes:
          selectedResult?.key === "not_home"
            ? "Not home"
            : notes.trim() || undefined,
      };

      enqueue("/api/interactions", "POST", payload).catch(() => {});
      router.back();
    }
  }, [submitted, undoCountdown, contactId, selectedResult, notes, router]);

  // Select a result and start the undo countdown
  const handleResult = useCallback(
    (option: ResultOption) => {
      if (submitted) return;

      setSelectedResult(option);
      setSubmitted(true);
      setUndoCountdown(UNDO_SECONDS);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start countdown
      undoTimerRef.current = setInterval(() => {
        setUndoCountdown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [submitted],
  );

  // Undo: cancel the submission
  const handleUndo = useCallback(() => {
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    setSubmitted(false);
    setSelectedResult(null);
    setUndoCountdown(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <OfflineIndicator />
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

        {/* Previous support level */}
        {contact && contact.supportLevel !== "unknown" && (
          <View style={styles.previousSupport}>
            <Text style={styles.previousSupportText}>
              Previous: {contact.supportLevel.replace(/_/g, " ")}
            </Text>
          </View>
        )}

        {/* Undo banner */}
        {submitted && undoCountdown > 0 && (
          <View style={styles.undoBanner}>
            <Text style={styles.undoText}>
              Saved: {selectedResult?.label} ({undoCountdown}s)
            </Text>
            <Pressable
              style={styles.undoButton}
              onPress={handleUndo}
              accessibilityRole="button"
              accessibilityLabel="Undo"
            >
              <Text style={styles.undoButtonText}>Undo</Text>
            </Pressable>
          </View>
        )}

        {/* 6 Result buttons */}
        {!submitted && (
          <>
            <Text style={styles.sectionTitle}>Result</Text>
            <View style={styles.resultGrid}>
              {RESULT_OPTIONS.map((option) => (
                <Pressable
                  key={option.key}
                  style={({ pressed }) => [
                    styles.resultButton,
                    { backgroundColor: pressed ? option.pressedColor : option.color },
                  ]}
                  onPress={() => handleResult(option)}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                >
                  <Text style={styles.resultButtonText}>{option.label}</Text>
                </Pressable>
              ))}
            </View>

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
          </>
        )}
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
    backgroundColor: NAVY,
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
    color: NAVY,
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
    backgroundColor: "#E8EDF4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  previousSupportText: {
    fontSize: 13,
    color: NAVY,
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

  // Result buttons — 6 big buttons, 56px height
  resultGrid: {
    gap: 8,
    marginBottom: 20,
  },
  resultButton: {
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resultButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },

  // Undo banner
  undoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  undoText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  undoButton: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  undoButtonText: {
    color: NAVY,
    fontSize: 15,
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
});
