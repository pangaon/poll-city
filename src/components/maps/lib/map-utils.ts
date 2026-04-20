import type { ExpressionSpecification } from "@maplibre/maplibre-gl-style-spec";

export type SupportLevel =
  | "strong_support"
  | "lean_support"
  | "undecided"
  | "lean_oppose"
  | "strong_oppose";

export const SUPPORT_COLORS: Record<string, string> = {
  strong_support: "#1D9E75",
  lean_support: "#6ee7b7",
  undecided: "#EF9F27",
  lean_oppose: "#fca5a5",
  strong_oppose: "#E24B4A",
  default: "#94a3b8",
};

export interface ContactGeoPoint {
  id: string;
  lat: number;
  lng: number;
  supportLevel: string | null;
  canvassedAt?: string | null;
  visited?: boolean;
  householdId?: string | null;
}

export function buildContactsGeoJSON(contacts: ContactGeoPoint[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: contacts.map((c) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [c.lng, c.lat],
      },
      properties: {
        id: c.id,
        supportLevel: c.supportLevel ?? "default",
        canvassedAt: c.canvassedAt ?? null,
        visited: c.visited ?? false,
        householdId: c.householdId ?? null,
      },
    })),
  };
}

/** MapLibre data-driven expression for circle-color by supportLevel */
export function buildSupportExpression(): ExpressionSpecification {
  return [
    "match",
    ["get", "supportLevel"],
    "strong_support", SUPPORT_COLORS.strong_support,
    "lean_support", SUPPORT_COLORS.lean_support,
    "undecided", SUPPORT_COLORS.undecided,
    "lean_oppose", SUPPORT_COLORS.lean_oppose,
    "strong_oppose", SUPPORT_COLORS.strong_oppose,
    SUPPORT_COLORS.default,
  ];
}

/** 7-state turf colour based on workflow status + completion percent */
export function turfStatusColor(
  status: string | undefined,
  percent: number | null | undefined,
): string {
  const pct = percent ?? 0;
  switch (status) {
    case "completed":  return "#22c55e";
    case "reassigned": return "#a855f7";
    case "in_progress":
      if (pct >= 75) return "#84cc16";
      if (pct >= 40) return "#f97316";
      return "#f59e0b";
    case "assigned":   return "#3b82f6";
    default:           return "#9ca3af";
  }
}

export function turfFillOpacity(
  status: string | undefined,
  percent: number | null | undefined,
): number {
  const pct = percent ?? 0;
  if (status === "completed") return 0.3;
  if (pct > 0) return 0.2;
  if (status === "assigned") return 0.15;
  return 0.08;
}
