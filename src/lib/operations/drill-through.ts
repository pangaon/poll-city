export interface DrillThroughTarget {
  id: string;
  label: string;
  route: string;
  dataset: string;
  filters: Record<string, string | number | boolean>;
  defaultAction: "open_list" | "assign_team" | "create_task" | "notify";
}

export interface GotvDrillThroughMap {
  gap: DrillThroughTarget;
  confirmedSupporters: DrillThroughTarget;
  supportersVoted: DrillThroughTarget;
  p1Count: DrillThroughTarget;
  p2Count: DrillThroughTarget;
  p3Count: DrillThroughTarget;
  p4Count: DrillThroughTarget;
  votedToday: DrillThroughTarget;
}

export function buildGotvDrillThroughMap(campaignId: string): GotvDrillThroughMap {
  return {
    gap: {
      id: "gotv_gap",
      label: "Supporters not yet voted",
      route: `/gotv?campaignId=${campaignId}&view=gap`,
      dataset: "contacts",
      filters: {
        campaignId,
        supportLevelIn: "strong_support,leaning_support",
        voted: false,
      },
      defaultAction: "assign_team",
    },
    confirmedSupporters: {
      id: "gotv_confirmed_supporters",
      label: "Confirmed supporters",
      route: `/contacts?campaignId=${campaignId}&support=strong_support,leaning_support`,
      dataset: "contacts",
      filters: {
        campaignId,
        supportLevelIn: "strong_support,leaning_support",
      },
      defaultAction: "open_list",
    },
    supportersVoted: {
      id: "gotv_supporters_voted",
      label: "Supporters marked voted",
      route: `/gotv?campaignId=${campaignId}&view=voted-supporters`,
      dataset: "contacts",
      filters: {
        campaignId,
        supportLevelIn: "strong_support,leaning_support",
        voted: true,
      },
      defaultAction: "open_list",
    },
    p1Count: {
      id: "gotv_tier_1",
      label: "Priority 1 outstanding",
      route: `/gotv?campaignId=${campaignId}&tier=1`,
      dataset: "gotv_priority",
      filters: {
        campaignId,
        tier: 1,
        voted: false,
      },
      defaultAction: "assign_team",
    },
    p2Count: {
      id: "gotv_tier_2",
      label: "Priority 2 outstanding",
      route: `/gotv?campaignId=${campaignId}&tier=2`,
      dataset: "gotv_priority",
      filters: {
        campaignId,
        tier: 2,
        voted: false,
      },
      defaultAction: "open_list",
    },
    p3Count: {
      id: "gotv_tier_3",
      label: "Priority 3 outstanding",
      route: `/gotv?campaignId=${campaignId}&tier=3`,
      dataset: "gotv_priority",
      filters: {
        campaignId,
        tier: 3,
        voted: false,
      },
      defaultAction: "open_list",
    },
    p4Count: {
      id: "gotv_tier_4",
      label: "Priority 4 outstanding",
      route: `/gotv?campaignId=${campaignId}&tier=4`,
      dataset: "gotv_priority",
      filters: {
        campaignId,
        tier: 4,
        voted: false,
      },
      defaultAction: "open_list",
    },
    votedToday: {
      id: "gotv_voted_today",
      label: "Voted today",
      route: `/gotv?campaignId=${campaignId}&view=voted-today`,
      dataset: "contacts",
      filters: {
        campaignId,
        voted: true,
        votedAt: "today",
      },
      defaultAction: "open_list",
    },
  };
}

