// Ward 20 Toronto — Alexandra Park / Kensington-Chinatown area
export const CANDIDATE_DEMO = {
  campaign: {
    name: "Alex Chen for Ward 20",
    candidate: "Alex Chen",
    ward: "Ward 20 — Kensington-Chinatown",
    electionDate: "October 27, 2026",
    daysToElection: 202,
    party: "Independent",
    slogan: "Our Ward, Our Voice",
  },
  stats: {
    totalContacts: 4179,
    strongSupport: 847,
    leaningSupport: 623,
    unknown: 2041,
    opposition: 668,
    contacted: 2847,
    notContacted: 1332,
    volunteers: 34,
    donations: 28400,
    donationGoal: 75000,
    doorsKnocked: 1923,
    callsCompleted: 445,
  },
  gotv: {
    winThreshold: 2800,
    supportersVoted: 312,
    gap: 2488,
    strongSupportNotVoted: 535,
    p1Count: 847,
    p2Count: 623,
    p3Count: 298,
  },
  recentActivity: [
    { type: "canvass", text: "Door knock on Kensington Ave — 12 contacts recorded", time: "2 hours ago", icon: "map" },
    { type: "donation", text: "Sarah Mitchell donated $250", time: "3 hours ago", icon: "dollar" },
    { type: "volunteer", text: "Marcus Webb signed up to volunteer", time: "5 hours ago", icon: "users" },
    { type: "sign", text: "Sign request from 847 Spadina Ave", time: "Yesterday", icon: "flag" },
    { type: "adoni", text: "Adoni: 193 strong supporters in Ward 20 not yet contacted", time: "Today", icon: "bot" },
  ],
  contacts: [
    { name: "Sarah Mitchell", support: "Strong Support", ward: "Ward 20", lastContact: "Today", phone: "416-555-0142" },
    { name: "David Okafor", support: "Leaning Support", ward: "Ward 20", lastContact: "2 days ago", phone: "416-555-0287" },
    { name: "Linda Zhao", support: "Unknown", ward: "Ward 20", lastContact: "Never", phone: "416-555-0391" },
    { name: "James Kowalski", support: "Strong Support", ward: "Ward 20", lastContact: "1 week ago", phone: "416-555-0456" },
    { name: "Priya Sharma", support: "Leaning Opposition", ward: "Ward 20", lastContact: "3 days ago", phone: "416-555-0512" },
    { name: "Tom Beauchamp", support: "Unknown", ward: "Ward 20", lastContact: "Never", phone: "416-555-0634" },
  ],
  alerts: [
    { severity: "critical", text: "193 strong supporters not yet contacted", module: "GOTV" },
    { severity: "warning", text: "159 follow-ups overdue", module: "Field Ops" },
    { severity: "watch", text: "29 sign requests pending installation", module: "Signs" },
  ],
};

export const PARTY_DEMO = {
  party: {
    name: "Progressive Alliance of Ontario",
    province: "Ontario",
    electionDate: "June 2, 2027",
    leader: "Catherine Rousseau",
    ridings: 124,
    targetRidings: 37,
  },
  stats: {
    totalMembers: 84291,
    activeRidings: 124,
    targetRidings: 37,
    totalDonations: 2840000,
    donationGoal: 5000000,
    volunteers: 2847,
    events: 23,
  },
  ridings: [
    { name: "Toronto Centre", status: "Held", margin: "+8.2%", contacts: 12400, volunteers: 124 },
    { name: "Ottawa-Vanier", status: "Target", margin: "-2.1%", contacts: 9800, volunteers: 87 },
    { name: "Brampton East", status: "Target", margin: "-4.7%", contacts: 11200, volunteers: 103 },
    { name: "Hamilton West", status: "Held", margin: "+12.3%", contacts: 8900, volunteers: 91 },
    { name: "London North Centre", status: "Target", margin: "-1.8%", contacts: 10100, volunteers: 78 },
    { name: "Windsor-Tecumseh", status: "Held", margin: "+6.1%", contacts: 7600, volunteers: 65 },
  ],
};

export const MEDIA_DEMO = {
  election: {
    name: "Ontario Municipal Elections",
    date: "October 27, 2026",
    status: "LIVE — Polls Closed",
    reportingPct: 67,
  },
  toronto: {
    mayor: [
      { name: "David Chen", party: "Independent", votes: 187432, pct: 38.2, leading: true, change: "+2.1%" },
      { name: "Sandra Williams", party: "Independent", votes: 156891, pct: 31.9, leading: false, change: "-1.4%" },
      { name: "Marc Leblanc", party: "Independent", votes: 98234, pct: 20.0, leading: false, change: "+0.3%" },
      { name: "Others", party: "", votes: 48219, pct: 9.8, leading: false, change: "" },
    ],
  },
  approval: [
    { name: "Olivia Chow", title: "Mayor, Toronto", approval: 61, trend: "+3", party: "NDP" },
    { name: "Doug Ford", title: "Premier, Ontario", approval: 44, trend: "-2", party: "PC" },
    { name: "Justin Trudeau", title: "Prime Minister", approval: 38, trend: "-5", party: "Liberal" },
    { name: "Pierre Poilievre", title: "Leader of Opposition", approval: 47, trend: "+1", party: "Conservative" },
  ],
  flashPoll: {
    question: "Who do you think won tonight's council race in Ward 20?",
    options: [
      { label: "Alex Chen", votes: 1847, pct: 52 },
      { label: "Incumbent Jennifer Walsh", votes: 1423, pct: 40 },
      { label: "Other / Too early to say", votes: 283, pct: 8 },
    ],
    totalVotes: 3553,
    closedAt: "10:42 PM",
  },
};
