/**
 * Offline indicator component — shows a banner when the device is offline.
 * Appears at the top of the screen below the header.
 */

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        You are offline. Changes will sync when reconnected.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#EF9F27",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
