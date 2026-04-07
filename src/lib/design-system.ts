export const T = {
  navy: "#0A2342",
  navy2: "#1A3F6F",
  tint: "#E8EFF8",
  green: "#1D9E75",
  amber: "#EF9F27",
  red: "#E24B4A",
  purple: "#7F77DD",
  warBg: "#0A1628",
  warCard: "#0F1F35",
} as const;

export const SPRINGS = {
  snappy: { type: "spring", stiffness: 400, damping: 30 },
  bouncy: { type: "spring", stiffness: 300, damping: 15 },
  smooth: { type: "spring", stiffness: 200, damping: 25 },
  gentle: { type: "spring", stiffness: 120, damping: 20 },
} as const;

export type CampaignMood =
  | "election_day"
  | "winning"
  | "close"
  | "final_push"
  | "momentum"
  | "foundation";

export function getCampaignMood(daysToElection: number, gap: number | null): CampaignMood {
  if (daysToElection === 0) return "election_day";
  if (gap !== null && gap <= 0) return "winning";
  if (gap !== null && gap < 100) return "close";
  if (daysToElection < 10) return "final_push";
  if (daysToElection < 30) return "momentum";
  return "foundation";
}
