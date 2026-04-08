/**
 * Index route — redirects to the walk list screen.
 * Expo Router requires an index route; this ensures the user
 * always starts on the walk list after authentication.
 */

import { Redirect } from "expo-router";

export default function Index() {
  // Redirect to the tab-based interface. Auth guard in _layout.tsx handles
  // unauthenticated users and sends them to /(auth)/login first.
  return <Redirect href="/(tabs)/canvassing" />;
}
