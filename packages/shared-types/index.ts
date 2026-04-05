export type SupportLevel =
  | "strong_support"
  | "leaning_support"
  | "undecided"
  | "leaning_opposition"
  | "strong_opposition"
  | "unknown";

export type VotedDisplayMode = "strikethrough" | "tag" | "hidden";

export type CampaignRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CAMPAIGN_MANAGER"
  | "VOLUNTEER"
  | "VOLUNTEER_LEADER"
  | "PUBLIC_USER";

export interface ContactSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  address1: string | null;
  supportLevel: SupportLevel;
  voted: boolean;
}

export interface WalkListEntry {
  contactId: string;
  address: string;
  stopOrder: number;
  notes: string | null;
}

export interface InteractionCreate {
  contactId: string;
  type: "door_knock" | "phone_call" | "text" | "email" | "event" | "note" | "follow_up" | "field_encounter";
  notes?: string;
  supportLevel?: SupportLevel;
  followUpDate?: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

// ─── Additions: civic + geo + cursor pagination ──────────────────────────────

export type GovernmentLevel = "federal" | "provincial" | "municipal";

export interface OfficialSummary {
  id: string;
  name: string;
  title: string;
  level: GovernmentLevel;
  district: string;
  province: string | null;
  partyName: string | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  isClaimed: boolean;
}

export interface RepresentativeLookup {
  id: string;
  name: string;
  title: string;
  label: string;
  district: string;
  level: GovernmentLevel;
  party: string | null;
  partyName: string | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  sourceUrl: string | null;
  officialId: string | null;
  labelColour: string;
}

export interface GeoLookupResponse {
  representatives: RepresentativeLookup[];
  inputType: "postalCode" | "address" | "coordinates";
  cached: boolean;
  error?: string;
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface ApiError {
  error: string;
  details?: string[] | Record<string, string>;
}
