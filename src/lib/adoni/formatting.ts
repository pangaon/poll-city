/** Strip markdown artifacts from Adoni responses as a safety net. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // remove bold
    .replace(/\*(.*?)\*/g, "$1") // remove italic
    .replace(/^#{1,6}\s+/gm, "") // remove headers
    .replace(/^[-*•]\s+/gm, "") // remove bullet points
    .replace(/^\d+\.\s+/gm, "") // remove numbered lists
    .replace(/`([^`]+)`/g, "$1") // remove inline code
    .replace(/\n{3,}/g, "\n\n") // max 2 consecutive newlines
    .trim();
}
