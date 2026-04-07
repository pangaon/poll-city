/**
 * Root layout — wraps the entire app with providers and handles
 * auth-gated navigation between (auth) and (app) groups.
 */

import React, { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../lib/auth";
import { startSyncService, stopSyncService } from "../lib/sync";

function RootNavigationGuard() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // Not signed in — redirect to login
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      // Signed in — redirect to main app
      router.replace("/(app)/walk-list");
    }
  }, [user, isLoading, segments, router]);

  // Start sync service when authenticated
  useEffect(() => {
    if (user) {
      startSyncService();
    } else {
      stopSyncService();
    }
  }, [user]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <RootNavigationGuard />
    </AuthProvider>
  );
}
