/**
 * POST /api/canvasser/sync
 * Batch-processes mutations queued offline by the canvasser app.
 * Each mutation is a previously-queued API call that failed to reach the server.
 *
 * Body: {
 *   campaignId: string
 *   mutations: Array<{ id: string; endpoint: string; method: string; payload: string }>
 * }
 *
 * Returns per-mutation results so the app can mark each as synced or failed.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mobileApiAuth } from "@/lib/auth/helpers";

const mutationSchema = z.object({
  id: z.string(),
  endpoint: z.string().startsWith("/api/"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  payload: z.string(),
});

const schema = z.object({
  campaignId: z.string().min(1),
  mutations: z.array(mutationSchema).min(1).max(100),
});

// Allowlist of endpoints the sync service may call on behalf of the app
const ALLOWED_SYNC_ENDPOINTS = [
  "/api/interactions",
  "/api/canvasser/stops",
  "/api/canvasser/sign-requests",
  "/api/canvasser/volunteer-leads",
  "/api/canvasser/voters",
  "/api/canvasser/adoni/transcripts",
];

function isAllowedEndpoint(endpoint: string): boolean {
  return ALLOWED_SYNC_ENDPOINTS.some(
    (allowed) => endpoint === allowed || endpoint.startsWith(`${allowed}/`),
  );
}

export async function POST(req: NextRequest) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { mutations } = parsed.data;
  const baseUrl = new URL(req.url).origin;
  const results: Array<{ id: string; status: number; ok: boolean }> = [];

  for (const mutation of mutations) {
    if (!isAllowedEndpoint(mutation.endpoint)) {
      results.push({ id: mutation.id, status: 403, ok: false });
      continue;
    }

    try {
      const payload = JSON.parse(mutation.payload) as unknown;

      // Forward the request internally, preserving the user's auth token
      const authHeader = req.headers.get("Authorization") ?? "";
      const res = await fetch(`${baseUrl}${mutation.endpoint}`, {
        method: mutation.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          "Cookie": req.headers.get("cookie") ?? "",
        },
        body: mutation.method !== "GET" ? JSON.stringify(payload) : undefined,
      });

      results.push({ id: mutation.id, status: res.status, ok: res.ok });
    } catch {
      results.push({ id: mutation.id, status: 0, ok: false });
    }
  }

  return NextResponse.json({ data: { results } });
}
