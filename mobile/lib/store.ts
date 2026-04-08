/**
 * Offline walk list cache using AsyncStorage.
 *
 * Stores a local copy of the walk list so the canvasser can work without
 * connectivity. Pending interactions are queued here and synced via
 * the sync service in lib/sync.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const WALK_LIST_KEY = '@poll_city_walk_list_v2';
const PENDING_INTERACTIONS_KEY = '@poll_city_pending_interactions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedContact {
  id: string;
  firstName: string;
  lastName: string;
  address1: string | null;
  city: string | null;
  phone: string | null;
  supportLevel: string;
  followUpNeeded: boolean;
  notes: string | null;
  lat: number | null;
  lng: number | null;
}

export interface PendingInteraction {
  /** Local UUID — used to deduplicate before server confirms. */
  id: string;
  contactId: string;
  campaignId: string;
  type: string;
  notes: string;
  supportLevel: string;
  createdAt: string;
  synced: boolean;
}

// ---------------------------------------------------------------------------
// Walk list cache
// ---------------------------------------------------------------------------

export async function cacheWalkList(contacts: CachedContact[]): Promise<void> {
  await AsyncStorage.setItem(WALK_LIST_KEY, JSON.stringify(contacts));
}

export async function getCachedWalkList(): Promise<CachedContact[]> {
  const raw = await AsyncStorage.getItem(WALK_LIST_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CachedContact[];
  } catch {
    return [];
  }
}

export async function clearWalkListCache(): Promise<void> {
  await AsyncStorage.removeItem(WALK_LIST_KEY);
}

// ---------------------------------------------------------------------------
// Pending interactions
// ---------------------------------------------------------------------------

export async function addPendingInteraction(
  interaction: Omit<PendingInteraction, 'id' | 'synced'>,
): Promise<PendingInteraction> {
  const existing = await getPendingInteractions();
  const newItem: PendingInteraction = {
    ...interaction,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    synced: false,
  };
  await AsyncStorage.setItem(
    PENDING_INTERACTIONS_KEY,
    JSON.stringify([...existing, newItem]),
  );
  return newItem;
}

export async function getPendingInteractions(): Promise<PendingInteraction[]> {
  const raw = await AsyncStorage.getItem(PENDING_INTERACTIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingInteraction[];
  } catch {
    return [];
  }
}

export async function markSynced(localId: string): Promise<void> {
  const existing = await getPendingInteractions();
  const updated = existing.map((i) =>
    i.id === localId ? { ...i, synced: true } : i,
  );
  await AsyncStorage.setItem(PENDING_INTERACTIONS_KEY, JSON.stringify(updated));
}

export async function getPendingCount(): Promise<number> {
  const items = await getPendingInteractions();
  return items.filter((i) => !i.synced).length;
}

export async function clearSyncedInteractions(): Promise<void> {
  const items = await getPendingInteractions();
  const unsyced = items.filter((i) => !i.synced);
  await AsyncStorage.setItem(PENDING_INTERACTIONS_KEY, JSON.stringify(unsyced));
}
