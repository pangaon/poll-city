import * as turf from "@turf/turf";
import { computeGotvScore } from "@/lib/gotv/score";
import { haversine } from "@/lib/route-optimization";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ContactGeoPoint {
  id: string;
  lat: number;
  lng: number;
  firstName: string;
  lastName: string;
  address1: string | null;
  supportLevel: string;
  voted: boolean;
  gotvScore: number;
  doorsKnocked: number;
  streetNumber: string | null;
}

export function parseBbox(input: string | null): [number, number, number, number] | null {
  if (!input) return null;
  const values = input.split(",").map((part) => Number(part.trim()));
  if (values.length !== 4 || values.some((v) => !Number.isFinite(v))) return null;
  const [swLat, swLng, neLat, neLng] = values;
  return [swLng, swLat, neLng, neLat];
}

export function pointInBbox(point: LatLng, bbox: [number, number, number, number] | null): boolean {
  if (!bbox) return true;
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return point.lng >= minLng && point.lng <= maxLng && point.lat >= minLat && point.lat <= maxLat;
}

export function supportIntensity(level: string): number {
  switch (level) {
    case "strong_support": return 1;
    case "leaning_support": return 0.75;
    case "undecided": return 0.45;
    case "leaning_opposition": return 0.2;
    case "strong_opposition": return 0.1;
    default: return 0.35;
  }
}

export function canvassingIntensity(doorsKnocked: number): number {
  if (doorsKnocked <= 0) return 0.15;
  if (doorsKnocked === 1) return 0.7;
  return 1;
}

export function gotvIntensity(gotvScore: number, voted: boolean): number {
  if (voted) return 0;
  return Math.max(0.1, Math.min(1, gotvScore / 100));
}

export function buildGeoJsonFeatureCollection(points: ContactGeoPoint[]) {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      properties: {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        supportLevel: p.supportLevel,
        voted: p.voted,
        gotvScore: p.gotvScore,
        doorsKnocked: p.doorsKnocked,
        address: p.address1,
      },
      geometry: {
        type: "Point",
        coordinates: [p.lng, p.lat],
      },
    })),
  };
}

function isOddStreetNumber(streetNumber: string | null): boolean | null {
  if (!streetNumber) return null;
  const match = streetNumber.match(/\d+/);
  if (!match) return null;
  return Number(match[0]) % 2 === 1;
}

export function optimizeRoute(
  contacts: ContactGeoPoint[],
  startPoint: LatLng,
): { orderedContacts: ContactGeoPoint[]; totalDistanceKm: number; estimatedMinutes: number } {
  const remaining = [...contacts];
  const ordered: ContactGeoPoint[] = [];
  let current: LatLng = { ...startPoint };

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    const next = remaining.splice(nearestIdx, 1)[0];
    ordered.push(next);
    current = { lat: next.lat, lng: next.lng };
  }

  const odd = ordered.filter((c) => isOddStreetNumber(c.streetNumber) === true);
  const even = ordered.filter((c) => isOddStreetNumber(c.streetNumber) === false);
  const unknown = ordered.filter((c) => isOddStreetNumber(c.streetNumber) === null);
  const streetOptimized = [...odd, ...even, ...unknown];

  let totalDistanceMetres = 0;
  for (let i = 0; i < streetOptimized.length - 1; i++) {
    totalDistanceMetres += haversine(
      streetOptimized[i].lat,
      streetOptimized[i].lng,
      streetOptimized[i + 1].lat,
      streetOptimized[i + 1].lng,
    );
  }

  const totalDistanceKm = totalDistanceMetres / 1000;
  const estimatedMinutes = Math.ceil((totalDistanceKm / 4) * 60 + streetOptimized.length * 1.5);

  return { orderedContacts: streetOptimized, totalDistanceKm, estimatedMinutes };
}

export function areaStats(points: ContactGeoPoint[]) {
  const totalDoors = points.length;
  const knocked = points.filter((p) => p.doorsKnocked > 0).length;
  const supporters = points.filter((p) => p.supportLevel === "strong_support" || p.supportLevel === "leaning_support").length;
  const undecided = points.filter((p) => p.supportLevel === "undecided").length;
  const against = points.filter((p) => p.supportLevel === "leaning_opposition" || p.supportLevel === "strong_opposition").length;
  const notContacted = Math.max(0, totalDoors - knocked);
  const estimatedCanvassHours = Number(((notContacted * 1.5) / 60).toFixed(1));
  const volunteersNeeded = Math.max(1, Math.ceil(estimatedCanvassHours / 3));
  const completionPct = totalDoors > 0 ? Math.round((knocked / totalDoors) * 100) : 0;

  return {
    totalDoors,
    knocked,
    remaining: notContacted,
    supporters,
    undecided,
    against,
    notContacted,
    estimatedCanvassHours,
    volunteersNeeded,
    completionPct,
  };
}

export function inPolygon(point: LatLng, polygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>): boolean {
  return turf.booleanPointInPolygon(turf.point([point.lng, point.lat]), polygon);
}

export function buildContactGeoPoint(input: {
  id: string;
  firstName: string;
  lastName: string;
  address1: string | null;
  supportLevel: string;
  voted: boolean;
  gotvStatus: string;
  signRequested: boolean;
  volunteerInterest: boolean;
  lastContactedAt: Date | null;
  streetNumber: string | null;
  household: { lat: number | null; lng: number | null; visited: boolean } | null;
  interactionsCount: number;
}): ContactGeoPoint | null {
  const lat = input.household?.lat;
  const lng = input.household?.lng;
  if (lat == null || lng == null) return null;

  const gotvScore = computeGotvScore({
    supportLevel: input.supportLevel as never,
    gotvStatus: input.gotvStatus as never,
    signRequested: input.signRequested,
    volunteerInterest: input.volunteerInterest,
    lastContactedAt: input.lastContactedAt,
    voted: input.voted,
  }).score;

  return {
    id: input.id,
    lat,
    lng,
    firstName: input.firstName,
    lastName: input.lastName,
    address1: input.address1,
    supportLevel: input.supportLevel,
    voted: input.voted,
    gotvScore,
    doorsKnocked: input.interactionsCount > 0 || Boolean(input.household?.visited) ? 1 : 0,
    streetNumber: input.streetNumber,
  };
}
