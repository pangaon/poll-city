import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const WHITE = "#ffffff";

// Must match the key in _layout.tsx
const TERMS_KEY = "poll_city_terms_v1";

export default function TermsScreen() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  async function handleContinue() {
    if (!accepted) return;
    await SecureStore.setItemAsync(TERMS_KEY, "true");
    router.replace("/(auth)/login");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Before you get started</Text>
          <Text style={styles.subtitle}>
            Please read and accept our terms to use Poll City Canvasser.
          </Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Terms of Use</Text>
          <Text style={styles.body}>
            Poll City Canvasser is a field operations tool provided by Poll City Inc. for use by
            authorized campaign staff and volunteers. By using this application, you agree to use
            it solely for legitimate, lawful campaign activities in compliance with all applicable
            Canadian federal, provincial, and municipal election laws.
          </Text>
          <Text style={styles.body}>
            You may not use this application to collect, store, or transmit personal information
            about voters without appropriate authorization from your campaign. All voter contact
            data must be handled in accordance with applicable privacy legislation, including
            PIPEDA and applicable provincial privacy acts.
          </Text>

          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.body}>
            Poll City collects information you provide — including contact logs, canvassing
            activity, and location data while actively canvassing — to deliver the services you
            request and to improve our platform. Your location is accessed only while you are
            actively using the canvassing map feature.
          </Text>
          <Text style={styles.body}>
            We do not sell your personal information. Campaign data is accessible only to
            authorized members of your campaign and to Poll City for support purposes. You may
            request deletion of your account data at any time by contacting support@poll.city.
          </Text>

          <Text style={styles.sectionTitle}>CASL Compliance</Text>
          <Text style={styles.body}>
            Canada's Anti-Spam Legislation (CASL) applies to commercial electronic messages sent
            through this platform. Ensure you have appropriate consent before sending electronic
            communications to voters or donors. Your campaign is responsible for maintaining
            CASL compliance for all outbound communications.
          </Text>

          <Text style={styles.sectionTitle}>Account Responsibility</Text>
          <Text style={styles.body}>
            You are responsible for maintaining the confidentiality of your account credentials.
            Notify your campaign manager immediately if you believe your account has been
            compromised. Poll City is not liable for unauthorized access resulting from failure
            to protect your credentials.
          </Text>

          <View style={styles.spacer} />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={styles.checkRow}
            onPress={() => setAccepted(!accepted)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>
              I have read and agree to the Terms of Use and Privacy Policy
            </Text>
          </Pressable>

          <Pressable
            style={[styles.button, !accepted && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!accepted}
            accessibilityRole="button"
            accessibilityLabel="Continue to Poll City"
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: NAVY,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: NAVY,
    marginTop: 20,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 10,
  },
  spacer: {
    height: 24,
  },
  footer: {
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  checkmark: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "700",
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  button: {
    height: 56,
    backgroundColor: NAVY,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonText: {
    color: WHITE,
    fontSize: 17,
    fontWeight: "700",
  },
});
