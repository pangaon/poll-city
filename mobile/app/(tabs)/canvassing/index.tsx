/**
 * Canvassing screen — the core MVP screen.
 *
 * Features:
 * - Fetches walk list from /api/print/walk-list?campaignId=X on mount
 * - Caches to AsyncStorage via cacheWalkList()
 * - Shows contacts in a FlatList sorted by street (address1)
 * - Each row: name, address, support level badge (color-coded), phone
 * - Tap contact → opens ContactDetailModal
 * - ContactDetailModal: full info + Record Visit form
 *   Outcome selector → notes → submit → POST /api/interactions
 *   If offline: queues via addPendingInteraction(), shows "Saved offline"
 * - Sync banner at top when pending interactions exist
 * - Pull-to-refresh
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { Phone, ChevronRight, RefreshCw, WifiOff } from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { apiFetch, ApiError } from '../../../lib/api';
import {
  cacheWalkList,
  getCachedWalkList,
  addPendingInteraction,
  getPendingCount,
  type CachedContact,
} from '../../../lib/store';
import { processQueue } from '../../../lib/sync';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAVY = '#0A2342';
const GREEN = '#1D9E75';
const AMBER = '#EF9F27';
const RED = '#E24B4A';

const SUPPORT_CONFIG: Record<string, { label: string; color: string }> = {
  strong_support: { label: 'Strong', color: GREEN },
  leaning_support: { label: 'Lean', color: '#6BBF8A' },
  undecided: { label: 'Undecided', color: AMBER },
  leaning_opposition: { label: 'Lean Opp', color: '#E8764B' },
  strong_opposition: { label: 'Opp', color: RED },
  unknown: { label: 'Unknown', color: '#94a3b8' },
};

const OUTCOME_OPTIONS = [
  { key: 'door_knock', label: 'Contacted', supportLevel: 'unknown' },
  { key: 'door_knock_not_home', label: 'Not Home', supportLevel: 'unknown' },
  { key: 'door_knock_refused', label: 'Refused', supportLevel: 'leaning_opposition' },
  { key: 'door_knock_strong', label: 'Strong Support', supportLevel: 'strong_support' },
  { key: 'door_knock_leaning', label: 'Leaning', supportLevel: 'leaning_support' },
  { key: 'door_knock_oppose', label: 'Oppose', supportLevel: 'strong_opposition' },
];

// API response shape from /api/print/walk-list
interface WalkListContact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  ward: string | null;
  supportLevel: string;
  followUpNeeded: boolean;
  notes: string | null;
  signRequested: boolean;
  hasSign: boolean;
}

// ---------------------------------------------------------------------------
// Helper: group contacts by street
// ---------------------------------------------------------------------------

function getStreet(address: string | null): string {
  if (!address) return 'No Address';
  // Strip leading house number to group by street name
  const parts = address.trim().split(' ');
  if (parts.length > 1 && /^\d/.test(parts[0])) {
    return parts.slice(1).join(' ');
  }
  return address;
}

// ---------------------------------------------------------------------------
// Contact row
// ---------------------------------------------------------------------------

interface ContactRowProps {
  contact: CachedContact;
  onPress: (c: CachedContact) => void;
}

const ContactRow = React.memo(function ContactRow({ contact, onPress }: ContactRowProps) {
  const cfg = SUPPORT_CONFIG[contact.supportLevel] ?? SUPPORT_CONFIG.unknown;
  return (
    <Pressable
      style={({ pressed }) => [styles.contactRow, pressed && styles.contactRowPressed]}
      onPress={() => onPress(contact)}
      accessibilityRole="button"
      accessibilityLabel={`${contact.firstName} ${contact.lastName}, ${contact.address1 ?? 'no address'}`}
    >
      <View style={styles.contactInfo}>
        <Text style={styles.contactName} numberOfLines={1}>
          {contact.firstName} {contact.lastName}
        </Text>
        <Text style={styles.contactAddress} numberOfLines={1}>
          {contact.address1 ?? 'No address'}
          {contact.city ? `, ${contact.city}` : ''}
        </Text>
        {contact.phone ? (
          <View style={styles.phoneRow}>
            <Phone size={11} color="#94a3b8" />
            <Text style={styles.contactPhone}>{contact.phone}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.supportBadge, { backgroundColor: cfg.color }]}>
        <Text style={styles.supportBadgeText}>{cfg.label}</Text>
      </View>

      <ChevronRight size={16} color="#94a3b8" style={styles.chevron} />
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Street section header
// ---------------------------------------------------------------------------

function StreetHeader({ street }: { street: string }) {
  return (
    <View style={styles.streetHeader}>
      <Text style={styles.streetHeaderText}>{street}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ContactDetailModal
// ---------------------------------------------------------------------------

interface ContactDetailModalProps {
  contact: CachedContact | null;
  campaignId: string;
  onClose: () => void;
  onVisitRecorded: () => void;
}

function ContactDetailModal({
  contact,
  campaignId,
  onClose,
  onVisitRecorded,
}: ContactDetailModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<(typeof OUTCOME_OPTIONS)[0] | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'online' | 'offline' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset state when contact changes
  useEffect(() => {
    setSelectedOutcome(null);
    setNotes('');
    setResult(null);
    setSubmitError(null);
  }, [contact?.id]);

  if (!contact) return null;

  const cfg = SUPPORT_CONFIG[contact.supportLevel] ?? SUPPORT_CONFIG.unknown;

  async function handleSubmit() {
    if (!selectedOutcome || !contact) return;
    setSubmitting(true);
    setSubmitError(null);

    const idempotencyKey = `mobile-${contact.id}-${Date.now()}`;
    const payload = {
      contactId: contact.id,
      type: 'door_knock' as const,
      supportLevel: selectedOutcome.supportLevel,
      notes: notes.trim() || selectedOutcome.label,
    };

    const netState = await NetInfo.fetch();

    if (netState.isConnected) {
      try {
        await apiFetch('/api/interactions', {
          method: 'POST',
          body: payload,
          params: { idempotencyKey },
        });
        setResult('online');
        onVisitRecorded();
      } catch (err) {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
          setSubmitError(`Failed: ${err.message}`);
          setSubmitting(false);
          return;
        }
        // Network/server error — fall through to offline queue
        await addPendingInteraction({
          contactId: contact.id,
          campaignId,
          type: 'door_knock',
          notes: notes.trim() || selectedOutcome.label,
          supportLevel: selectedOutcome.supportLevel,
          createdAt: new Date().toISOString(),
        });
        setResult('offline');
        onVisitRecorded();
      }
    } else {
      // Offline — queue locally
      await addPendingInteraction({
        contactId: contact.id,
        campaignId,
        type: 'door_knock',
        notes: notes.trim() || selectedOutcome.label,
        supportLevel: selectedOutcome.supportLevel,
        createdAt: new Date().toISOString(),
      });
      setResult('offline');
      onVisitRecorded();
    }

    setSubmitting(false);
  }

  return (
    <Modal
      visible={!!contact}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={modalStyles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={modalStyles.header}>
          <Text style={modalStyles.headerTitle} numberOfLines={1}>
            {contact.firstName} {contact.lastName}
          </Text>
          <Pressable
            style={modalStyles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={modalStyles.closeButtonText}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          style={modalStyles.scroll}
          contentContainerStyle={modalStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Contact info card */}
          <View style={modalStyles.infoCard}>
            <View style={modalStyles.infoRow}>
              <Text style={modalStyles.infoLabel}>Address</Text>
              <Text style={modalStyles.infoValue}>
                {contact.address1 ?? 'No address'}
                {contact.city ? `, ${contact.city}` : ''}
              </Text>
            </View>
            {contact.phone ? (
              <View style={modalStyles.infoRow}>
                <Text style={modalStyles.infoLabel}>Phone</Text>
                <Text style={modalStyles.infoValue}>{contact.phone}</Text>
              </View>
            ) : null}
            <View style={modalStyles.infoRow}>
              <Text style={modalStyles.infoLabel}>Support</Text>
              <View style={[modalStyles.supportChip, { backgroundColor: cfg.color }]}>
                <Text style={modalStyles.supportChipText}>{cfg.label}</Text>
              </View>
            </View>
            {contact.followUpNeeded ? (
              <View style={modalStyles.followUpBadge}>
                <Text style={modalStyles.followUpBadgeText}>Follow-up needed</Text>
              </View>
            ) : null}
            {contact.notes ? (
              <View style={[modalStyles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={modalStyles.infoLabel}>Notes</Text>
                <Text style={[modalStyles.infoValue, { flex: 1 }]}>{contact.notes}</Text>
              </View>
            ) : null}
          </View>

          {/* Result confirmation */}
          {result !== null ? (
            <View
              style={[
                modalStyles.resultBanner,
                result === 'offline' ? modalStyles.resultBannerOffline : modalStyles.resultBannerOnline,
              ]}
            >
              {result === 'offline' ? (
                <>
                  <WifiOff size={16} color="#92400e" />
                  <Text style={[modalStyles.resultBannerText, { color: '#92400e' }]}>
                    {'  '}Saved offline — will sync when connected
                  </Text>
                </>
              ) : (
                <Text style={[modalStyles.resultBannerText, { color: '#166534' }]}>
                  Visit recorded successfully
                </Text>
              )}
            </View>
          ) : (
            <>
              {/* Outcome selector */}
              <Text style={modalStyles.sectionTitle}>Record Visit</Text>

              {submitError ? (
                <View style={modalStyles.errorBanner}>
                  <Text style={modalStyles.errorBannerText}>{submitError}</Text>
                </View>
              ) : null}

              <View style={modalStyles.outcomeGrid}>
                {OUTCOME_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[
                      modalStyles.outcomeButton,
                      selectedOutcome?.key === opt.key && modalStyles.outcomeButtonSelected,
                    ]}
                    onPress={() => setSelectedOutcome(opt)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selectedOutcome?.key === opt.key }}
                  >
                    <Text
                      style={[
                        modalStyles.outcomeButtonText,
                        selectedOutcome?.key === opt.key && modalStyles.outcomeButtonTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Notes */}
              <Text style={modalStyles.sectionTitle}>Notes (optional)</Text>
              <TextInput
                style={modalStyles.notesInput}
                placeholder="What should the campaign know about this door?"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
                accessibilityLabel="Interaction notes"
              />

              {/* Submit */}
              <Pressable
                style={[
                  modalStyles.submitButton,
                  (!selectedOutcome || submitting) && modalStyles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!selectedOutcome || submitting}
                accessibilityRole="button"
                accessibilityLabel="Submit visit record"
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={modalStyles.submitButtonText}>Record Visit</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

interface ListItem {
  type: 'header' | 'contact';
  key: string;
  street?: string;
  contact?: CachedContact;
}

export default function CanvassingScreen() {
  const { user } = useAuth();
  const campaignId = user?.activeCampaignId ?? '';

  const [contacts, setContacts] = useState<CachedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<CachedContact | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Build flat list with street headers
  const listItems: ListItem[] = React.useMemo(() => {
    const sorted = [...contacts].sort((a, b) => {
      const streetA = getStreet(a.address1);
      const streetB = getStreet(b.address1);
      if (streetA !== streetB) return streetA.localeCompare(streetB);
      return (a.address1 ?? '').localeCompare(b.address1 ?? '');
    });

    const items: ListItem[] = [];
    let lastStreet = '';

    for (const contact of sorted) {
      const street = getStreet(contact.address1);
      if (street !== lastStreet) {
        items.push({ type: 'header', key: `header-${street}`, street });
        lastStreet = street;
      }
      items.push({ type: 'contact', key: contact.id, contact });
    }

    return items;
  }, [contacts]);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const loadWalkList = useCallback(
    async (showRefresh = false) => {
      if (!campaignId) {
        setLoading(false);
        setError('No active campaign. Select a campaign first.');
        return;
      }

      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await apiFetch<{ data: WalkListContact[] }>(
          '/api/print/walk-list',
          { params: { campaignId, pageSize: '500' } },
        );

        const mapped: CachedContact[] = result.data.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          address1: c.address1,
          city: c.city,
          phone: c.phone,
          supportLevel: c.supportLevel,
          followUpNeeded: c.followUpNeeded,
          notes: c.notes,
          lat: null,
          lng: null,
        }));

        setContacts(mapped);
        await cacheWalkList(mapped);
      } catch {
        // Offline — try cache
        const cached = await getCachedWalkList();
        if (cached.length > 0) {
          setContacts(cached);
          setError('Offline — showing cached walk list');
        } else {
          setError('Could not load walk list. Check your connection.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    loadWalkList();
  }, [loadWalkList]);

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 8_000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  const handleVisitRecorded = useCallback(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await processQueue();
      await refreshPendingCount();
    } finally {
      setSyncing(false);
    }
  }, [refreshPendingCount]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'header') {
        return <StreetHeader street={item.street!} />;
      }
      return (
        <ContactRow
          contact={item.contact!}
          onPress={setSelectedContact}
        />
      );
    },
    [],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Loading walk list...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Sync banner */}
      {pendingCount > 0 && (
        <View style={styles.syncBanner}>
          <View style={styles.syncBannerLeft}>
            <WifiOff size={14} color="#92400e" />
            <Text style={styles.syncBannerText}>
              {'  '}{pendingCount} interaction{pendingCount !== 1 ? 's' : ''} pending sync
            </Text>
          </View>
          <Pressable
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={syncing}
            accessibilityRole="button"
            accessibilityLabel="Sync pending interactions"
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#92400e" />
            ) : (
              <>
                <RefreshCw size={12} color="#92400e" />
                <Text style={styles.syncButtonText}> Sync</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Walk list */}
      <FlatList
        data={listItems}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadWalkList(true)}
            tintColor={NAVY}
          />
        }
        ListHeaderComponent={
          contacts.length > 0 ? (
            <View style={styles.listStats}>
              <Text style={styles.listStatsText}>
                {contacts.length} door{contacts.length !== 1 ? 's' : ''} on your walk list
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No doors assigned</Text>
            <Text style={styles.emptySubtitle}>
              Ask your campaign manager to assign you a walk list or turf.
            </Text>
          </View>
        }
      />

      {/* Contact detail modal */}
      <ContactDetailModal
        contact={selectedContact}
        campaignId={campaignId}
        onClose={() => setSelectedContact(null)}
        onVisitRecorded={handleVisitRecorded}
      />
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
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 15,
  },

  // Sync banner
  syncBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  syncBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fde68a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },

  // List
  listContent: {
    paddingBottom: 24,
  },
  listStats: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listStatsText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  // Street header
  streetHeader: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 4,
  },
  streetHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Contact row
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  contactRowPressed: {
    backgroundColor: '#f0f9ff',
  },
  contactInfo: {
    flex: 1,
    marginRight: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  contactAddress: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 3,
  },
  contactPhone: {
    fontSize: 12,
    color: '#94a3b8',
  },
  supportBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 56,
    alignItems: 'center',
    marginRight: 6,
  },
  supportBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 2,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

const modalStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: NAVY,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#93c5fd',
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Info card
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    width: 72,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    color: '#0f172a',
    flexShrink: 1,
  },
  supportChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  supportChipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  followUpBadge: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  followUpBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },

  // Result banner
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  resultBannerOnline: {
    backgroundColor: '#dcfce7',
  },
  resultBannerOffline: {
    backgroundColor: '#fef3c7',
  },
  resultBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#b91c1c',
    textAlign: 'center',
  },

  // Section title
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    marginTop: 4,
  },

  // Outcome grid
  outcomeGrid: {
    gap: 8,
    marginBottom: 20,
  },
  outcomeButton: {
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  outcomeButtonSelected: {
    borderColor: NAVY,
    backgroundColor: '#eff6ff',
  },
  outcomeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  outcomeButtonTextSelected: {
    color: NAVY,
  },

  // Notes input
  notesInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#0f172a',
    minHeight: 80,
    marginBottom: 20,
    textAlignVertical: 'top',
  },

  // Submit button
  submitButton: {
    height: 56,
    backgroundColor: NAVY,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});
