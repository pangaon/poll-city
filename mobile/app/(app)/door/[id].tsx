/**
 * Door screen — record an interaction at a single door.
 *
 * Dark-theme redesign matching the Figma "Field Command + War Room v3" design.
 *
 * Outcome buttons (64px, full width), dark notes field, sign/volunteer toggles,
 * 10-second undo after submission. Offline-first via sync queue.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ChevronLeft, Check, Undo2 } from "lucide-react-native";
import { enqueue } from "../../../lib/sync";
import { OfflineIndicator } from "../../../components/offline-indicator";
import type {
  Contact,
  CreateInteractionPayload,
  SupportLevel,
} from "../../../lib/types";

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

const UNDO_SECONDS = 10;

interface ResultOption {
  key: string;
  level: SupportLevel;
  label: string;
  color: string;
  pressedColor: string;
  darkColor: string;
}

const RESULT_OPTIONS: ResultOption[] = [
  {
    key: "strong_support",
    level: "strong_support",
    label: "STRONG SUPPORT",
    color: C.green,
    pressedColor: '#00A844',
    darkColor: 'rgba(0, 200, 83, 0.15)',
  },
  {
    key: "soft_support",
    level: "leaning_support",
    label: "SOFT SUPPORT",
    color: '#4CAF50',
    pressedColor: '#388E3C',
    darkColor: 'rgba(76, 175, 80, 0.15)',
  },
  {
    key: "undecided",
    level: "undecided",
    label: "UNDECIDED",
    color: C.amber,
    pressedColor: '#D4AA00',
    darkColor: 'rgba(255, 214, 0, 0.12)',
  },
  {
    key: "not_home",
    level: "unknown",
    label: "NOT HOME",
    color: C.textMuted,
    pressedColor: '#555E8A',
    darkColor: 'rgba(107, 114, 160, 0.12)',
  },
  {
    key: "refused",
    level: "leaning_opposition",
    label: "REFUSED",
    color: C.red,
    pressedColor: '#CC2F26',
    darkColor: 'rgba(255, 59, 48, 0.12)',
  },
  {
    key: "moved",
    level: "unknown",
    label: "MOVED / WRONG ADDRESS",
    color: '#78909C',
    pressedColor: '#546E7A',
    darkColor: 'rgba(120, 144, 156, 0.12)',
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
  const [wantsSign, setWantsSign] = useState(false);
  const [wantsVolunteer, setWantsVolunteer] = useState(false);
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

  // When countdown reaches 0 after submission, enqueue and navigate
  useEffect(() => {
    if (submitted && undoCountdown <= 0 && !didEnqueueRef.current) {
      didEnqueueRef.current = true;
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);

      const notesParts: string[] = [];
      if (selectedResult?.key === "not_home") {
        notesParts.push("Not home");
      } else if (selectedResult?.key === "moved") {
        notesParts.push("Moved / wrong address");
      }
      if (notes.trim()) notesParts.push(notes.trim());
      if (wantsSign) notesParts.push("Wants a sign");
      if (wantsVolunteer) notesParts.push("Interested in volunteering");

      const payload: CreateInteractionPayload = {
        contactId,
        type: "door_knock",
        supportLevel: selectedResult?.level ?? "unknown",
        notes: notesParts.join(" · ") || undefined,
      };

      enqueue("/api/interactions", "POST", payload).catch(() => {});
      router.back();
    }
  }, [submitted, undoCountdown, contactId, selectedResult, notes, wantsSign, wantsVolunteer, router]);

  // Select outcome and start undo countdown
  const handleResult = useCallback(
    (option: ResultOption) => {
      if (submitted) return;
      setSelectedResult(option);
      setSubmitted(true);
      setUndoCountdown(UNDO_SECONDS);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      undoTimerRef.current = setInterval(() => {
        setUndoCountdown((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    },
    [submitted],
  );

  // Undo — cancel the submission
  const handleUndo = useCallback(() => {
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    setSubmitted(false);
    setSelectedResult(null);
    setUndoCountdown(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const initials =
    `${(contact?.firstName?.[0] ?? "").toUpperCase()}${(contact?.lastName?.[0] ?? "").toUpperCase()}` || "?";

  const previousSupportColor =
    contact?.supportLevel && contact.supportLevel !== "unknown"
      ? RESULT_OPTIONS.find(o => o.level === contact.supportLevel)?.color ?? C.textMuted
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <OfflineIndicator />

      {/* Header bar */}
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
        <Text style={styles.headerTitle}>LOG DOOR</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Contact header card */}
        <View style={styles.contactCard}>
          <View style={styles.initialsCircle}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
          <View style={styles.contactInfo}>
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

          {/* Previous support indicator */}
          {previousSupportColor && (
            <View style={[styles.prevSupportDot, { backgroundColor: previousSupportColor }]}>
              <Text style={styles.prevSupportLabel}>PREV</Text>
            </View>
          )}
        </View>

        {/* Undo banner — shown after submission */}
        {submitted && undoCountdown > 0 && (
          <View style={styles.undoBanner}>
            <View style={styles.undoLeft}>
              <View style={[styles.undoColorDot, { backgroundColor: selectedResult?.color ?? C.cyan }]} />
              <Text style={styles.undoText}>
                {selectedResult?.label} saved
              </Text>
              <Text style={styles.undoCountdown}>
                {' '}({undoCountdown}s)
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.undoButton, pressed && styles.undoButtonPressed]}
              onPress={handleUndo}
              accessibilityRole="button"
              accessibilityLabel="Undo"
            >
              <Undo2 size={14} color={C.textPrimary} />
              <Text style={styles.undoButtonText}>UNDO</Text>
            </Pressable>
          </View>
        )}

        {/* Outcome buttons */}
        {!submitted && (
          <>
            <Text style={styles.sectionLabel}>OUTCOME</Text>
            <View style={styles.outcomeGrid}>
              {RESULT_OPTIONS.map((option) => (
                <Pressable
                  key={option.key}
                  style={({ pressed }) => [
                    styles.outcomeButton,
                    { borderColor: `${option.color}50`, backgroundColor: pressed ? option.darkColor : 'rgba(15, 20, 64, 0.6)' },
                    pressed && styles.outcomeButtonPressed,
                  ]}
                  onPress={() => handleResult(option)}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                >
                  <View style={[styles.outcomeColorDot, { backgroundColor: option.color }]} />
                  <Text style={[styles.outcomeButtonText, { color: option.color }]}>
                    {option.label}
                  </Text>
                  <Check size={14} color={`${option.color}40`} />
                </Pressable>
              ))}
            </View>

            {/* Notes field */}
            <Text style={styles.sectionLabel}>NOTES</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Anything the next canvasser should know..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
              accessibilityLabel="Interaction notes"
            />

            {/* Sign & Volunteer toggles */}
            <Text style={styles.sectionLabel}>FOLLOW-UP</Text>
            <View style={styles.togglesContainer}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Wants a Lawn Sign</Text>
                  <Text style={styles.toggleSub}>Request will be logged in sign queue</Text>
                </View>
                <Switch
                  value={wantsSign}
                  onValueChange={setWantsSign}
                  trackColor={{ false: C.border, true: `${C.amber}80` }}
                  thumbColor={wantsSign ? C.amber : C.textMuted}
                  ios_backgroundColor={C.card}
                />
              </View>

              <View style={[styles.toggleRow, styles.toggleRowLast]}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Volunteer Interest</Text>
                  <Text style={styles.toggleSub}>Flag for volunteer coordinator</Text>
                </View>
                <Switch
                  value={wantsVolunteer}
                  onValueChange={setWantsVolunteer}
                  trackColor={{ false: C.border, true: `${C.cyan}80` }}
                  thumbColor={wantsVolunteer ? C.cyan : C.textMuted}
                  ios_backgroundColor={C.card}
                />
              </View>
            </View>
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
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '900',
    color: C.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 40,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Contact card
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
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
  initialsCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(41, 121, 255, 0.2)',
    borderWidth: 1.5,
    borderColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: C.blue,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
    }),
  },
  initialsText: {
    color: C.cyan,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: 0.3,
  },
  contactAddress: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },
  contactPhone: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },
  prevSupportDot: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    marginLeft: 8,
  },
  prevSupportLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#050A1F',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Undo banner
  undoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  undoLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  undoText: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  undoCountdown: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  undoButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  undoButtonText: {
    color: C.textPrimary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Section label
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },

  // Outcome buttons
  outcomeGrid: {
    gap: 8,
    marginBottom: 24,
  },
  outcomeButton: {
    height: 64,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: "center",
    paddingHorizontal: 18,
    borderWidth: 1,
    gap: 12,
  },
  outcomeButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  outcomeColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  outcomeButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Notes input
  notesInput: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: C.textPrimary,
    minHeight: 80,
    marginBottom: 24,
    textAlignVertical: 'top',
  },

  // Toggles
  togglesContainer: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  toggleRowLast: {
    borderBottomWidth: 0,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
  },
  toggleSub: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
});
