/**
 * Contacts search screen.
 *
 * - Search input at top with 300ms debounce
 * - Calls GET /api/contacts?campaignId=X&search=Y&pageSize=20
 * - Shows list: name, support level badge, phone
 * - Tap → contact detail sheet
 * - Handles loading, error, empty states
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, ChevronRight, X } from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { apiFetch, ApiError } from '../../../lib/api';
import type { Contact } from '../../../lib/types';

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

// ---------------------------------------------------------------------------
// Contact detail sheet
// ---------------------------------------------------------------------------

function ContactDetailSheet({
  contact,
  onClose,
}: {
  contact: Contact | null;
  onClose: () => void;
}) {
  if (!contact) return null;

  const cfg = SUPPORT_CONFIG[contact.supportLevel] ?? SUPPORT_CONFIG.unknown;

  const fields: Array<{ label: string; value: string | null }> = [
    { label: 'Address', value: [contact.address1, contact.address2].filter(Boolean).join(', ') || null },
    { label: 'City', value: contact.city },
    { label: 'Phone', value: contact.phone },
    { label: 'Email', value: contact.email },
    { label: 'Ward', value: contact.ward },
    { label: 'Last Contact', value: contact.lastContactedAt ? new Date(contact.lastContactedAt).toLocaleDateString() : null },
    { label: 'Notes', value: contact.notes },
  ];

  return (
    <Modal
      visible={!!contact}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={detailStyles.safe} edges={['top', 'bottom']}>
        <View style={detailStyles.header}>
          <Text style={detailStyles.name} numberOfLines={1}>
            {contact.firstName} {contact.lastName}
          </Text>
          <Pressable
            style={detailStyles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close contact detail"
          >
            <X size={22} color="#ffffff" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={detailStyles.content}>
          {/* Support badge */}
          <View style={[detailStyles.supportBadge, { backgroundColor: cfg.color }]}>
            <Text style={detailStyles.supportBadgeText}>{cfg.label}</Text>
          </View>

          {/* Flags */}
          <View style={detailStyles.flagsRow}>
            {contact.followUpNeeded && (
              <View style={detailStyles.flag}>
                <Text style={detailStyles.flagText}>Follow-up needed</Text>
              </View>
            )}
            {contact.volunteerInterest && (
              <View style={[detailStyles.flag, { backgroundColor: '#dcfce7' }]}>
                <Text style={[detailStyles.flagText, { color: '#166534' }]}>Volunteer interest</Text>
              </View>
            )}
            {contact.signRequested && (
              <View style={[detailStyles.flag, { backgroundColor: '#eff6ff' }]}>
                <Text style={[detailStyles.flagText, { color: '#1e40af' }]}>Sign requested</Text>
              </View>
            )}
          </View>

          {/* Fields */}
          <View style={detailStyles.fieldsCard}>
            {fields.map(
              ({ label, value }) =>
                value ? (
                  <View key={label} style={detailStyles.fieldRow}>
                    <Text style={detailStyles.fieldLabel}>{label}</Text>
                    <Text style={detailStyles.fieldValue}>{value}</Text>
                  </View>
                ) : null,
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Contact row
// ---------------------------------------------------------------------------

function ContactRow({
  contact,
  onPress,
}: {
  contact: Contact;
  onPress: (c: Contact) => void;
}) {
  const cfg = SUPPORT_CONFIG[contact.supportLevel] ?? SUPPORT_CONFIG.unknown;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(contact)}
      accessibilityRole="button"
    >
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {contact.firstName} {contact.lastName}
        </Text>
        {contact.address1 ? (
          <Text style={styles.rowAddress} numberOfLines={1}>
            {contact.address1}
            {contact.city ? `, ${contact.city}` : ''}
          </Text>
        ) : null}
        {contact.phone ? (
          <View style={styles.phoneRow}>
            <Phone size={11} color="#94a3b8" />
            <Text style={styles.rowPhone}>{contact.phone}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.badge, { backgroundColor: cfg.color }]}>
        <Text style={styles.badgeText}>{cfg.label}</Text>
      </View>

      <ChevronRight size={16} color="#94a3b8" />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ContactsScreen() {
  const { user } = useAuth();
  const campaignId = user?.activeCampaignId ?? '';

  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (!campaignId) return;
      setLoading(true);
      setError(null);

      try {
        const result = await apiFetch<{ data: Contact[] }>('/api/contacts', {
          params: {
            campaignId,
            search: q.trim() || undefined,
            pageSize: '20',
          },
        });
        setContacts(result.data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Error ${err.status}: ${err.message}`);
        } else {
          setError('Could not load contacts. Check your connection.');
        }
      } finally {
        setLoading(false);
      }
    },
    [campaignId],
  );

  // Initial load (empty search = first 20)
  useEffect(() => {
    search('');
  }, [search]);

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, address, phone…"
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          blurOnSubmit={true}
          onSubmitEditing={() => Keyboard.dismiss()}
          accessibilityLabel="Search contacts"
        />
        {query.length > 0 ? (
          <Pressable
            style={styles.clearButton}
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <X size={16} color="#64748b" />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={NAVY} />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      ) : null}

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ContactRow contact={item} onPress={(c) => { Keyboard.dismiss(); setSelectedContact(c); }} />
        )}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListFooterComponent={
          contacts.length === 20 ? (
            <Text style={styles.footerNote}>Showing top 20 results — refine your search to find more.</Text>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {query ? 'No contacts found' : 'No contacts in this campaign'}
              </Text>
              {query ? (
                <Text style={styles.emptySubtitle}>Try a different name or address.</Text>
              ) : null}
            </View>
          ) : null
        }
      />

      <ContactDetailSheet
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
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

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
  },
  clearButton: {
    padding: 6,
  },

  // Error / loading
  errorBanner: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#b91c1c',
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },

  // List
  listContent: {
    paddingBottom: 24,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowPressed: {
    backgroundColor: '#f0f9ff',
  },
  rowInfo: {
    flex: 1,
    marginRight: 8,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  rowAddress: {
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
  rowPhone: {
    fontSize: 12,
    color: '#94a3b8',
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 56,
    alignItems: 'center',
    marginRight: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
});

const detailStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  supportBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  supportBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  flagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  flag: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  flagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  fieldsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  fieldLabel: {
    width: 90,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  fieldValue: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
});
