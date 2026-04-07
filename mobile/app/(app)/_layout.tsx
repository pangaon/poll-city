/**
 * App group layout — the authenticated section with a stack navigator.
 *
 * Screens:
 *   - walk-list   (default)
 *   - door/[id]   (door interaction)
 *   - shift-summary
 */

import React from "react";
import { Stack } from "expo-router";

const BRAND_BLUE = "#1e40af";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: BRAND_BLUE },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen
        name="walk-list"
        options={{ title: "Walk List" }}
      />
      <Stack.Screen
        name="door/[id]"
        options={{ title: "Door" }}
      />
      <Stack.Screen
        name="shift-summary"
        options={{ title: "Shift Summary", headerBackVisible: false }}
      />
    </Stack>
  );
}
