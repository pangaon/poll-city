/**
 * Nearest-Neighbor Route Optimization
 * Solves the Travelling Salesman Problem heuristically for canvassing turfs.
 * O(n²) time — efficient for turf sizes up to ~500 stops.
 */

export interface GeoStop {
  id: string;
  lat: number;
  lng: number;
  address?: string;
}

/**
 * Haversine distance between two lat/lng pairs (metres).
 */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Nearest-neighbor TSP heuristic.
 * Returns stop IDs in optimized walking order.
 *
 * Strategy: start from the northernmost stop (highest lat) which typically
 * means starting from the top of a street and working south — natural for
 * canvassers reading a walk list.
 */
export function nearestNeighbor(stops: GeoStop[]): string[] {
  if (stops.length === 0) return [];
  if (stops.length === 1) return [stops[0].id];

  // Start from northernmost stop
  const startIdx = stops.reduce(
    (best, s, i) => (s.lat > stops[best].lat ? i : best),
    0
  );

  const visited = new Set<string>();
  const route: string[] = [];
  const lookup: Record<string, GeoStop> = {};
  stops.forEach((s) => { lookup[s.id] = s; });

  let currentId = stops[startIdx].id;
  route.push(currentId);
  visited.add(currentId);

  while (route.length < stops.length) {
    const current = lookup[currentId];
    let nearestId = "";
    let minDist = Infinity;

    stops.forEach((stop) => {
      if (visited.has(stop.id)) return;
      const dist = haversine(current.lat, current.lng, stop.lat, stop.lng);
      if (dist < minDist) {
        minDist = dist;
        nearestId = stop.id;
      }
    });

    if (!nearestId) break;
    route.push(nearestId);
    visited.add(nearestId);
    currentId = nearestId;
  }

  return route;
}

/**
 * Estimate total walking distance (metres) for an ordered route.
 */
export function routeDistanceMetres(stops: GeoStop[]): number {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    total += haversine(stops[i].lat, stops[i].lng, stops[i + 1].lat, stops[i + 1].lng);
  }
  return total;
}

/**
 * Estimate walking time in minutes at 5 km/h with 90s per door.
 */
export function estimateWalkMinutes(distanceMetres: number, stopCount: number): number {
  const walkMinutes = distanceMetres / (5000 / 60); // 5 km/h in m/min
  const doorMinutes = stopCount * 1.5; // 90 seconds per door
  return Math.round(walkMinutes + doorMinutes);
}
