/**
 * System-wide budget templates.
 * These are sensible defaults for Canadian campaigns at each level.
 * Percentages sum to 1.00 for each template.
 */

export interface TemplateCategory {
  category: string;
  percentOfTotal: number;
  priority: number;
  notes: string;
}

export interface BuiltInTemplate {
  id: string;
  name: string;
  description: string;
  electionLevel: "federal" | "provincial" | "municipal";
  suggestedTotalRange: [number, number]; // [min, max] CAD
  items: TemplateCategory[];
}

export const SYSTEM_BUDGET_TEMPLATES: BuiltInTemplate[] = [
  {
    id: "municipal-small",
    name: "Municipal — Small Town / Ward (< 20k voters)",
    description: "Typical budget mix for small-town mayoral or ward councillor races.",
    electionLevel: "municipal",
    suggestedTotalRange: [5000, 25000],
    items: [
      { category: "Signs & Print", percentOfTotal: 0.40, priority: 1, notes: "Lawn signs, door hangers, flyers — highest-impact tactic at the municipal level." },
      { category: "Digital & Website", percentOfTotal: 0.15, priority: 2, notes: "Candidate website, domain, basic social ads." },
      { category: "Events & Meetings", percentOfTotal: 0.15, priority: 3, notes: "Town halls, coffee meet-ups, venue rentals." },
      { category: "Volunteer Support", percentOfTotal: 0.10, priority: 4, notes: "Food, travel reimbursements, training materials." },
      { category: "Canvassing & Print Literature", percentOfTotal: 0.10, priority: 5, notes: "Walk list printing, door hangers, pens, clipboards." },
      { category: "Election Day", percentOfTotal: 0.05, priority: 6, notes: "Scrutineers, food, transportation for voters." },
      { category: "Contingency", percentOfTotal: 0.05, priority: 7, notes: "Reserve for unexpected opportunities." },
    ],
  },
  {
    id: "municipal-large",
    name: "Municipal — Large City Ward (> 50k voters)",
    description: "Urban ward council or large-city mayoral campaign with paid staff.",
    electionLevel: "municipal",
    suggestedTotalRange: [50000, 250000],
    items: [
      { category: "Staff & Consultants", percentOfTotal: 0.25, priority: 1, notes: "Campaign manager, field director, comms lead." },
      { category: "Signs & Print", percentOfTotal: 0.25, priority: 2, notes: "Lawn signs, billboards, door hangers, mailers." },
      { category: "Digital & Ads", percentOfTotal: 0.18, priority: 3, notes: "Facebook/Instagram ads, Google, website, email." },
      { category: "Events & Venues", percentOfTotal: 0.10, priority: 4, notes: "Town halls, fundraisers, volunteer rallies." },
      { category: "Canvassing Operations", percentOfTotal: 0.08, priority: 5, notes: "Walk list printing, canvassing materials, tech." },
      { category: "Volunteer Support", percentOfTotal: 0.05, priority: 6, notes: "Food, travel, training, appreciation." },
      { category: "Election Day", percentOfTotal: 0.05, priority: 7, notes: "GOTV push, rides-to-polls, scrutineers." },
      { category: "Contingency", percentOfTotal: 0.04, priority: 8, notes: "Reserve fund." },
    ],
  },
  {
    id: "provincial-riding",
    name: "Provincial Riding (Ontario MPP / BC MLA)",
    description: "Standard provincial constituency campaign.",
    electionLevel: "provincial",
    suggestedTotalRange: [75000, 200000],
    items: [
      { category: "Signs & Print", percentOfTotal: 0.30, priority: 1, notes: "Lawn signs + mailouts + door hangers." },
      { category: "Staff & Consultants", percentOfTotal: 0.22, priority: 2, notes: "Campaign manager + field organizer." },
      { category: "Digital & Ads", percentOfTotal: 0.18, priority: 3, notes: "Social ads, website, email infrastructure." },
      { category: "Office & Operations", percentOfTotal: 0.12, priority: 4, notes: "Office rent, utilities, phones, supplies." },
      { category: "Events", percentOfTotal: 0.08, priority: 5, notes: "Debates, town halls, rallies." },
      { category: "Election Day", percentOfTotal: 0.05, priority: 6, notes: "GOTV, scrutineers, rides-to-polls." },
      { category: "Volunteer Support", percentOfTotal: 0.03, priority: 7, notes: "Food, travel, appreciation." },
      { category: "Contingency", percentOfTotal: 0.02, priority: 8, notes: "Reserve." },
    ],
  },
  {
    id: "federal-riding",
    name: "Federal Riding (MP)",
    description: "Federal Member of Parliament campaign — Elections Canada spending limits apply.",
    electionLevel: "federal",
    suggestedTotalRange: [100000, 125000],
    items: [
      { category: "Signs & Print", percentOfTotal: 0.28, priority: 1, notes: "Signs, mailers, door hangers — subject to EC rules." },
      { category: "Staff & Consultants", percentOfTotal: 0.22, priority: 2, notes: "Official agent, campaign manager, field staff." },
      { category: "Digital & Ads", percentOfTotal: 0.20, priority: 3, notes: "Online ads subject to EC disclosure rules." },
      { category: "Office & Operations", percentOfTotal: 0.12, priority: 4, notes: "Campaign office, phones, utilities." },
      { category: "Events & Travel", percentOfTotal: 0.08, priority: 5, notes: "Debates, riding travel, rallies." },
      { category: "Election Day", percentOfTotal: 0.05, priority: 6, notes: "GOTV, scrutineers." },
      { category: "Volunteer Support", percentOfTotal: 0.03, priority: 7, notes: "Food, training, appreciation." },
      { category: "Contingency", percentOfTotal: 0.02, priority: 8, notes: "Reserve." },
    ],
  },
];

export function findTemplate(id: string): BuiltInTemplate | undefined {
  return SYSTEM_BUDGET_TEMPLATES.find((t) => t.id === id);
}

export function templatesForLevel(level: "federal" | "provincial" | "municipal"): BuiltInTemplate[] {
  return SYSTEM_BUDGET_TEMPLATES.filter((t) => t.electionLevel === level);
}
