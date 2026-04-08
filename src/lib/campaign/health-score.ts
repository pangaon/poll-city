/**
 * Campaign Health Score
 *
 * A single 0-100 composite metric that summarises campaign momentum.
 * Designed to surface on the dashboard and in Adoni briefing context.
 *
 * Dimensions (weighted):
 *   1. Voter Contact Rate      25 pts  — % of contacts reached at least once
 *   2. Support Ratio           20 pts  — (strong + leaning) / total known opinion
 *   3. GOTV Readiness          20 pts  — P1+P2 count vs estimated win threshold
 *   4. Field Activity          15 pts  — door knocks + calls in last 7 days
 *   5. Volunteer Engagement    10 pts  — active volunteers as % of target (20)
 *   6. Donation Progress       10 pts  — raised vs goal (capped at goal)
 *
 * Grade bands:
 *   90-100  🟢 Excellent — on track to win
 *   75-89   🟢 Strong — minor gaps to close
 *   60-74   🟡 Moderate — needs attention in specific areas
 *   40-59   🟠 Concerning — campaign at risk
 *   <40     🔴 Critical — major intervention needed
 */

export interface HealthDimension {
  key: string;
  label: string;
  score: number;    // 0-100 within dimension
  weight: number;   // fraction of total (must sum to 1)
  detail: string;   // one-line human-readable explanation
}

export interface CampaignHealthResult {
  overall: number;               // 0-100
  grade: "excellent" | "strong" | "moderate" | "concerning" | "critical";
  gradeColor: string;
  headline: string;              // e.g. "On track — close the volunteer gap"
  dimensions: HealthDimension[];
  computedAt: string;            // ISO timestamp
}

export interface HealthInput {
  totalContacts: number;
  contactedContacts: number;       // contacted at least once
  strongSupport: number;
  leaningSupport: number;
  opposition: number;              // leaning + strong
  p1Count: number;
  p2Count: number;
  winThreshold: number;            // estimated votes needed to win
  doorsLast7Days: number;
  callsLast7Days: number;
  activeVolunteers: number;        // volunteered in last 14 days
  donationsRaised: number;
  donationGoal: number;
}

export function computeCampaignHealth(input: HealthInput): CampaignHealthResult {
  const dims: HealthDimension[] = [];

  // 1. Voter Contact Rate (25 pts)
  const contactRate = input.totalContacts > 0
    ? Math.min(1, input.contactedContacts / input.totalContacts)
    : 0;
  dims.push({
    key: "contact_rate",
    label: "Voter Contact Rate",
    score: Math.round(contactRate * 100),
    weight: 0.25,
    detail: `${input.contactedContacts.toLocaleString()} of ${input.totalContacts.toLocaleString()} voters reached (${Math.round(contactRate * 100)}%)`,
  });

  // 2. Support Ratio (20 pts)
  // Score = (strong*1.0 + leaning*0.6) / max(1, known) — known = total - unknown
  const knownOpinion = input.strongSupport + input.leaningSupport + input.opposition;
  const supportRaw = knownOpinion > 0
    ? (input.strongSupport * 1.0 + input.leaningSupport * 0.6) / knownOpinion
    : 0;
  // Scale: 0.5+ = 100, 0.3 = 60, 0 = 0
  const supportScore = Math.min(100, Math.round((supportRaw / 0.5) * 100));
  dims.push({
    key: "support_ratio",
    label: "Support Ratio",
    score: supportScore,
    weight: 0.20,
    detail: `${input.strongSupport.toLocaleString()} strong + ${input.leaningSupport.toLocaleString()} leaning vs ${input.opposition.toLocaleString()} opposition`,
  });

  // 3. GOTV Readiness (20 pts)
  // P1+P2 vs win threshold
  const gotvPool = input.p1Count + input.p2Count;
  const gotvRaw = input.winThreshold > 0 ? Math.min(1, gotvPool / input.winThreshold) : 1;
  dims.push({
    key: "gotv_readiness",
    label: "GOTV Readiness",
    score: Math.round(gotvRaw * 100),
    weight: 0.20,
    detail: `${gotvPool.toLocaleString()} P1/P2 supporters vs ${input.winThreshold.toLocaleString()} win threshold`,
  });

  // 4. Field Activity (15 pts)
  // Target: 200 doors + 100 calls per 7 days (reasonable for active campaign)
  const fieldTarget = 300;
  const fieldActual = input.doorsLast7Days + input.callsLast7Days;
  const fieldScore = Math.min(100, Math.round((fieldActual / fieldTarget) * 100));
  dims.push({
    key: "field_activity",
    label: "Field Activity (7 days)",
    score: fieldScore,
    weight: 0.15,
    detail: `${input.doorsLast7Days.toLocaleString()} doors + ${input.callsLast7Days.toLocaleString()} calls in last 7 days`,
  });

  // 5. Volunteer Engagement (10 pts)
  // Target: 20 active volunteers
  const volunteerScore = Math.min(100, Math.round((input.activeVolunteers / 20) * 100));
  dims.push({
    key: "volunteers",
    label: "Volunteer Engagement",
    score: volunteerScore,
    weight: 0.10,
    detail: `${input.activeVolunteers} active volunteers in last 14 days`,
  });

  // 6. Donation Progress (10 pts)
  const donationScore = input.donationGoal > 0
    ? Math.min(100, Math.round((input.donationsRaised / input.donationGoal) * 100))
    : 50; // no goal set = neutral
  dims.push({
    key: "donations",
    label: "Donation Progress",
    score: donationScore,
    weight: 0.10,
    detail: `$${input.donationsRaised.toLocaleString()} raised${input.donationGoal > 0 ? ` of $${input.donationGoal.toLocaleString()} goal` : ""}`,
  });

  // Composite
  const overall = Math.round(
    dims.reduce((sum, d) => sum + d.score * d.weight, 0)
  );

  const grade =
    overall >= 90 ? "excellent" :
    overall >= 75 ? "strong" :
    overall >= 60 ? "moderate" :
    overall >= 40 ? "concerning" : "critical";

  const gradeColor =
    grade === "excellent" || grade === "strong" ? "#1D9E75" :
    grade === "moderate" ? "#EF9F27" :
    "#E24B4A";

  // Weakest dimension for headline
  const weakest = dims.slice().sort((a, b) => a.score - b.weight - b.score + a.weight)[0];
  const headlines: Record<string, string> = {
    excellent: "Firing on all cylinders — maintain momentum",
    strong: `Strong position — close the gap in ${weakest.label.toLowerCase()}`,
    moderate: `Steady progress — ${weakest.label.toLowerCase()} needs attention`,
    concerning: `At risk — prioritise ${weakest.label.toLowerCase()} immediately`,
    critical: "Campaign needs urgent intervention across multiple areas",
  };

  return {
    overall,
    grade,
    gradeColor,
    headline: headlines[grade],
    dimensions: dims,
    computedAt: new Date().toISOString(),
  };
}

export function gradeLabel(grade: CampaignHealthResult["grade"]): string {
  switch (grade) {
    case "excellent": return "Excellent";
    case "strong": return "Strong";
    case "moderate": return "Moderate";
    case "concerning": return "Concerning";
    case "critical": return "Critical";
  }
}
