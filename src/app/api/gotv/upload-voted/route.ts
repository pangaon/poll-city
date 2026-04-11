import { NextRequest } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { POST as uploadPost } from "../upload/route";

/**
 * Backwards-compatible alias for clients that still call /api/gotv/upload-voted.
 * Canonical handler remains /api/gotv/upload.
 *
 * Auth is checked here explicitly so that every route file has a visible
 * authentication gate — the canonical handler will re-check, which is harmless.
 */
export async function POST(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;

  return uploadPost(req);
}
