/**
 * Expo app config — overrides app.json with env-driven values.
 * This file is the canonical config for EAS Build and local dev.
 *
 * app.json is kept for static fields (plugins, permissions, etc.)
 * This file injects the runtime API URL and EAS project ID.
 */

export default ({ config }) => ({
  ...config,
  name: "Poll City Canvasser",
  slug: "poll-city-canvasser",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  scheme: "pollcity",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0A2342",
  },
  ios: {
    ...config.ios,
    supportsTablet: false,
    bundleIdentifier: "ca.pollcity.canvasser",
    buildNumber: config.ios?.buildNumber ?? "1",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Poll City Canvasser uses your location to show nearby doors to knock.",
      NSLocationAlwaysUsageDescription:
        "Poll City Canvasser uses your location for canvassing route tracking.",
      NSCameraUsageDescription:
        "Poll City Canvasser uses your camera to photograph lawn signs.",
      UIBackgroundModes: ["fetch", "remote-notification"],
    },
    config: {
      usesNonExemptEncryption: false,
    },
    associatedDomains: ["applinks:app.poll.city", "applinks:www.poll.city"],
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0A2342",
    },
    package: "ca.pollcity.canvasser",
    versionCode: 1,
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "CAMERA",
      "POST_NOTIFICATIONS",
      "RECEIVE_BOOT_COMPLETED",
    ],
  },
  extra: {
    ...config.extra,
    // API base URL — override in .env for local dev
    EXPO_PUBLIC_API_URL:
      process.env.EXPO_PUBLIC_API_URL ??
      "https://poll-city-74azv5fvw-pangaons-projects.vercel.app",
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? config.extra?.eas?.projectId ?? "YOUR_EAS_PROJECT_ID",
    },
  },
  updates: {
    url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID ?? "YOUR_EAS_PROJECT_ID"}`,
  },
  runtimeVersion: {
    policy: "appVersion",
  },
});
