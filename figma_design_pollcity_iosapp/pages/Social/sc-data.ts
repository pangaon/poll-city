/* ─────────────────────────────────────────────────────────────────────
   Poll City Field Command — Shared Types, Theme & Seed Data
   Canada · Federal Election April 2026 · Riding 42 Parkdale–High Park
   ───────────────────────────────────────────────────────────────────── */

/* ─── THEME ──────────────────────────────────────────────────────────── */
export type TC = {
  bg: string; card: string; deep: string; input: string; overlay: string;
  border: string; borderB: string; borderC: string;
  text: string; sub: string; muted: string;
  accent: string; accentB: string; gridLine: string; tabBg: string;
};

export const DARK: TC = {
  bg: "#050A1F", card: "#0F1440", deep: "#0B0B0F", input: "#070D28", overlay: "rgba(11,11,15,0.96)",
  border: "rgba(41,121,255,0.2)", borderB: "rgba(0,229,255,0.28)", borderC: "rgba(41,121,255,0.38)",
  text: "#F5F7FF", sub: "#AAB2FF", muted: "#6B72A0",
  accent: "#00E5FF", accentB: "#2979FF", gridLine: "rgba(41,121,255,0.18)", tabBg: "rgba(15,20,64,0.75)",
};

export const LIGHT: TC = {
  bg: "#EEF2FF", card: "#FFFFFF", deep: "#E2E8FF", input: "#F8FAFF", overlay: "rgba(238,242,255,0.97)",
  border: "rgba(41,121,255,0.15)", borderB: "rgba(25,118,210,0.3)", borderC: "rgba(41,121,255,0.25)",
  text: "#0D1033", sub: "#2D3580", muted: "#7B84B8",
  accent: "#1565C0", accentB: "#1A56DB", gridLine: "rgba(41,121,255,0.07)", tabBg: "rgba(255,255,255,0.82)",
};

/* ─── PARTIES ─────────────────────────────────────────────────────────── */
export const PARTY_COLOR: Record<string, string> = {
  LIB: "#D91E2A", NDP: "#F37021", CON: "#1A4B8C",
  BQ: "#003DA5", GRN: "#3D9B35", IND: "#7B84B8", PPC: "#4B0082",
};
export const partyColor = (p: string) => PARTY_COLOR[p] ?? "#7B84B8";

/* ─── CORE TYPES ─────────────────────────────────────────────────────── */
export type FieldType = "boolean" | "choice" | "multi" | "text" | "scale" | "phone" | "email";

export type CampaignField = {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  required: boolean;
  scope: "household" | "person";
  category: "canvass" | "voter-file" | "intel";
  active: boolean;
  icon?: string;
  hint?: string;
};

export type Person = {
  id: number; name: string; firstName: string; lastName: string;
  party: string; phone: string; email: string; isRegistered: boolean; age: number;
};

export type Stop = {
  id: number; address: string; unit?: string; status: string;
  notes: string; hasOpponentSign: boolean; household: Person[];
};

export type PersonStatus = {
  contact: string | null;
  notPresent: string | null;
  fieldValues: Record<string, string | string[] | boolean | number>;
};

export type WizardStep = "door" | "household" | "questions" | "extras" | "summary";

export function getStepFlow(doorOutcome: string | null): WizardStep[] {
  if (!doorOutcome || doorOutcome === "answered") {
    return ["door", "household", "questions", "extras", "summary"];
  }
  return ["door", "extras", "summary"];
}

/* ─── DEFAULT CAMPAIGN FIELDS ─────────────────────────────────────────
   These are the campaign-defined dynamic fields.
   In production, these come from the campaign database.
   Campaign staff can add/edit/remove in the Command Center → Builder.
   All active fields surface in the canvass wizard + voter file view.
──────────────────────────────────────────────────────────────────────── */
export const DEFAULT_CAMPAIGN_FIELDS: CampaignField[] = [
  {
    id: "top_issue", label: "Top Issue at Door", type: "choice", required: false,
    scope: "household", category: "canvass", active: true, icon: "🏠",
    hint: "What issue does the household care most about?",
    options: ["Housing Affordability", "Healthcare", "Cost of Living", "Transit & Infrastructure",
              "Climate / Environment", "Public Safety", "Immigration", "Education", "Other"],
  },
  {
    id: "vote_intention", label: "Vote Intention", type: "scale", required: false,
    scope: "person", category: "canvass", active: true, icon: "🗳️",
    hint: "1 = Definitely LIB → 5 = Definitely won't vote LIB",
  },
  {
    id: "volunteer_interest", label: "Volunteer Interest", type: "boolean", required: false,
    scope: "person", category: "canvass", active: true, icon: "🙋",
    hint: "Willing to volunteer for the campaign?",
  },
  {
    id: "sign_interest", label: "Lawn Sign Interest", type: "boolean", required: false,
    scope: "household", category: "canvass", active: true, icon: "🪧",
    hint: "Would they accept a lawn sign? Auto-opens sign request if Yes.",
  },
  {
    id: "prev_voter", label: "Voted in Last Federal Election", type: "boolean", required: false,
    scope: "person", category: "voter-file", active: true, icon: "✅",
  },
  {
    id: "lang_pref", label: "Language Preference", type: "choice", required: false,
    scope: "person", category: "voter-file", active: true, icon: "🌐",
    options: ["English", "French", "Both", "Mandarin", "Cantonese", "Punjabi", "Tamil", "Spanish", "Portuguese", "Other"],
  },
  {
    id: "donation_interest", label: "Donation Interest", type: "boolean", required: false,
    scope: "person", category: "canvass", active: false, icon: "💰",
    hint: "Interested in donating to the campaign?",
  },
  {
    id: "concerns_notes", label: "Specific Concerns / Notes", type: "text", required: false,
    scope: "household", category: "intel", active: true, icon: "📝",
    hint: "Free-text notes on specific concerns raised at the door.",
  },
];

/* ─── SIGN TYPES ──────────────────────────────────────────────────────── */
export type SignType = "small-lawn" | "large-lawn" | "corner-lot" | "window" | "fence" | "balcony" | "boulevard" | "banner";

export const SIGN_TYPES = [
  { id: "small-lawn" as SignType, label: "Small Lawn",  size: '12×18"',   color: "#00C853", desc: "Standard front yard" },
  { id: "large-lawn" as SignType, label: "Large Lawn",  size: '18×24"',   color: "#2979FF", desc: "Large yard" },
  { id: "corner-lot" as SignType, label: "Corner Lot",  size: '18×24"×2', color: "#FF9F0A", desc: "Two-sided corner" },
  { id: "window"     as SignType, label: "Window",      size: '11×17"',   color: "#00E5FF", desc: "Indoor window" },
  { id: "fence"      as SignType, label: "Fence",       size: '18×24"',   color: "#9C27B0", desc: "Fence/gate attach" },
  { id: "balcony"    as SignType, label: "Balcony",     size: '18×24"',   color: "#FF3B30", desc: "Condo / apt" },
  { id: "boulevard"  as SignType, label: "Boulevard",   size: '24×36"',   color: "#FFD600", desc: "Median strip" },
  { id: "banner"     as SignType, label: "Banner",      size: "3×8′",     color: "#FF6B35", desc: "Large storefront" },
];

export const LIT_PIECES = [
  { id: "intro",      label: "Intro Mailer",           color: "#2979FF" },
  { id: "economy",    label: "Economy Door Hanger",    color: "#00C853" },
  { id: "healthcare", label: "Healthcare Door Hanger", color: "#FF9F0A" },
  { id: "gotv",       label: "GOTV Card",              color: "#FF3B30" },
  { id: "palmcard",   label: "Palm Card",              color: "#9C27B0" },
  { id: "factsheet",  label: "Policy Fact Sheet",      color: "#00E5FF" },
];

export const NOT_PRESENT_OPTS = [
  { id: "moved",    label: "Moved",      color: "#FF9F0A" },
  { id: "deceased", label: "Deceased",   color: "#FF3B30" },
  { id: "vacant",   label: "Vacant",     color: "#6B72A0" },
  { id: "wrong",    label: "Wrong Addr", color: "#FFD600" },
];

export const CONTACT_OUTCOMES = [
  { id: "support",   label: "Support",   color: "#00C853" },
  { id: "undecided", label: "Undecided", color: "#FFD600" },
  { id: "soft-no",   label: "Soft No",   color: "#FF9F0A" },
  { id: "oppose",    label: "Oppose",    color: "#FF3B30" },
];

export const DOOR_OUTCOMES = [
  { id: "answered",  label: "Answered",  color: "#00C853", desc: "Someone came to door" },
  { id: "no-answer", label: "No Answer", color: "#6B72A0", desc: "Nobody home" },
  { id: "refused",   label: "Refused",   color: "#FF3B30", desc: "Declined to engage" },
  { id: "left-note", label: "Left Note", color: "#FFD600", desc: "Lit + door hanger left" },
];

export const TURF_SIDES = [
  { id: "odd",  label: "Odd Side",   desc: "#s 1,3,5…" },
  { id: "even", label: "Even Side",  desc: "#s 2,4,6…" },
  { id: "full", label: "Full Block", desc: "Both sides" },
];

export const INITIAL_TEAM = [
  { id: "t1", initials: "ME", name: "You",         side: null as string | null, color: "#2979FF", status: "active" },
  { id: "t2", initials: "SB", name: "S. Bouchard", side: null as string | null, color: "#00C853", status: "active" },
  { id: "t3", initials: "KN", name: "K. Nguyen",   side: null as string | null, color: "#FF9F0A", status: "idle" },
  { id: "t4", initials: "AD", name: "A. Diallo",   side: null as string | null, color: "#9C27B0", status: "active" },
];

export const MISSIONS = [
  { id: "m1", type: "canvass",  name: "GOTV — Bloor St. E Sweep",         reward: "800 XP", doors: 12, priority: "Critical", routing: "Odd Side Only",  start: 0,   end: 12  },
  { id: "m2", type: "lit-drop", name: "Parkdale–High Park Lit Drop",       reward: "300 XP", doors: 45, priority: "Standard", routing: "Even Side Only", start: 12,  end: 57  },
  { id: "m3", type: "canvass",  name: "King St. West — Undecided Targets", reward: "600 XP", doors: 24, priority: "Elevated", routing: "All Addresses",  start: 57,  end: 81  },
  { id: "m4", type: "canvass",  name: "Dufferin St. — Sign Sweep",        reward: "400 XP", doors: 18, priority: "Standard", routing: "Full Block",     start: 81,  end: 99  },
  { id: "m5", type: "lit-drop", name: "Danforth Ave. South Drop",          reward: "250 XP", doors: 30, priority: "Standard", routing: "Even Side Only", start: 99,  end: 129 },
];

export const AREA_DATA = Array.from({ length: 24 }).map((_, i) => ({
  time: `${i}:00`,
  value: Math.floor(Math.sin(i / 3) * 1200 + 2800 + Math.sin(i / 1.5) * 400),
  baseline: 2200,
}));

export const RADAR_DATA = [
  { subject: "Turnout",    A: 122, fullMark: 150 },
  { subject: "Sentiment",  A: 96,  fullMark: 150 },
  { subject: "Reach",      A: 88,  fullMark: 150 },
  { subject: "Engagement", A: 103, fullMark: 150 },
  { subject: "Conversion", A: 79,  fullMark: 150 },
  { subject: "Velocity",   A: 67,  fullMark: 150 },
];

/* ─── SEED DATA — 200 HOUSEHOLDS ≈ 490 VOTERS ───────────────────────── */
function generateAllStops(): Stop[] {
  let s = 0xCAFEBABE;
  const rng = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
  const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];

  const ff = ["Marie","Sophie","Isabelle","Emma","Olivia","Priya","Aisha","Jennifer","Nadia","Sarah","Mei","Amelia","Chloé","Fatima","Rachel","Christine","Anna","Zoë","Léa","Sara","Hana","Yuki","Diane","Lin","Awa","Amara","Claire","Tanya","Wendy","Grace"];
  const fm = ["Jean","Marc","Pierre","Michael","David","Kevin","Ahmed","Raj","James","Robert","Daniel","Alexandre","Thomas","William","Nathan","Matthew","Ryan","Connor","Samuel","Jérémy","Ali","Kwame","Luca","Paolo","Omar","Tariq","Eric","Justin","Mark","Paul"];
  const ln = ["Tremblay","Gagnon","Roy","Côté","Bouchard","Smith","Brown","MacDonald","Johnson","Nguyen","Patel","Singh","Kim","Chen","Ahmed","Okafor","Diallo","Leblanc","Lavoie","Fortin","Wilson","Taylor","Martin","Anderson","Thompson","Lee","Walker","Girard","Morin","Pelletier","Bergeron","Dubois","Couture","Tran","Vo","Sharma","Das","Hassan","Amin","Mbeki","Campbell","Mitchell","Clarke","Walsh","Murphy","Davies","Evans","Johal","Dhaliwal","Biswas"];

  const streets = [
    "Bloor St E","Bloor St W","King St E","King St W","Queen St E","Queen St W",
    "Spadina Ave","Yonge St","Danforth Ave","Dundas St W","Dundas St E","College St",
    "St Clair Ave E","St Clair Ave W","Eglinton Ave E","Parliament St","Broadview Ave",
    "Pape Ave","Bathurst St","Ossington Ave","Dufferin St","Christie St","Avenue Rd",
    "Jarvis St","Gerrard St E",
  ];

  const partyW = ["LIB","LIB","LIB","LIB","NDP","NDP","NDP","CON","CON","GRN","IND","BQ","LIB","NDP","LIB"];

  const notePool = [
    "","","","","","","","Interphone required","Beware of dog","Side entrance preferred",
    "No front buzzer","Apartment lobby","Gated property","Prefers French","Corner unit",
    "Parking noted","No signage visible","Stairwell access only","Building super on site",
  ];

  const sizes = [...Array(30).fill(1), ...Array(80).fill(2), ...Array(60).fill(3), ...Array(30).fill(4)];
  for (let i = sizes.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [sizes[i], sizes[j]] = [sizes[j], sizes[i]];
  }

  let pid = 1000, addrN = Math.floor(rng() * 100 + 1), stI = 0;

  return sizes.map((size, i) => {
    if (i > 0 && i % 15 === 0) { stI++; addrN = Math.floor(rng() * 80 + 1); }
    addrN += Math.floor(rng() * 6) + 1;
    const street = streets[stI % streets.length];
    const baseLast = pick(ln);

    const household: Person[] = Array.from({ length: size }).map(() => {
      const female = rng() > 0.5;
      const first = pick(female ? ff : fm);
      const last = rng() > 0.25 ? baseLast : pick(ln);
      const areaCode = pick(["416", "647"]);
      const phone = rng() > 0.35 ? `${areaCode}-${String(Math.floor(rng() * 900 + 100))}-${String(Math.floor(rng() * 9000 + 1000))}` : "";
      const slug = `${first.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.${last.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
      const email = rng() > 0.48 ? `${slug}${Math.floor(rng() * 99)}@${pick(["gmail.com", "outlook.com", "hotmail.com", "yahoo.ca", "icloud.com"])}` : "";
      return {
        id: pid++, name: `${last}, ${first.charAt(0)}.`, firstName: first, lastName: last,
        party: pick(partyW), phone, email,
        isRegistered: rng() > 0.09, age: Math.floor(rng() * 58) + 19,
      };
    });

    return {
      id: i + 1,
      address: `${addrN} ${street}`,
      unit: size > 2 && rng() > 0.65 ? `Apt ${Math.floor(rng() * 40 + 1)}` : undefined,
      status: "pending",
      notes: rng() > 0.72 ? pick(notePool.filter(Boolean)) : "",
      hasOpponentSign: rng() > 0.89,
      household,
    };
  });
}

export const ALL_STOPS = generateAllStops();
