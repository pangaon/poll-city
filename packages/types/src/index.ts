/**
 * @poll-city/types
 *
 * Shared TypeScript types used across all products.
 * No runtime code. No business logic. Types only.
 *
 * Import path in apps: import type { ... } from "@poll-city/types"
 * Phase 1: Types are duplicated in src/types/. Phase 2: apps import from here.
 */

// ── Identity ───────────────────────────────────────────────────────────────

export type UserId = string;
export type CampaignId = string;
export type ContactId = string;
export type PollId = string;
export type OfficialId = string;

// ── User roles ─────────────────────────────────────────────────────────────
// User.role — system-level. Set at account creation.
export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CAMPAIGN_MANAGER"
  | "VOLUNTEER"
  | "PUBLIC_USER";

// Membership.role — campaign-scoped. Controls Admin access within a campaign.
export type MemberRole =
  | "ADMIN"
  | "CAMPAIGN_MANAGER"
  | "VOLUNTEER";

// ── Poll types ─────────────────────────────────────────────────────────────

export type PollType =
  | "binary"
  | "multiple_choice"
  | "slider"
  | "ranked"
  | "swipe"
  | "image_swipe"
  | "priority_rank";

export type PollVisibility = "public" | "unlisted" | "campaign_only";

export type SwipeDirection = "left" | "right" | "up" | "skip";

// ── Support levels ─────────────────────────────────────────────────────────

export type SupportLevel =
  | "strong_support"
  | "leaning_support"
  | "undecided"
  | "leaning_opposition"
  | "strong_opposition"
  | "unknown";

// ── GOTV status ────────────────────────────────────────────────────────────

export type GotvStatus =
  | "not_pulled"
  | "pulled"
  | "voted"
  | "unreachable";

// ── Election types ─────────────────────────────────────────────────────────

export type ElectionType =
  | "municipal"
  | "provincial"
  | "federal"
  | "school_board"
  | "referendum"
  | "other";

export type GovernmentLevel =
  | "federal"
  | "provincial"
  | "municipal"
  | "school_board";

// ── Task ───────────────────────────────────────────────────────────────────

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

// ── Sign ───────────────────────────────────────────────────────────────────

export type SignStatus =
  | "requested"
  | "approved"
  | "scheduled"
  | "installed"
  | "declined"
  | "removed";

// ── Notification ───────────────────────────────────────────────────────────

export type NotificationChannel = "in_app" | "email" | "sms" | "push";

// ── Bridge signal types ────────────────────────────────────────────────────

export type BridgeSignalType =
  | "support"
  | "oppose"
  | "neutral"
  | "volunteer_optin"
  | "sign_request"
  | "contact_permission"
  | "update_optin";

// ── Consent ────────────────────────────────────────────────────────────────

export interface ConsentRecord {
  userId: UserId;
  campaignId: CampaignId;
  signalType: BridgeSignalType;
  consentedAt: string;        // ISO 8601
  revokedAt: string | null;
  consentScope: string;
  fieldsTransferred: string[];
}

// ── Pagination ─────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Geography ─────────────────────────────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PostalLookupResult {
  postalPrefix: string;
  ward: string | null;
  riding: string | null;
  province: string | null;
  city: string | null;
}

// ── Product context ────────────────────────────────────────────────────────
// Used to determine which product a request is coming from.

export type ProductContext = "admin" | "social" | "print" | "hq";

// ── Interaction types ──────────────────────────────────────────────────────

export type InteractionType =
  | "door_knock"
  | "phone_call"
  | "email"
  | "text"
  | "event"
  | "social_media"
  | "mail"
  | "other";

// ── Field types (custom fields) ────────────────────────────────────────────

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "multiselect"
  | "url"
  | "email"
  | "phone"
  | "currency"
  | "percentage"
  | "rating"
  | "color"
  | "json";

export type FieldCategory = "contact" | "canvassing" | "voting" | "volunteer" | "custom";

// ── Service booking ────────────────────────────────────────────────────────

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ServiceCategory =
  | "print"
  | "signs"
  | "digital"
  | "consulting"
  | "events"
  | "data"
  | "other";
