export type SummaryResponse = {
  confirmedSupporters: number;
  supportersVoted: number;
  gap: number;
  winThreshold: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  p4Count: number;
  votedToday: number;
  percentComplete: number;
  totalContacts: number;
  totalVoted: number;
};

export type PriorityContact = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address1: string | null;
  city: string | null;
  supportLevel: string;
  gotvStatus: string | null;
};

export type PriorityListResponse = {
  data: PriorityContact[];
};

export type PrecinctSnapshot = {
  id: string;
  name: string;
  turnoutPercent: number;
  targetVotes: number;
  projectedVotes: number;
  gapVotes: number;
  remainingContacts: number;
  priority: "critical" | "watch" | "stable";
};

export const MOCK_SUMMARY: SummaryResponse = {
  confirmedSupporters: 5420,
  supportersVoted: 2988,
  gap: 812,
  winThreshold: 3800,
  p1Count: 920,
  p2Count: 1140,
  p3Count: 760,
  p4Count: 420,
  votedToday: 1860,
  percentComplete: 55,
  totalContacts: 10850,
  totalVoted: 4920,
};

export const MOCK_PRIORITY: PriorityContact[] = [
  {
    id: "mock-1",
    firstName: "Jordan",
    lastName: "Lee",
    phone: "555-0101",
    address1: "114 Queen St",
    city: "Poll City",
    supportLevel: "strong_support",
    gotvStatus: "pending",
  },
  {
    id: "mock-2",
    firstName: "Rina",
    lastName: "Patel",
    phone: "555-0199",
    address1: "22 Bay Ave",
    city: "Poll City",
    supportLevel: "leaning_support",
    gotvStatus: "pending",
  },
  {
    id: "mock-3",
    firstName: "Carlos",
    lastName: "Nguyen",
    phone: "555-0174",
    address1: "19 Cedar Cres",
    city: "Poll City",
    supportLevel: "strong_support",
    gotvStatus: "pending",
  },
];

export function supportLabel(supportLevel: string) {
  if (supportLevel === "strong_support") return "Strong";
  if (supportLevel === "leaning_support") return "Leaning";
  return "Other";
}

export function formatAddress(contact: PriorityContact) {
  const pieces = [contact.address1, contact.city].filter(Boolean);
  return pieces.length > 0 ? pieces.join(", ") : "Address unavailable";
}

function hashToBucket(input: string, bucketCount: number) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % bucketCount;
}

export function buildPrecinctSnapshots(
  summary: SummaryResponse | null,
  contacts: PriorityContact[],
): PrecinctSnapshot[] {
  const names = [
    "North River",
    "Old Town",
    "West Market",
    "Hillcrest",
    "Central Park",
    "Lakeside",
    "South Gate",
    "Harbor East",
    "University",
    "Industrial",
    "Maple Ridge",
    "Brookfield",
  ];

  const bucketCount = names.length;
  const remainingByBucket = Array.from({ length: bucketCount }, () => 0);

  for (const contact of contacts) {
    remainingByBucket[hashToBucket(contact.id, bucketCount)] += 1;
  }

  const confirmedSupporters = summary?.confirmedSupporters ?? MOCK_SUMMARY.confirmedSupporters;
  const votedSupporters = summary?.supportersVoted ?? MOCK_SUMMARY.supportersVoted;
  const baseTarget = Math.max(120, Math.round(confirmedSupporters / bucketCount));
  const baseProjected = Math.round(votedSupporters / bucketCount);

  return names.map((name, index) => {
    const targetVotes = Math.max(90, baseTarget + ((index % 3) - 1) * 24);
    const projectedVotes = Math.max(0, baseProjected + ((index % 4) - 1.5) * 18);
    const gapVotes = Math.max(0, Math.round(targetVotes - projectedVotes));
    const turnoutPercent = Math.max(0, Math.min(100, Math.round((projectedVotes / targetVotes) * 100)));
    const remainingContacts = Math.max(remainingByBucket[index], Math.round(gapVotes * 0.9));

    let priority: PrecinctSnapshot["priority"] = "stable";
    if (gapVotes >= 95 || turnoutPercent < 50) priority = "critical";
    else if (gapVotes >= 45 || turnoutPercent < 65) priority = "watch";

    return {
      id: `pct-${index + 1}`,
      name,
      turnoutPercent,
      targetVotes,
      projectedVotes: Math.round(projectedVotes),
      gapVotes,
      remainingContacts,
      priority,
    };
  });
}
