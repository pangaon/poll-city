/**
 * Standardized API error responses.
 *
 * Rules:
 * - Never leak internal error messages, stack traces, or Prisma errors to clients
 * - Use consistent shapes: { error: string }
 * - Log full error server-side, return sanitized message to client
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export function apiError(
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

export function internalError(err: unknown, context: string): NextResponse {
  // Log full error server-side for debugging
  console.error(`[API Error] ${context}:`, err);

  // Prisma known errors — map to safe messages
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return apiError("A record with this value already exists", 409);
    }
    if (err.code === "P2025") {
      return apiError("Record not found", 404);
    }
    // Don't expose other Prisma codes — they can reveal schema structure
    return apiError("Database error", 500);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return apiError("Invalid data", 400);
  }

  // Generic — never expose the actual error message
  return apiError("An unexpected error occurred", 500);
}

export const FORBIDDEN = apiError("Forbidden", 403);
export const NOT_FOUND = apiError("Not found", 404);
export const UNAUTHORIZED = apiError("Authentication required", 401);
