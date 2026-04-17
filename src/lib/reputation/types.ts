import type {
  RepAlertSeverity,
  RepAlertSentiment,
  RepAlertSourceType,
  RepAlertStatus,
  RepIssueCategory,
  RepIssueStatus,
  RepRecActionType,
  RepRecUrgency,
  RepResponseActionStatus,
  RepPagePublishStatus,
  RepAmplificationStatus,
} from "@prisma/client";

export type {
  RepAlertSeverity,
  RepAlertSentiment,
  RepAlertSourceType,
  RepAlertStatus,
  RepIssueCategory,
  RepIssueStatus,
  RepRecActionType,
  RepRecUrgency,
  RepResponseActionStatus,
  RepPagePublishStatus,
  RepAmplificationStatus,
};

export interface AlertFilters {
  severity?: RepAlertSeverity;
  status?: RepAlertStatus;
  sentiment?: RepAlertSentiment;
  sourceType?: RepAlertSourceType;
  geography?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface IssueFilters {
  status?: RepIssueStatus;
  category?: RepIssueCategory;
  severity?: RepAlertSeverity;
  ownerUserId?: string;
  geography?: string;
  overdueOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface RuleEngineInput {
  severity: RepAlertSeverity;
  sentiment: RepAlertSentiment;
  sourceType: RepAlertSourceType;
  velocityScore: number;
  category: RepIssueCategory;
  geography: string | null;
  issueAgeHours: number;
  existingRecommendationCount: number;
}

export interface RuleEngineOutput {
  actionType: RepRecActionType;
  urgencyLevel: RepRecUrgency;
  suggestedChannels: string[];
  suggestedAudienceFilter: Record<string, unknown>;
  reasoning: string;
}

export const SEVERITY_RANK: Record<RepAlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const URGENCY_RANK: Record<RepRecUrgency, number> = {
  immediate: 5,
  within_hour: 4,
  within_day: 3,
  this_week: 2,
  monitor: 1,
};

export const STATUS_DISPLAY: Record<RepIssueStatus, string> = {
  open: "Open",
  triaged: "Triaged",
  in_progress: "In Progress",
  escalated: "Escalated",
  resolved: "Resolved",
  archived: "Archived",
};

export const CATEGORY_DISPLAY: Record<RepIssueCategory, string> = {
  misinformation: "Misinformation",
  policy: "Policy Issue",
  personal_attack: "Personal Attack",
  media_inquiry: "Media Inquiry",
  local_controversy: "Local Controversy",
  supporter_concern: "Supporter Concern",
  legal: "Legal",
  financial: "Financial",
  general: "General",
};

export const SOURCE_DISPLAY: Record<RepAlertSourceType, string> = {
  social_media: "Social Media",
  news: "News",
  blog: "Blog",
  forum: "Forum",
  manual: "Manual Entry",
  internal_monitoring: "Internal Monitoring",
};
