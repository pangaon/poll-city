/**
 * Tab navigator layout — authenticated section with 4 tabs:
 *   Canvassing | Contacts | Alerts | Settings
 *
 * Uses expo-router Tabs with Poll City navy (#0A2342) theming.
 * lucide-react-native icons — only using the safe subset.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Map, Users, Bell, Settings } from 'lucide-react-native';

const NAVY = '#0A2342';
const GREEN = '#1D9E75';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: NAVY,
          borderTopColor: '#1e293b',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="canvassing/index"
        options={{
          title: 'Canvassing',
          tabBarIcon: ({ color, size }) => (
            <Map size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts/index"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts/index"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Bell size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
