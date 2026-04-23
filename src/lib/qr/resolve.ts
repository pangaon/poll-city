import prisma from "@/lib/db/prisma";
import { QrConditionType, QrActionType } from "@prisma/client";

export interface QrScanContext {
  userId?: string;
  userRole?: string;
  lat?: number;
  lng?: number;
  activeRouteId?: string;
  scanCount?: number;
  currentTime?: Date;
}

export interface QrResolvedAction {
  actionType: QrActionType;
  actionPayload: Record<string, unknown>;
  ruleId?: string;
}

function isWithinTimeWindow(
  conditionValue: Record<string, unknown>,
  now: Date
): boolean {
  const { start, end, days } = conditionValue as { start?: string; end?: string; days?: number[] };
  if (days && !days.includes(now.getDay())) return false;
  if (start && end) {
    const h = now.getHours();
    const m = now.getMinutes();
    const current = h * 60 + m;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return current >= sh * 60 + sm && current <= eh * 60 + em;
  }
  return true;
}

function isWithinRadius(
  conditionValue: Record<string, unknown>,
  lat?: number,
  lng?: number
): boolean {
  if (!lat || !lng) return false;
  const { lat: clat, lng: clng, radiusMetres } = conditionValue as { lat: number; lng: number; radiusMetres: number };
  // Haversine approximation (good enough for sub-km distances)
  const R = 6371000;
  const dLat = ((lat - clat) * Math.PI) / 180;
  const dLng = ((lng - clng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((clat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return dist <= radiusMetres;
}

function conditionMatches(
  conditionType: QrConditionType,
  conditionValue: Record<string, unknown>,
  ctx: QrScanContext
): boolean {
  switch (conditionType) {
    case "user_role":
      if (!ctx.userId) return conditionValue["role"] === "anonymous";
      return ctx.userRole === conditionValue["role"];

    case "active_route":
      return ctx.activeRouteId === conditionValue["routeId"];

    case "time_window":
      return isWithinTimeWindow(conditionValue, ctx.currentTime ?? new Date());

    case "location_radius":
      return isWithinRadius(conditionValue, ctx.lat, ctx.lng);

    case "scan_count": {
      const { min, max } = conditionValue as { min?: number; max?: number };
      const count = ctx.scanCount ?? 0;
      if (min != null && count < min) return false;
      if (max != null && count > max) return false;
      return true;
    }
  }
}

export async function resolveQrAction(
  qrCodeId: string,
  ctx: QrScanContext
): Promise<QrResolvedAction | null> {
  const rules = await prisma.qrContextRule.findMany({
    where: { qrCodeId, isActive: true },
    orderBy: { priority: "asc" },
  });

  for (const rule of rules) {
    const cv = rule.conditionValue as Record<string, unknown>;
    if (conditionMatches(rule.conditionType, cv, ctx)) {
      return {
        actionType: rule.actionType,
        actionPayload: rule.actionPayload as Record<string, unknown>,
        ruleId: rule.id,
      };
    }
  }

  return null;
}
