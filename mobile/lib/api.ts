/**
 * Typed API client for the Poll City backend.
 *
 * - Reads the base URL from EXPO_PUBLIC_API_URL env var.
 * - Attaches Bearer token from SecureStore on every request.
 * - Automatically refreshes expired tokens.
 * - Returns typed JSON or throws an ApiError.
 */

import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import type {
  AuthTokens,
  Campaign,
  Contact,
  CreateInteractionPayload,
  Interaction,
  LoginResponse,
  OcrResult,
  PaginatedResponse,
  ScrutineerAssignment,
  ShiftSummary,
} from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL: string =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  "https://app.poll.city";

const TOKEN_KEY = "poll_city_tokens";

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API ${status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

async function getTokens(): Promise<AuthTokens | null> {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export async function setTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) return null;

  // If the access token is still valid (with 60s buffer), return it
  if (tokens.expiresAt > Date.now() + 60_000) {
    return tokens.accessToken;
  }

  // Attempt a refresh
  try {
    const refreshed = await refreshTokens(tokens.refreshToken);
    await setTokens(refreshed);
    return refreshed.accessToken;
  } catch {
    await clearTokens();
    return null;
  }
}

async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const res = await fetch(`${BASE_URL}/api/auth/mobile/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, await res.json().catch(() => res.statusText));
  }

  const data = (await res.json()) as { tokens: AuthTokens };
  return data.tokens;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | undefined>;
  /** Skip auth header (for login/register). */
  skipAuth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, params, skipAuth = false } = options;

  // Build URL with query params
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }
  }

  // Headers
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => res.statusText);
    throw new ApiError(res.status, errorBody);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiFetch<LoginResponse>("/api/auth/mobile/token", {
    method: "POST",
    body: { email, password },
    skipAuth: true,
  });
  await setTokens(response.tokens);
  return response;
}

export async function logout(): Promise<void> {
  await clearTokens();
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export async function fetchCampaigns(): Promise<{ data: Campaign[] }> {
  return apiFetch<{ data: Campaign[] }>("/api/campaigns");
}

// ---------------------------------------------------------------------------
// Canvassing — Turfs and Walk Lists
// ---------------------------------------------------------------------------

export interface TurfSummary {
  id: string;
  name: string;
  status: string;
  contactCount: number;
  completedCount: number;
  completionPercent: number;
  ward: string | null;
  streets: string[];
  estimatedMinutes: number | null;
  notes: string | null;
}

export interface WalkStop {
  id: string;
  contactId: string;
  order: number;
  visited: boolean;
  visitedAt: string | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    address1: string | null;
    address2: string | null;
    city: string | null;
    postalCode: string | null;
    phone: string | null;
    email: string | null;
    supportLevel: string;
    notes: string | null;
    doNotContact: boolean;
    followUpNeeded: boolean;
  };
}

export async function fetchTurfs(campaignId: string): Promise<{ data: TurfSummary[] }> {
  return apiFetch<{ data: TurfSummary[] }>("/api/canvassing/turfs", {
    params: { campaignId },
  });
}

export async function fetchWalkList(
  turfId: string,
  campaignId: string,
): Promise<{ turf: { id: string; name: string }; data: WalkStop[] }> {
  return apiFetch<{ turf: { id: string; name: string }; data: WalkStop[] }>(
    "/api/canvassing/walk",
    { params: { turfId, campaignId } },
  );
}

// ---------------------------------------------------------------------------
// Contacts / Walk List
// ---------------------------------------------------------------------------

export async function fetchContacts(
  campaignId: string,
  options?: { page?: string; pageSize?: string; cursor?: string },
): Promise<PaginatedResponse<Contact>> {
  return apiFetch<PaginatedResponse<Contact>>("/api/contacts", {
    params: {
      campaignId,
      page: options?.page,
      pageSize: options?.pageSize ?? "100",
      cursor: options?.cursor,
    },
  });
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

export async function createInteraction(
  payload: CreateInteractionPayload,
): Promise<{ data: Interaction }> {
  return apiFetch<{ data: Interaction }>("/api/interactions", {
    method: "POST",
    body: payload,
  });
}

// ---------------------------------------------------------------------------
// vCard export
// ---------------------------------------------------------------------------

/**
 * Returns the full URL to download a contact's vCard (.vcf).
 * Use with Linking.openURL() — iOS will prompt "Add to Contacts".
 */
export function vcardUrl(contactId: string): string {
  return `${BASE_URL}/api/contacts/${contactId}/vcard`;
}

// ---------------------------------------------------------------------------
// Shift summary
// ---------------------------------------------------------------------------

export async function fetchShiftSummary(campaignId: string): Promise<ShiftSummary> {
  return apiFetch<ShiftSummary>("/api/canvassing/shift-summary", {
    params: { campaignId },
  });
}

// ---------------------------------------------------------------------------
// E-Day — Scrutineer assignments
// ---------------------------------------------------------------------------

export async function fetchMyAssignment(
  campaignId: string,
): Promise<{ data: ScrutineerAssignment | null }> {
  return apiFetch<{ data: ScrutineerAssignment | null }>("/api/eday/my-assignment", {
    params: { campaignId },
  });
}

export interface OcrScanPayload {
  campaignId: string;
  /** base64-encoded image data (no data URI prefix) */
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  hint?: {
    pollingStation?: string;
    municipality?: string;
    ward?: string;
    province?: string;
  };
}

export async function ocrScanPrintout(
  payload: OcrScanPayload,
): Promise<{ data: OcrResult }> {
  return apiFetch<{ data: OcrResult }>("/api/results/ocr", {
    method: "POST",
    body: payload,
  });
}

export interface ResultEntryPayload {
  campaignId: string;
  province: string;
  municipality: string;
  ward?: string | null;
  office: string;
  candidateName: string;
  party?: string | null;
  votes: number;
  percentReporting?: number;
  ocrAssisted?: boolean;
}

export async function submitResultEntry(
  payload: ResultEntryPayload,
): Promise<{ data: unknown; verified: boolean; message?: string }> {
  return apiFetch<{ data: unknown; verified: boolean; message?: string }>(
    "/api/results/entry",
    { method: "POST", body: payload },
  );
}
