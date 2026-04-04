/**
 * Canadian Political Party Colour System — Poll City
 *
 * Provides party brand colours for every major Canadian political party.
 * Case-insensitive, substring-fuzzy matching — never throws, always returns a valid colour.
 */

export interface PartyColour {
  primary: string;
  secondary: string;
  text: string;
}

const DEFAULT_COLOUR: PartyColour = { primary: "#1E3A8A", secondary: "#FFFFFF", text: "#FFFFFF" };

/** Complete party colour map — keyed by lowercase keywords */
const PARTY_MAP: { keywords: string[]; colour: PartyColour }[] = [
  // Liberal
  {
    keywords: ["liberal party of canada", "liberal party", "lpc", "ontario liberal", "bc liberal", "liberal"],
    colour: { primary: "#D71920", secondary: "#FFFFFF", text: "#FFFFFF" },
  },
  // Conservative
  {
    keywords: [
      "conservative party of canada", "conservative party", "cpc",
      "ontario progressive conservative", "ontario pc", "pc party", "bc conservative",
      "conservative",
    ],
    colour: { primary: "#1A4782", secondary: "#FFFFFF", text: "#FFFFFF" },
  },
  // NDP
  {
    keywords: [
      "new democratic party", "ndp", "ontario ndp", "bc ndp",
      "new democrat",
    ],
    colour: { primary: "#F37021", secondary: "#FFFFFF", text: "#FFFFFF" },
  },
  // Bloc Québécois
  {
    keywords: ["bloc québécois", "bloc quebecois", "bloc québecois", "bloc quebecois", "bq", "bloc"],
    colour: { primary: "#0088CE", secondary: "#FFFFFF", text: "#FFFFFF" },
  },
  // Green Party
  {
    keywords: [
      "green party of canada", "gpc", "ontario green", "bc green",
      "green party", "green",
    ],
    colour: { primary: "#24A348", secondary: "#FFFFFF", text: "#FFFFFF" },
  },
  // People's Party of Canada
  {
    keywords: ["people's party of canada", "peoples party of canada", "ppc", "people's party", "peoples party"],
    colour: { primary: "#4B306A", secondary: "#FFFFFF", text: "#FFFFFF" },
  },
  // Coalition Avenir Québec
  {
    keywords: ["coalition avenir québec", "coalition avenir quebec", "caq"],
    colour: { primary: "#1B4F9B", secondary: "#FFFFFF", text: "#FFFFFF" },
  },
  // Parti Québécois
  {
    keywords: ["parti québécois", "parti quebecois", "pq"],
    colour: { primary: "#009FE3", secondary: "#FFFFFF", text: "#FFFFFF" },
  },
  // Independent
  {
    keywords: ["independent", "ind."],
    colour: { primary: "#6B7280", secondary: "#FFFFFF", text: "#FFFFFF" },
  },
  // Non-Partisan / Municipal
  {
    keywords: ["non-partisan", "nonpartisan", "no affiliation", "none", "n/a", "unaffiliated", "municipal"],
    colour: { primary: "#374151", secondary: "#FFFFFF", text: "#FFFFFF" },
  },
];

/**
 * Returns brand colours for a Canadian political party.
 * Case-insensitive substring matching — safe default returned if no match.
 * Never throws.
 */
export function getPartyColour(partyName: string | null | undefined): PartyColour {
  if (!partyName) return DEFAULT_COLOUR;

  const lower = partyName.toLowerCase().trim();

  for (const entry of PARTY_MAP) {
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword) || keyword.includes(lower)) {
        return entry.colour;
      }
    }
  }

  return DEFAULT_COLOUR;
}

/**
 * Returns a Tailwind-compatible inline style object for party hero gradients.
 */
export function partyGradientStyle(partyName: string | null | undefined): React.CSSProperties {
  const { primary } = getPartyColour(partyName);
  return {
    background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 60%, ${primary}99 100%)`,
  };
}

import type React from "react";
