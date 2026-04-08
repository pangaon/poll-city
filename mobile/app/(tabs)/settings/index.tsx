/**
 * Settings screen.
 *
 * - Shows logged-in user info (name, email, role)
 * - Shows active campaign name (fetched from /api/campaigns/current)
 * - App version
 * - Sync status with pending count
 * - Sign Out button → logout() then router.replace('/(auth)/login')
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../../../lib/auth';
import { apiFetch } from '../../../lib/api';
import { getPendingCount } from '../../../lib/store';
import { processQueue } from '../../../lib/sync';
import type { Campaign } from '../../../lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAVY = '#0A2342';
const RED = '#E24B4A';
const GREEN = '#1D9E75';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// ---------------------------------------------------------------------------
// Helper: user initials circle
// ---------------------------------------------------------------------------

function InitialsCircle({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();

  return (
    <View style={styles.initialsCircle}>
      <Text style={styles.initialsText}>{initials}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function SettingsRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Fetch current campaign info
  useEffect(() => {
    if (!user?.activeCampaignId) return;

    setLoadingCampaign(true);
    apiFetch<{ data: Campaign[] }>('/api/campaigns')
      .then((res) => {
        const active = res.data.find((c) => c.id === user.activeCampaignId);
        setCampaign(active ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingCampaign(false));
  }, [user?.activeCampaignId]);

  // Pending interaction count
  useEffect(() => {
    getPendingCount().then(setPendingCount).catch(() => {});
    const interval = setInterval(() => {
      getPendingCount().then(setPendingCount).catch(() => {});
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await processQueue();
      const count = await getPendingCount();
      setPendingCount(count);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/(auth)/login');
    } finally {
      setSigningOut(false);
    }
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator color={NAVY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User profile card */}
        <View style={styles.profileCard}>
          <InitialsCircle name={user.name ?? user.email} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name ?? '—'}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user.role}</Text>
            </View>
          </View>
        </View>

        {/* Campaign section */}
        <Text style={styles.sectionTitle}>Campaign</Text>
        <View style={styles.card}>
          <SettingsRow
            label="Active Campaign"
            value={
              loadingCampaign
                ? 'Loading…'
                : campaign?.name ?? 'None selected'
            }
          />
          {campaign?.candidateName ? (
            <SettingsRow label="Candidate" value={campaign.candidateName} />
          ) : null}
          {campaign?.municipality ? (
            <SettingsRow
              label="Municipality"
              value={[campaign.municipality, campaign.province]
                .filter(Boolean)
                .join(', ')}
            />
          ) : null}
          {campaign?.electionDate ? (
            <SettingsRow
              label="Election Date"
              value={new Date(campaign.electionDate).toLocaleDateString('en-CA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            />
          ) : null}
        </View>

        {/* Sync section */}
        <Text style={styles.sectionTitle}>Sync</Text>
        <View style={styles.card}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={styles.syncRowLeft}>
              <Text style={styles.rowLabel}>Pending Interactions</Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: pendingCount > 0 ? '#92400e' : GREEN },
                ]}
              >
                {pendingCount > 0 ? `${pendingCount} waiting` : 'All synced'}
              </Text>
            </View>
            {pendingCount > 0 ? (
              <Pressable
                style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
                onPress={handleSync}
                disabled={syncing}
                accessibilityRole="button"
                accessibilityLabel="Sync now"
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.syncBtnText}>Sync Now</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* App section */}
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.card}>
          <SettingsRow label="Version" value={APP_VERSION} />
          <SettingsRow label="Platform" value="Poll City Mobile" />
        </View>

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.signOutButtonPressed,
            signingOut && styles.signOutButtonDisabled,
          ]}
          onPress={handleSignOut}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          {signingOut ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  // Profile card
  profileCard: {
    backgroundColor: NAVY,
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  initialsCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initialsText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileEmail: {
    fontSize: 13,
    color: '#93c5fd',
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Section title
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 52,
  },
  rowLabel: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
    maxWidth: '55%',
  },

  // Sync row
  syncRowLeft: {
    flex: 1,
  },
  syncBtn: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 84,
  },
  syncBtnDisabled: {
    opacity: 0.6,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Sign out
  signOutButton: {
    minHeight: 56,
    backgroundColor: RED,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  signOutButtonPressed: {
    opacity: 0.85,
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});
