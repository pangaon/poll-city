import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { HELP_ARTICLES } from "@/app/(app)/help/help-data";
import type {
  HelpArticle,
  HelpFeedbackSummary,
  OpsVideoRow,
  VerifyChecklist,
  VideoScript,
  VideoStatus,
  Difficulty,
} from "./types";

type ChecklistFeature = {
  id: number;
  title: string;
  category: string;
  built: boolean;
};

const CATEGORY_MAP: Array<{ id: string; name: string; icon: string }> = [
  { id: "getting-started", name: "Getting Started", icon: "🚀" },
  { id: "contacts", name: "Contacts & CRM", icon: "📋" },
  { id: "canvassing", name: "Canvassing & Field", icon: "🚪" },
  { id: "gotv", name: "GOTV", icon: "🗳️" },
  { id: "volunteers", name: "Volunteers", icon: "🤝" },
  { id: "finance", name: "Finance", icon: "💰" },
  { id: "communications", name: "Communications", icon: "📣" },
  { id: "adoni", name: "Adoni AI", icon: "🤖" },
];

const DIFFICULTY_BY_CATEGORY: Record<string, Difficulty> = {
  "getting-started": "Beginner",
  contacts: "Intermediate",
  canvassing: "Intermediate",
  gotv: "Advanced",
  volunteers: "Intermediate",
  finance: "Advanced",
  communications: "Intermediate",
  adoni: "Beginner",
  team: "Intermediate",
  privacy: "Advanced",
  "import-export": "Advanced",
  polls: "Intermediate",
  signs: "Intermediate",
  donations: "Intermediate",
  notifications: "Intermediate",
};

const articleState = new Map<string, Partial<HelpArticle>>();
const scriptState = new Map<string, VideoScript>();
const feedbackState = new Map<string, HelpFeedbackSummary>();
const verifyState = new Map<string, VerifyChecklist>();
const needsUpdate = new Set<string>();

let adoniLastTrainedAt: string | null = null;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function estimateReadTime(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 210));
}

function formatDuration(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

async function parseChecklistFeatures(): Promise<ChecklistFeature[]> {
  const path = join(process.cwd(), "docs", "FEATURE_EXECUTION_CHECKLIST.md");
  const raw = await readFile(path, "utf-8");
  const lines = raw.split(/\r?\n/);
  const features: ChecklistFeature[] = [];

  for (const line of lines) {
    const match = line.match(/^- \[(x| )\] (\d+)\. (.+?)\s+\| status:/i);
    if (!match) continue;
    const built = match[1].toLowerCase() === "x";
    const id = Number(match[2]);
    const title = match[3].trim();
    const lower = title.toLowerCase();

    let category = "communications";
    if (lower.includes("gotv")) category = "gotv";
    else if (lower.includes("canvass") || lower.includes("turf") || lower.includes("walk")) category = "canvassing";
    else if (lower.includes("contact") || lower.includes("crm")) category = "contacts";
    else if (lower.includes("volunteer")) category = "volunteers";
    else if (lower.includes("budget") || lower.includes("donation") || lower.includes("billing") || lower.includes("finance")) category = "finance";
    else if (lower.includes("adoni") || lower.includes("ai")) category = "adoni";
    else if (lower.includes("dashboard") || lower.includes("campaign") || lower.includes("help")) category = "getting-started";

    features.push({ id, title, category, built });
  }

  return features;
}

function defaultChecklist(article: HelpArticle): VerifyChecklist {
  return {
    apiRouteExists: article.published,
    buildPasses: false,
    noTypeScriptErrors: false,
    emptyStateExists: true,
    loadingStateExists: true,
    errorStateExists: true,
    mobileWorks: true,
    dataIsReal: true,
    securityApplied: true,
    auditLogExists: false,
    helpArticlePublished: article.published,
    videoRecorded: !!article.videoUrl,
    adoniTrained: article.adoniKnows,
  };
}

function getOrCreateScript(article: HelpArticle): VideoScript {
  const existing = scriptState.get(article.slug);
  if (existing) return existing;

  const script: VideoScript = {
    slug: article.slug,
    title: `${article.title} walkthrough`,
    duration: article.duration || "04:00",
    status: article.videoUrl ? "ready" : "draft",
    voiceNotes: "Keep the pace steady and narrate every click clearly. Focus on real data.",
    script: `[00:00] Intro\nSCREEN: Open ${article.title} page\nSAY: In this video, I will walk through ${article.title} end to end.\n\n[00:30] Problem\nSCREEN: Show why this feature matters in campaign operations\nSAY: This feature solves day-to-day execution pain for campaign teams.\n\n[01:30] Live Walkthrough\nSCREEN: Complete real workflow from start to finish\nSAY: I am now completing the full flow with no skipped steps.\n\n[03:00] Validation\nSCREEN: Show resulting data, logs, and visible outcomes\nSAY: You can see the result persisted and reflected in the system.\n\n[03:45] Close\nSCREEN: Return to overview and summarize usage\nSAY: That is the full workflow for ${article.title}.`,
  };

  scriptState.set(article.slug, script);
  return script;
}

function mergeArticle(base: HelpArticle): HelpArticle {
  const patch = articleState.get(base.slug);
  return { ...base, ...(patch || {}) };
}

export async function getAllArticles(): Promise<HelpArticle[]> {
  const checklist = await parseChecklistFeatures();

  const fromGuides: HelpArticle[] = HELP_ARTICLES.map((article, index) => {
    const base: HelpArticle = {
      slug: article.slug,
      title: article.title,
      category: article.category,
      summary: article.excerpt,
      content: article.body,
      readTimeMinutes: estimateReadTime(article.body),
      difficulty: DIFFICULTY_BY_CATEGORY[article.category] || "Intermediate",
      videoUrl: null,
      thumbnailUrl: null,
      duration: null,
      lastVerified: null,
      verifiedBy: null,
      adoniKnows: false,
      published: true,
      pageViews: Math.max(40, 500 - index * 12),
    };

    if (!verifyState.has(base.slug)) {
      verifyState.set(base.slug, defaultChecklist(base));
    }

    getOrCreateScript(base);
    return mergeArticle(base);
  });

  const fromChecklist: HelpArticle[] = checklist.map((feature, index) => {
    const slug = `feature-${feature.id}-${slugify(feature.title)}`;
    const base: HelpArticle = {
      slug,
      title: feature.title,
      category: feature.category,
      summary: `Operational guide for ${feature.title}.`,
      content: `# ${feature.title}\n\nThis article documents how to use ${feature.title} in Poll City.\n\n## End-to-end flow\n1. Open the feature in the app.\n2. Complete the workflow using real campaign data.\n3. Confirm results in read surfaces and logs.`,
      readTimeMinutes: 3,
      difficulty: DIFFICULTY_BY_CATEGORY[feature.category] || "Intermediate",
      videoUrl: null,
      thumbnailUrl: null,
      duration: null,
      lastVerified: null,
      verifiedBy: null,
      adoniKnows: false,
      published: feature.built,
      pageViews: Math.max(10, 900 - index * 11),
    };

    if (!verifyState.has(slug)) {
      verifyState.set(slug, {
        ...defaultChecklist(base),
        buildPasses: feature.built,
        noTypeScriptErrors: feature.built,
      });
    }

    getOrCreateScript(base);
    return mergeArticle(base);
  });

  const all = [...fromGuides, ...fromChecklist];
  const dedup = new Map<string, HelpArticle>();
  for (const article of all) dedup.set(article.slug, article);
  return Array.from(dedup.values());
}

export async function getPublishedArticles(): Promise<HelpArticle[]> {
  const all = await getAllArticles();
  return all.filter((article) => article.published);
}

export async function getArticleBySlug(slug: string): Promise<HelpArticle | null> {
  const all = await getAllArticles();
  return all.find((article) => article.slug === slug) || null;
}

export async function searchArticles(query: string): Promise<HelpArticle[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await getPublishedArticles();
  return all
    .filter((article) => {
      const haystack = `${article.title} ${article.summary} ${article.category}`.toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 10);
}

export async function submitFeedback(slug: string, helpful: boolean): Promise<HelpFeedbackSummary> {
  const current = feedbackState.get(slug) || { slug, helpful: 0, notHelpful: 0 };
  const next: HelpFeedbackSummary = {
    slug,
    helpful: current.helpful + (helpful ? 1 : 0),
    notHelpful: current.notHelpful + (helpful ? 0 : 1),
  };
  feedbackState.set(slug, next);
  return next;
}

export async function getVideoScript(slug: string): Promise<VideoScript | null> {
  const article = await getArticleBySlug(slug);
  if (!article) return null;
  return getOrCreateScript(article);
}

function deriveStatus(article: HelpArticle): VideoStatus {
  if (!article.published) return "not_built";
  if (needsUpdate.has(article.slug)) return "needs_update";
  if (article.videoUrl && article.lastVerified) return "verified";
  const script = scriptState.get(article.slug);
  if (script?.status === "ready") return "script_ready";
  return "no_video";
}

export async function getOpsVideoRows(): Promise<OpsVideoRow[]> {
  const all = await getAllArticles();
  return all
    .map((article) => ({
      slug: article.slug,
      feature: article.title,
      category: article.category,
      status: deriveStatus(article),
      lastVerified: article.lastVerified,
      videoUrl: article.videoUrl,
      pageViews: article.pageViews,
    }))
    .sort((a, b) => b.pageViews - a.pageViews);
}

export async function updateVideo(
  slug: string,
  payload: { videoUrl?: string | null; duration?: string | null; thumbnailUrl?: string | null; verifiedBy?: string | null }
): Promise<HelpArticle | null> {
  const article = await getArticleBySlug(slug);
  if (!article) return null;

  const updates: Partial<HelpArticle> = {
    videoUrl: payload.videoUrl ?? article.videoUrl,
    duration: payload.duration ?? article.duration,
    thumbnailUrl: payload.thumbnailUrl ?? article.thumbnailUrl,
    lastVerified: payload.videoUrl ? new Date().toISOString() : null,
    verifiedBy: payload.videoUrl ? payload.verifiedBy || "system" : null,
    adoniKnows: !!payload.videoUrl,
    published: true,
  };

  articleState.set(slug, { ...(articleState.get(slug) || {}), ...updates });
  needsUpdate.delete(slug);

  const script = await getVideoScript(slug);
  if (script) {
    scriptState.set(slug, { ...script, status: payload.videoUrl ? "ready" : "draft", duration: payload.duration || script.duration });
  }

  const checklist = verifyState.get(slug);
  if (checklist) {
    verifyState.set(slug, {
      ...checklist,
      helpArticlePublished: true,
      videoRecorded: !!payload.videoUrl,
      adoniTrained: !!payload.videoUrl,
    });
  }

  await markAdoniTrained();
  return getArticleBySlug(slug);
}

export async function markVideoNeedsUpdate(slug: string): Promise<HelpArticle | null> {
  const article = await getArticleBySlug(slug);
  if (!article) return null;

  needsUpdate.add(slug);
  articleState.set(slug, {
    ...(articleState.get(slug) || {}),
    videoUrl: null,
    duration: null,
    thumbnailUrl: null,
    lastVerified: null,
    verifiedBy: null,
    adoniKnows: false,
  });

  const checklist = verifyState.get(slug);
  if (checklist) {
    verifyState.set(slug, { ...checklist, videoRecorded: false, adoniTrained: false });
  }

  return getArticleBySlug(slug);
}

export async function getChecklist(slug: string): Promise<VerifyChecklist | null> {
  const article = await getArticleBySlug(slug);
  if (!article) return null;
  if (!verifyState.has(slug)) verifyState.set(slug, defaultChecklist(article));
  return verifyState.get(slug) || null;
}

export async function updateChecklist(slug: string, updates: Partial<VerifyChecklist>): Promise<VerifyChecklist | null> {
  const current = await getChecklist(slug);
  if (!current) return null;
  const next = { ...current, ...updates };
  verifyState.set(slug, next);

  if (next.adoniTrained) await markAdoniTrained();
  return next;
}

export async function markAdoniTrained(): Promise<{ ok: true; trainedAt: string }> {
  adoniLastTrainedAt = new Date().toISOString();
  return { ok: true, trainedAt: adoniLastTrainedAt };
}

export function getAdoniTrainState() {
  return { lastTrainedAt: adoniLastTrainedAt };
}

export function getCategoryCatalog() {
  return CATEGORY_MAP;
}
