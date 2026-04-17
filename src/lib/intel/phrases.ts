/**
 * Candidate announcement phrase families and entity extraction patterns.
 * Configurable here — not buried in parser code.
 */

export type PhraseStrength = "strong" | "moderate" | "weak";

export interface PhraseFamily {
  strength: PhraseStrength;
  patterns: RegExp[];
}

// Ordered strongest → weakest so first match wins
export const ANNOUNCEMENT_PHRASE_FAMILIES: PhraseFamily[] = [
  {
    strength: "strong",
    patterns: [
      /certified\s+candidate/i,
      /certification\s+of\s+candidacy/i,
      /filed\s+nomination\s+papers?/i,
      /filing\s+nomination\s+papers?/i,
      /won\s+(the\s+)?nomination/i,
      /wins\s+(the\s+)?nomination/i,
      /officially\s+(declared|running|entered)/i,
      /registered\s+as\s+(a\s+)?candidate/i,
      /nomination\s+accepted/i,
    ],
  },
  {
    strength: "moderate",
    patterns: [
      /announced?\s+((?:(?:his|her|their)\s+)?candidacy|(?:he|she|they)\s+is\s+running)/i,
      /announce[sd]?\s+(?:a\s+)?(?:run|bid|campaign)/i,
      /is\s+running\s+for\b/i,
      /will\s+run\s+for\b/i,
      /plans?\s+to\s+run\s+for\b/i,
      /entered?\s+(?:the\s+)?race/i,
      /entering?\s+(?:the\s+)?race/i,
      /launched?\s+(?:(?:his|her|their)\s+)?campaign/i,
      /launching?\s+(?:(?:his|her|their)\s+)?campaign/i,
      /campaign\s+kickoff/i,
      /kick(?:ing|ed)?\s+off\s+(?:(?:his|her|their)\s+)?campaign/i,
      /seeking\s+(?:the\s+)?nomination/i,
      /seeks?\s+(?:the\s+)?nomination/i,
      /threw?\s+(?:(?:his|her|their)\s+)?hat\s+(?:in(?:to)?|in)\s+(?:the\s+)?ring/i,
      /put(?:ting|s)?\s+(?:(?:his|her|their|a)\s+)?name\s+forward/i,
      /declared\s+(?:(?:his|her|their)\s+)?candidacy/i,
      /running\s+(?:in|against|for)\b/i,
    ],
  },
  {
    strength: "weak",
    patterns: [
      /considering\s+(?:a\s+)?run/i,
      /may\s+seek\b/i,
      /expected\s+to\s+(?:run|seek|announce)/i,
      /could\s+(?:run|seek|announce)/i,
      /(?:possible|potential|likely)\s+candidate/i,
      /mulling\s+(?:a\s+)?(?:run|bid)/i,
      /exploring\s+(?:a\s+)?(?:run|bid|candidacy)/i,
    ],
  },
];

/** Titles/offices that indicate election context */
export const OFFICE_PATTERNS: RegExp[] = [
  /\b(ward\s+\d+)\s+councillor/i,
  /\bcity\s+councillor/i,
  /\bmunicipal\s+councillor/i,
  /\b(regional\s+)?councillor/i,
  /\bmayor\b/i,
  /\bdeputy\s+mayor\b/i,
  /\bmp\b/i,            // Member of Parliament
  /\bmember\s+of\s+parliament/i,
  /\bmpp\b/i,           // Member of Provincial Parliament
  /\bmember\s+of\s+provincial\s+parliament/i,
  /\bschool\s+board\s+trustee/i,
  /\btrustee\b/i,
  /\balderman\b/i,
  /\bmunicipal\s+(?:council|election)/i,
];

/** Known Canadian municipalities for jurisdiction extraction */
export const KNOWN_MUNICIPALITIES = [
  "Toronto", "Brampton", "Mississauga", "Vaughan", "Markham", "Richmond Hill",
  "Oakville", "Burlington", "Hamilton", "Ottawa", "London", "Windsor",
  "Kitchener", "Waterloo", "Cambridge", "Guelph", "Barrie", "Sudbury",
  "Thunder Bay", "Oshawa", "Ajax", "Pickering", "Whitby", "Aurora",
  "Newmarket", "Georgina", "Stouffville",
];

/** Try to detect a phrase match in text. Returns first match found (strongest first). */
export function detectAnnouncementPhrase(text: string): {
  strength: PhraseStrength;
  matched: string;
} | null {
  for (const family of ANNOUNCEMENT_PHRASE_FAMILIES) {
    for (const pattern of family.patterns) {
      const match = pattern.exec(text);
      if (match) {
        return { strength: family.strength, matched: match[0] };
      }
    }
  }
  return null;
}

/** Try to extract an office mention from text */
export function detectOffice(text: string): string | null {
  for (const pattern of OFFICE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return match[0].trim();
  }
  return null;
}

/** Try to extract a known municipality from text */
export function detectJurisdiction(text: string): string | null {
  for (const muni of KNOWN_MUNICIPALITIES) {
    if (new RegExp(`\\b${muni}\\b`, "i").test(text)) return muni;
  }
  return null;
}

/** Normalize office string to a canonical key */
export function normalizeOffice(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (/councillor|alderman|council\s+member/.test(lower)) return "councillor";
  if (/mayor/.test(lower)) return "mayor";
  if (/\bmp\b|member\s+of\s+parliament/.test(lower)) return "mp";
  if (/\bmpp\b|member\s+of\s+provincial/.test(lower)) return "mpp";
  if (/trustee/.test(lower)) return "trustee";
  return lower;
}
