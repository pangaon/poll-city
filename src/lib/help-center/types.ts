export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface HelpArticle {
  slug: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  readTimeMinutes: number;
  difficulty: Difficulty;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: string | null;
  lastVerified: string | null;
  verifiedBy: string | null;
  adoniKnows: boolean;
  published: boolean;
  pageViews: number;
}

export interface VideoScript {
  slug: string;
  title: string;
  duration: string;
  script: string;
  voiceNotes: string | null;
  status: "draft" | "ready";
}

export interface HelpFeedbackSummary {
  slug: string;
  helpful: number;
  notHelpful: number;
}

export type VideoStatus = "verified" | "no_video" | "script_ready" | "needs_update" | "not_built";

export interface OpsVideoRow {
  slug: string;
  feature: string;
  category: string;
  status: VideoStatus;
  lastVerified: string | null;
  videoUrl: string | null;
  pageViews: number;
}

export interface VerifyChecklist {
  apiRouteExists: boolean;
  buildPasses: boolean;
  noTypeScriptErrors: boolean;
  emptyStateExists: boolean;
  loadingStateExists: boolean;
  errorStateExists: boolean;
  mobileWorks: boolean;
  dataIsReal: boolean;
  securityApplied: boolean;
  auditLogExists: boolean;
  helpArticlePublished: boolean;
  videoRecorded: boolean;
  adoniTrained: boolean;
}
