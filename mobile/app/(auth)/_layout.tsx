/**
 * Auth group layout — simple stack with no header for login/register flow.
 */

import React from "react";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
