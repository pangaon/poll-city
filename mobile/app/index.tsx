/**
 * Index route — redirects to the walk list screen.
 * Expo Router requires an index route; this ensures the user
 * always starts on the walk list after authentication.
 */

import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(app)/walk-list" />;
}
