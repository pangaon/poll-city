import prisma from "@/lib/db/prisma";

interface DebugNoteLike {
  type: string;
  resolved: boolean;
  pagePath: string;
  url: string;
  elementSelector: string | null;
  elementText: string | null;
  priority: string;
  text: string;
  screenshotUrl: string | null;
  videoUrl: string | null;
}

function formatNote(note: DebugNoteLike, index: number): string {
  return [
    `### Issue ${index + 1}: ${note.elementText || note.pagePath}`,
    `- **Page:** ${note.pagePath}`,
    `- **URL:** \`${note.url}\``,
    note.elementSelector ? `- **Element:** \`${note.elementSelector}\`` : "",
    note.elementText ? `- **Visible text:** \"${note.elementText}\"` : "",
    `- **Priority:** ${note.priority}`,
    `- **Note:** ${note.text}`,
    note.screenshotUrl ? `- **Screenshot:** ${note.screenshotUrl}` : "",
    note.videoUrl ? `- **Video:** ${note.videoUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateDebugReport(sessionId: string): Promise<string> {
  const session = await prisma.debugSession.findUnique({
    where: { id: sessionId },
    include: {
      notes: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!session) throw new Error("Session not found");

  const notes = session.notes as DebugNoteLike[];

  const byType = {
    broken: notes.filter((note: DebugNoteLike) => note.type === "broken" && !note.resolved),
    missing: notes.filter((note: DebugNoteLike) => note.type === "missing" && !note.resolved),
    wrong: notes.filter((note: DebugNoteLike) => note.type === "wrong" && !note.resolved),
    adjust: notes.filter((note: DebugNoteLike) => note.type === "adjust" && !note.resolved),
    idea: notes.filter((note: DebugNoteLike) => note.type === "idea" && !note.resolved),
    good: notes.filter((note: DebugNoteLike) => note.type === "good"),
  };

  return `# POLL CITY DEBUG REPORT
Session: ${session.title || "Untitled"}
Date: ${new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })}
Total unresolved: ${notes.filter((note: DebugNoteLike) => !note.resolved).length}

---
${
  byType.broken.length > 0
    ? `\n## BROKEN - Fix First (${byType.broken.length})\n${byType.broken.map((note: DebugNoteLike, i: number) => formatNote(note, i)).join("\n\n")}`
    : ""
}
${
  byType.missing.length > 0
    ? `\n## MISSING - Not Built Yet (${byType.missing.length})\n${byType.missing.map((note: DebugNoteLike, i: number) => formatNote(note, i)).join("\n\n")}`
    : ""
}
${
  byType.wrong.length > 0
    ? `\n## WRONG - Incorrect Behaviour (${byType.wrong.length})\n${byType.wrong.map((note: DebugNoteLike, i: number) => formatNote(note, i)).join("\n\n")}`
    : ""
}
${
  byType.adjust.length > 0
    ? `\n## ADJUST - Design Changes (${byType.adjust.length})\n${byType.adjust.map((note: DebugNoteLike, i: number) => formatNote(note, i)).join("\n\n")}`
    : ""
}
${
  byType.idea.length > 0
    ? `\n## IDEAS - For Later (${byType.idea.length})\n${byType.idea.map((note: DebugNoteLike, i: number) => formatNote(note, i)).join("\n\n")}`
    : ""
}
${
  byType.good.length > 0
    ? `\n## WORKING WELL (${byType.good.length})\n${byType.good.map((note: DebugNoteLike) => `- ${note.pagePath}: ${note.text}`).join("\n")}`
    : ""
}

---

## INSTRUCTIONS FOR CLAUDE CODE AND GPT-CODEX

Fix in this order:
1. All BROKEN items - site is broken without these
2. All MISSING items - promised features not yet built
3. All WRONG items - things that exist but misbehave
4. All ADJUST items - visual and copy changes
5. IDEAS - only after everything above is done

After fixing each issue mark it resolved:
PATCH /api/debug/notes/[noteId] with { resolved: true }

Report generated: ${new Date().toISOString()}`;
}
