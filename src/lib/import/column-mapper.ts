/**
 * Poll City — AI Column Mapper
 *
 * Takes raw column headers from any imported file and maps them to
 * Poll City's contact fields automatically.
 *
 * Two-stage approach:
 * 1. Rule-based matching (fast, free, catches 80% of cases)
 * 2. AI fallback for ambiguous columns (catches the rest)
 *
 * The goal: "FNAME" → firstName, "TEL_NO" → phone, "ED_NAME" → riding
 * without the user having to figure it out themselves.
 */

import { aiAssist } from "@/lib/ai";

// ─── Target Fields ─────────────────────────────────────────────────────────────

export interface TargetField {
  key: string;
  label: string;
  category: "name" | "address" | "contact" | "electoral" | "campaign" | "other";
  examples: string[]; // example source column names this maps to
}

export const TARGET_FIELDS: TargetField[] = [
  // Name
  { key: "firstName", label: "First Name", category: "name", examples: ["first_name", "firstname", "fname", "first", "given_name", "givenname", "prenom", "f_name"] },
  { key: "lastName", label: "Last Name", category: "name", examples: ["last_name", "lastname", "lname", "last", "surname", "family_name", "nom", "l_name"] },
  { key: "middleName", label: "Middle Name", category: "name", examples: ["middle_name", "middlename", "mname", "middle", "middle_initial", "mi"] },
  { key: "nameTitle", label: "Title (Mr/Ms/Dr)", category: "name", examples: ["title", "salutation", "prefix", "honorific", "name_title"] },
  { key: "nameSuffix", label: "Suffix (Jr/Sr)", category: "name", examples: ["suffix", "name_suffix", "jr", "sr"] },
  { key: "gender", label: "Gender", category: "name", examples: ["gender", "sex", "gen"] },

  // Address
  { key: "streetNumber", label: "Street Number", category: "address", examples: ["street_number", "streetnumber", "st_no", "stno", "house_no", "houseno", "civic_no", "number", "str_num"] },
  { key: "streetName", label: "Street Name", category: "address", examples: ["street_name", "streetname", "street", "st_name", "stname", "road", "rue", "via"] },
  { key: "streetType", label: "Street Type", category: "address", examples: ["street_type", "streettype", "st_type", "sttype", "suffix", "street_suffix"] },
  { key: "streetDirection", label: "Street Direction", category: "address", examples: ["direction", "dir", "street_dir", "stdir"] },
  { key: "unitApt", label: "Unit/Apt", category: "address", examples: ["unit", "apt", "apartment", "suite", "unit_no", "apt_no", "unit_num"] },
  { key: "address1", label: "Full Address", category: "address", examples: ["address", "address1", "full_address", "civic_address", "mailing_address", "addr", "add1"] },
  { key: "city", label: "City", category: "address", examples: ["city", "municipality", "town", "ville", "mun", "munic"] },
  { key: "province", label: "Province/State", category: "address", examples: ["province", "prov", "state", "st", "province_code", "prov_code"] },
  { key: "postalCode", label: "Postal Code", category: "address", examples: ["postal_code", "postalcode", "postal", "zip", "zip_code", "zipcode", "pc", "pcode"] },

  // Contact
  { key: "phone", label: "Phone", category: "contact", examples: ["phone", "phone_no", "telephone", "tel", "tel_no", "home_phone", "home_tel", "ph", "phone1"] },
  { key: "phoneAreaCode", label: "Phone Area Code", category: "contact", examples: ["area_code", "areacode", "phone_area", "ac"] },
  { key: "cellAreaCode", label: "Cell Area Code", category: "contact", examples: ["cell_area", "cell_ac", "mobile_area"] },
  { key: "phone2", label: "Phone 2", category: "contact", examples: ["phone2", "phone_2", "alt_phone", "other_phone", "work_phone"] },
  { key: "businessPhone", label: "Business Phone", category: "contact", examples: ["business_phone", "bus_phone", "work_tel", "office_phone", "bphone"] },
  { key: "email", label: "Email", category: "contact", examples: ["email", "email_address", "e_mail", "emailaddress", "mail", "courriel"] },
  { key: "email2", label: "Email 2", category: "contact", examples: ["email2", "email_2", "alt_email", "secondary_email"] },

  // Electoral
  { key: "riding", label: "Riding/District", category: "electoral", examples: ["riding", "riding_name", "electoral_district", "ed_name", "constituency", "district", "fed_riding", "ridings"] },
  { key: "ward", label: "Ward", category: "electoral", examples: ["ward", "ward_name", "ward_no", "ward_number", "ward_num"] },
  { key: "federalDistrict", label: "Federal District", category: "electoral", examples: ["fed_district", "federal_district", "federal_riding", "fed_ed", "federal_ed"] },
  { key: "federalPoll", label: "Federal Poll #", category: "electoral", examples: ["fed_poll", "federal_poll", "poll_no", "poll_number", "poll_num", "pno"] },
  { key: "provincialDistrict", label: "Provincial District", category: "electoral", examples: ["prov_district", "provincial_district", "prov_riding", "prov_ed"] },
  { key: "provincialPoll", label: "Provincial Poll #", category: "electoral", examples: ["prov_poll", "provincial_poll"] },
  { key: "municipalDistrict", label: "Municipal District", category: "electoral", examples: ["mun_district", "municipal_district", "local_district"] },
  { key: "municipalPoll", label: "Municipal Poll #", category: "electoral", examples: ["mun_poll", "municipal_poll", "local_poll"] },
  { key: "votingLocation", label: "Voting Location", category: "electoral", examples: ["voting_location", "poll_location", "polling_station", "station"] },
  { key: "censusDivision", label: "Census Division", category: "electoral", examples: ["census_division", "census_div", "cd"] },
  { key: "pollDistrict", label: "Poll District", category: "electoral", examples: ["poll_district", "poll_div", "pd", "poll_subdivision"] },

  // Campaign data
  { key: "supportLevel", label: "Support Level", category: "campaign", examples: ["support", "support_level", "status", "voter_status", "support_status"] },
  { key: "notes", label: "Notes", category: "campaign", examples: ["notes", "note", "comments", "comment", "remarks", "memo"] },
  { key: "source", label: "Source", category: "campaign", examples: ["source", "data_source", "list_source", "origin"] },
  { key: "externalId", label: "External ID", category: "campaign", examples: ["id", "voter_id", "external_id", "record_id", "uid", "unique_id", "elector_id"] },
  { key: "preferredLanguage", label: "Language", category: "campaign", examples: ["language", "lang", "preferred_language", "langue"] },
  { key: "gotvStatus", label: "GOTV Status", category: "campaign", examples: ["gotv", "gotv_status", "voted", "vote_status"] },
  { key: "firstChoice", label: "First Choice", category: "campaign", examples: ["first_choice", "firstchoice", "choice1", "candidate_1", "preferred_candidate"] },
  { key: "secondChoice", label: "Second Choice", category: "campaign", examples: ["second_choice", "secondchoice", "choice2", "candidate_2"] },
];

// ─── Column Mapping Result ────────────────────────────────────────────────────

export interface ColumnMapping {
  sourceColumn: string;        // original column name from file
  targetField: string | null;  // target field key, null = skip/ignore
  confidence: number;          // 0-100
  method: "exact" | "fuzzy" | "ai" | "manual";
  alternatives: string[];      // other possible target fields
}

export type MappingResult = Record<string, ColumnMapping>;

// ─── Main Mapper ──────────────────────────────────────────────────────────────

export async function mapColumns(
  sourceColumns: string[],
  sampleRows: Record<string, string>[],
  useAI: boolean = true
): Promise<MappingResult> {
  const result: MappingResult = {};

  // Stage 1: Rule-based matching
  const unmapped: string[] = [];

  for (const col of sourceColumns) {
    const match = ruleBasedMatch(col, sampleRows);
    if (match) {
      result[col] = match;
    } else {
      unmapped.push(col);
      result[col] = { sourceColumn: col, targetField: null, confidence: 0, method: "fuzzy", alternatives: [] };
    }
  }

  // Stage 2: AI for unmapped columns
  if (useAI && unmapped.length > 0) {
    try {
      const aiMappings = await aiMapColumns(unmapped, sampleRows);
      for (const [col, mapping] of Object.entries(aiMappings)) {
        if (mapping.confidence > 40) {
          result[col] = mapping;
        }
      }
    } catch (e) {
      console.warn("AI column mapping unavailable, using rule-based only:", e);
    }
  }

  return result;
}

// ─── Rule-based Matching ──────────────────────────────────────────────────────

function ruleBasedMatch(
  sourceCol: string,
  sampleRows: Record<string, string>[]
): ColumnMapping | null {
  const normalized = sourceCol.toLowerCase().replace(/[\s\-\.]/g, "_").replace(/[^a-z0-9_]/g, "");

  // Exact match against known examples
  for (const target of TARGET_FIELDS) {
    if (target.examples.includes(normalized)) {
      return {
        sourceColumn: sourceCol,
        targetField: target.key,
        confidence: 98,
        method: "exact",
        alternatives: [],
      };
    }
  }

  // Fuzzy match — check if normalized column contains a known pattern
  const fuzzyMatches: { key: string; score: number }[] = [];

  for (const target of TARGET_FIELDS) {
    let score = 0;

    // Check if column name contains any example substring
    for (const example of target.examples) {
      if (normalized.includes(example) || example.includes(normalized)) {
        score = Math.max(score, 75);
      }
    }

    // Check label words
    const labelWords = target.label.toLowerCase().split(" ");
    for (const word of labelWords) {
      if (word.length > 3 && normalized.includes(word)) {
        score = Math.max(score, 65);
      }
    }

    if (score > 0) fuzzyMatches.push({ key: target.key, score });
  }

  fuzzyMatches.sort((a, b) => b.score - a.score);

  if (fuzzyMatches.length > 0 && fuzzyMatches[0].score >= 65) {
    return {
      sourceColumn: sourceCol,
      targetField: fuzzyMatches[0].key,
      confidence: fuzzyMatches[0].score,
      method: "fuzzy",
      alternatives: fuzzyMatches.slice(1, 3).map(m => m.key),
    };
  }

  // Data-based inference — look at sample values
  if (sampleRows.length > 0) {
    const sampleValues = sampleRows.map(r => r[sourceCol] ?? "").filter(Boolean);
    const dataMatch = inferFromData(sampleValues);
    if (dataMatch) {
      return {
        sourceColumn: sourceCol,
        targetField: dataMatch,
        confidence: 60,
        method: "fuzzy",
        alternatives: [],
      };
    }
  }

  return null;
}

function inferFromData(samples: string[]): string | null {
  if (samples.length === 0) return null;

  const sample = samples[0];

  // Phone number pattern
  if (/^[\d\s\-\(\)\+]{7,15}$/.test(sample)) return "phone";

  // Email pattern
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sample)) return "email";

  // Postal code pattern (Canadian)
  if (/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(sample)) return "postalCode";

  // Province code
  if (/^(ON|BC|AB|QC|SK|MB|NS|NB|NL|PE|YT|NT|NU)$/i.test(sample)) return "province";

  // Looks like a riding name (long text with proper case)
  if (sample.length > 10 && /^[A-Z][a-z]/.test(sample) && !sample.includes("@")) return "riding";

  return null;
}

// ─── AI Column Mapping ────────────────────────────────────────────────────────

async function aiMapColumns(
  columns: string[],
  sampleRows: Record<string, string>[]
): Promise<MappingResult> {
  const targetFieldList = TARGET_FIELDS.map(f => `${f.key} (${f.label})`).join(", ");

  const sampleData = columns.map(col => {
    const samples = sampleRows.slice(0, 3).map(r => r[col] ?? "").filter(Boolean).join(", ");
    return `"${col}": [${samples}]`;
  }).join("\n");

  const prompt = `You are mapping columns from a voter/contact data file to a campaign CRM system.

Available target fields: ${targetFieldList}

Unmapped source columns and their sample data:
${sampleData}

For each source column, determine the best matching target field.
Respond ONLY with valid JSON in this exact format:
{
  "columnName": {"field": "targetFieldKey", "confidence": 85},
  "anotherColumn": {"field": "firstName", "confidence": 92}
}

If a column should be ignored (like row numbers, internal IDs with no campaign value), use "field": null.
Confidence should be 0-100.`;

  const result = await aiAssist.complete({
    messages: [{ role: "user", content: prompt }],
    systemPrompt: "You are a data mapping expert for political campaign software. Respond only with the JSON mapping object, no other text.",
    maxTokens: 1000,
  });

  // Parse AI response
  try {
    const text = result.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);
    const mappings: MappingResult = {};

    for (const [col, data] of Object.entries(parsed as Record<string, { field: string | null; confidence: number }>)) {
      mappings[col] = {
        sourceColumn: col,
        targetField: data.field,
        confidence: data.confidence ?? 70,
        method: "ai",
        alternatives: [],
      };
    }

    return mappings;
  } catch {
    return {};
  }
}

// ─── Confidence helpers ───────────────────────────────────────────────────────

export function getMappingQuality(mappings: MappingResult): {
  mapped: number;
  unmapped: number;
  highConfidence: number;
  needsReview: number;
  ignored: number;
} {
  const values = Object.values(mappings);
  return {
    mapped: values.filter(m => m.targetField !== null).length,
    unmapped: values.filter(m => m.targetField === null).length,
    highConfidence: values.filter(m => m.targetField !== null && m.confidence >= 85).length,
    needsReview: values.filter(m => m.targetField !== null && m.confidence < 85).length,
    ignored: values.filter(m => m.targetField === null).length,
  };
}

export function getTargetFieldLabel(key: string): string {
  return TARGET_FIELDS.find(f => f.key === key)?.label ?? key;
}
