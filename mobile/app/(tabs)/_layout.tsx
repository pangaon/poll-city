/**
 * Tab navigator layout — authenticated section.
 *
 * Dark-theme redesign matching the Figma "Field Command + War Room v3" design.
 *
 * 5 tabs:
 *   Canvassing | Contacts | E-Day | Alerts | Settings
 *
 * Design tokens:
 *   Background: #0F1440
 *   Border top: rgba(41, 121, 255, 0.3)
 *   Active tab: #00E5FF with glow
 *   Inactive tab: #6B72A0
 *   Tab labels: all caps, letter-spaced
 */

import React from 'react';
import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Bell, CalendarCheck, Map, Settings, Users } from 'lucide-react-native';

const C = {
  tabBg: '#0F1440',
  borderTop: 'rgba(41, 121, 255, 0.3)',
  active: '#00E5FF',
  inactive: '#6B72A0',
  headerBg: '#050A1F',
  headerText: '#F5F7FF',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: C.headerBg,
          ...Platform.select({
            ios: {
              shadowColor: 'rgba(0, 229, 255, 0.3)',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 1,
              shadowRadius: 0,
            },
          }),
        },
        headerTintColor: C.headerText,
        headerTitleStyle: {
          fontWeight: '800',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          fontSize: 14,
        },
        headerShadowVisible: true,
        tabBarStyle: {
          backgroundColor: C.tabBg,
          borderTopColor: C.borderTop,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 82 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: C.active,
        tabBarInactiveTintColor: C.inactive,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '800',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="canvassing/index"
        options={{
          title: 'FIELD',
          headerTitle: 'FIELD COMMAND',
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} active={color === C.active}>
              <Map size={size} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="contacts/index"
        options={{
          title: 'CONTACTS',
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} active={color === C.active}>
              <Users size={size} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="eday/index"
        options={{
          title: 'E-DAY',
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} active={color === C.active}>
              <CalendarCheck size={size} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="alerts/index"
        options={{
          title: 'ALERTS',
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} active={color === C.active}>
              <Bell size={size} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} active={color === C.active}>
              <Settings size={size} color={color} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

// Wrapper that adds a subtle glow ring around the active tab icon
function TabIcon({
  color,
  active,
  children,
}: {
  color: string;
  active: boolean;
  children: React.ReactNode;
}) {
  if (!active) return <>{children}</>;

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
          ios: {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 6,
          },
        }),
      }}
    >
      {children}
    </View>
  );
}
