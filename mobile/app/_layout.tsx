import React, { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { AuthProvider, useAuth } from "../lib/auth";
import { startSyncService, stopSyncService } from "../lib/sync";

// Keep native splash up until auth + terms check are both resolved
SplashScreen.preventAutoHideAsync();

export const TERMS_KEY = "poll_city_terms_v1";

function RootNavigationGuard() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(TERMS_KEY).then((val) => {
      setTermsAccepted(val === "true");
    });
  }, []);

  // Hide native splash once both auth and terms check are resolved
  useEffect(() => {
    if (!isLoading && termsAccepted !== null) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, termsAccepted]);

  useEffect(() => {
    if (isLoading || termsAccepted === null) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!termsAccepted) {
      router.replace("/(auth)/terms");
    } else if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)/canvassing");
    }
  }, [user, isLoading, termsAccepted, segments, router]);

  useEffect(() => {
    if (user) {
      startSyncService();
    } else {
      stopSyncService();
    }
  }, [user]);

  // Return null while loading — native splash covers the gap
  if (isLoading || termsAccepted === null) {
    return null;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigationGuard />
    </AuthProvider>
  );
}
