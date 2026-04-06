export type SupportLevel =
  | "SUPPORTER"
  | "LEANING_SUPPORTER"
  | "UNDECIDED"
  | "LEANING_AGAINST"
  | "AGAINST"
  | "UNKNOWN"
  | "strong_support"
  | "leaning_support"
  | "undecided"
  | "leaning_opposition"
  | "strong_opposition"
  | "unknown";

export type VotedDisplayMode = "invisible" | "strikethrough" | "dimmed" | "hidden-count" | "tag" | "hidden";

export type CampaignRole =
  | "MANAGER"
  | "CANVASSER"
  | "FINANCE"
  | "VIEWER"
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CAMPAIGN_MANAGER"
  | "VOLUNTEER"
  | "VOLUNTEER_LEADER"
  | "PUBLIC_USER";

export interface ContactSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  supportLevel: SupportLevel;
  gotvScore: number;
  voted: boolean;
  votedAt: string | null;
  tags: string[];
  lastContactedAt: string | null;
}

export interface WalkListEntry {
  contact: ContactSummary;
  distance?: number;
  streetSide: "odd" | "even" | "unknown";
  householdMembers: ContactSummary[];
}

export interface InteractionCreate {
  contactId: string;
  type: "door_knock" | "phone_call" | "text" | "email" | "field_encounter" | "event" | "note";
  supportLevel?: SupportLevel;
  notes?: string;
  latitude?: number;
  longitude?: number;
  offline?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
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
