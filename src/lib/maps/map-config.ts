export type MapMode = "canvassing" | "walk" | "signs" | "dashboard" | "gotv" | "public";

export interface LayerConfig {
  supportHeat: boolean;
  doorsKnocked: boolean;
  turfBoundaries: boolean;
  volunteerPositions: boolean;
  signs: boolean;
  route: boolean;
  wardBoundary: boolean;
}

export const MAP_LAYER_CONFIG: Record<MapMode, LayerConfig> = {
  canvassing: {
    supportHeat: true,
    doorsKnocked: true,
    turfBoundaries: true,
    volunteerPositions: true,
    signs: false,
    route: true,
    wardBoundary: false,
  },
  walk: {
    supportHeat: false,
    doorsKnocked: true,
    turfBoundaries: true,
    volunteerPositions: false,
    signs: false,
    route: true,
    wardBoundary: false,
  },
  signs: {
    supportHeat: true,
    doorsKnocked: false,
    turfBoundaries: false,
    volunteerPositions: false,
    signs: true,
    route: false,
    wardBoundary: false,
  },
  dashboard: {
    supportHeat: true,
    doorsKnocked: true,
    turfBoundaries: true,
    volunteerPositions: true,
    signs: true,
    route: true,
    wardBoundary: true,
  },
  gotv: {
    supportHeat: true,
    doorsKnocked: false,
    turfBoundaries: true,
    volunteerPositions: false,
    signs: false,
    route: false,
    wardBoundary: false,
  },
  public: {
    supportHeat: false,
    doorsKnocked: false,
    turfBoundaries: false,
    volunteerPositions: false,
    signs: false,
    route: false,
    wardBoundary: true,
  },
};

export const DEFAULT_MAP_CENTER = {
  lat: 43.6532,
  lng: -79.3832,
  zoom: 13,
};
