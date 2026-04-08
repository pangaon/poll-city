// Language detection for Adoni — lightweight, no external dependency.
// Detects the user's language from a message sample and returns a human-readable
// language name that can be injected into the system prompt.
//
// Canada-focused: French, Punjabi, Hindi, Tagalog, Arabic, Somali, Tamil,
// Mandarin, Cantonese, Korean, Spanish, Portuguese, Vietnamese, Urdu.
// Falls back to null (English assumed, no override needed).

type LangRule = {
  name: string;
  // Unicode ranges or distinctive word patterns unique to this language
  pattern: RegExp;
};

const LANG_RULES: LangRule[] = [
  // Script-based detection (unambiguous)
  { name: "Arabic",      pattern: /[\u0600-\u06FF]/ },
  { name: "Hindi",       pattern: /[\u0900-\u097F]/ },
  { name: "Punjabi (Gurmukhi)", pattern: /[\u0A00-\u0A7F]/ },
  { name: "Tamil",       pattern: /[\u0B80-\u0BFF]/ },
  { name: "Bengali",     pattern: /[\u0980-\u09FF]/ },
  { name: "Urdu",        pattern: /[\u0600-\u06FF\u0750-\u077F]/ },
  { name: "Korean",      pattern: /[\uAC00-\uD7AF\u1100-\u11FF]/ },
  { name: "Chinese",     pattern: /[\u4E00-\u9FFF\u3400-\u4DBF]/ },
  { name: "Japanese",    pattern: /[\u3040-\u309F\u30A0-\u30FF]/ },
  { name: "Vietnamese",  pattern: /[\u1E00-\u1EFF]/ },

  // Latin-script languages — distinguished by common function words
  {
    name: "French",
    pattern: /\b(je|tu|nous|vous|ils|elles|le|la|les|un|une|des|est|sont|pour|avec|dans|que|qui|comment|bonjour|merci|oui|non|aussi|mais|ou|et|donc|or|ni|car)\b/i,
  },
  {
    name: "Spanish",
    pattern: /\b(yo|tú|nosotros|ellos|el|la|los|las|un|una|unos|unas|es|son|para|con|en|que|quien|como|hola|gracias|sí|no|también|pero|y|muy|más)\b/i,
  },
  {
    name: "Portuguese",
    pattern: /\b(eu|tu|nós|eles|o|a|os|as|um|uma|uns|umas|é|são|para|com|em|que|quem|como|olá|obrigado|obrigada|sim|não|também|mas|e|muito|mais)\b/i,
  },
  {
    name: "Somali",
    pattern: /\b(waxaan|waxaad|isaga|iyada|annagu|maxaa|sidee|yaa|maanta|mahadsanid|haa|maya)\b/i,
  },
  {
    name: "Tagalog",
    pattern: /\b(ako|ikaw|siya|kami|tayo|kayo|sila|ang|ng|sa|na|at|ay|hindi|oo|po|naman|talaga|magandang|salamat|paano|sino|ano)\b/i,
  },
];

/**
 * Detects the most likely non-English language in the given text.
 * Returns null if English or undetectable.
 */
export function detectUserLanguage(text: string): string | null {
  if (!text || text.length < 3) return null;
  const sample = text.slice(0, 300);
  for (const rule of LANG_RULES) {
    if (rule.pattern.test(sample)) return rule.name;
  }
  return null;
}
