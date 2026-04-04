import { Role, SupportLevel, InteractionType, TaskStatus, TaskPriority, CanvassStatus, ElectionType } from "@prisma/client";
import "next-auth";

// ─── NextAuth Augmentation ─────────────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

// ─── Re-export Prisma Enums ─────────────────────────────────────────────────
export { Role, SupportLevel, InteractionType, TaskStatus, TaskPriority, CanvassStatus, ElectionType };

// ─── UI-facing Type Helpers ────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ContactFilters {
  campaignId: string;
  search?: string;
  supportLevel?: SupportLevel;
  followUpNeeded?: boolean;
  volunteerInterest?: boolean;
  signRequested?: boolean;
  doNotContact?: boolean;
  tagIds?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Support Level Display Helpers ────────────────────────────────────────

export const SUPPORT_LEVEL_LABELS: Record<SupportLevel, string> = {
  strong_support: "Strong Support",
  leaning_support: "Leaning Support",
  undecided: "Undecided",
  leaning_opposition: "Leaning Opposition",
  strong_opposition: "Strong Opposition",
  unknown: "Unknown",
};

export const SUPPORT_LEVEL_COLORS: Record<SupportLevel, string> = {
  strong_support: "bg-emerald-100 text-emerald-800 border-emerald-200",
  leaning_support: "bg-green-100 text-green-800 border-green-200",
  undecided: "bg-amber-100 text-amber-800 border-amber-200",
  leaning_opposition: "bg-orange-100 text-orange-800 border-orange-200",
  strong_opposition: "bg-red-100 text-red-800 border-red-200",
  unknown: "bg-gray-100 text-gray-700 border-gray-200",
};

export const SUPPORT_LEVEL_DOT_COLORS: Record<SupportLevel, string> = {
  strong_support: "bg-emerald-500",
  leaning_support: "bg-green-500",
  undecided: "bg-amber-500",
  leaning_opposition: "bg-orange-500",
  strong_opposition: "bg-red-500",
  unknown: "bg-gray-400",
};

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  door_knock: "Door Knock",
  phone_call: "Phone Call",
  text: "Text Message",
  email: "Email",
  event: "Event",
  note: "Note",
  follow_up: "Follow-up",
  field_encounter: "Field Encounter",
};

export const ELECTION_TYPE_LABELS: Record<ElectionType, string> = {
  municipal: "Municipal",
  provincial: "Provincial",
  federal: "Federal",
  by_election: "By-Election",
  other: "Other",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export const COMMON_ISSUES = [
  "Transit",
  "Housing",
  "Environment",
  "Safety",
  "Seniors",
  "Schools",
  "Parks",
  "Taxes",
  "Roads",
  "Zoning",
  "Healthcare",
  "Childcare",
  "Local Business",
  "Other",
];

export const CANADIAN_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];
