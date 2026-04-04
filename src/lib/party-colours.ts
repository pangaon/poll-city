import type React from "react";

export interface PartyColour {
  primary: string;
  secondary: string;
  text: string;
}

const WHITE = "#FFFFFF";
const DEFAULT_COLOUR: PartyColour = { primary: "#1E3A8A", secondary: WHITE, text: WHITE };

const PARTY_MAP: Array<{ keywords: string[]; colour: PartyColour }> = [
  { keywords: ["liberal", "lpc"], colour: { primary: "#D71920", secondary: WHITE, text: WHITE } },
  { keywords: ["conservative", "cpc", "pc"], colour: { primary: "#1A4782", secondary: WHITE, text: WHITE } },
  { keywords: ["ndp", "new democratic"], colour: { primary: "#F37021", secondary: WHITE, text: WHITE } },
  { keywords: ["bloc", "bq"], colour: { primary: "#0088CE", secondary: WHITE, text: WHITE } },
  { keywords: ["green", "gpc"], colour: { primary: "#24A348", secondary: WHITE, text: WHITE } },
  { keywords: ["ppc", "people's party", "peoples party"], colour: { primary: "#4B306A", secondary: WHITE, text: WHITE } },
  { keywords: ["independent", "ind."], colour: { primary: "#6B7280", secondary: WHITE, text: WHITE } },
];

export function getPartyColour(partyName: string): PartyColour;
export function getPartyColour(partyName: string | null | undefined): PartyColour;
export function getPartyColour(partyName: string | null | undefined): PartyColour {
  if (typeof partyName !== "string" || !partyName.trim()) return DEFAULT_COLOUR;

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

export function partyGradientStyle(partyName: string | null | undefined): React.CSSProperties {
  const { primary } = getPartyColour(partyName);
  return {
    background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 60%, ${primary}99 100%)`,
  };
}
