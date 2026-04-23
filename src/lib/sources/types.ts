import type {
  SourceType,
  SourceIngestionMethod,
  SourceVerificationStatus,
  SourceStatus,
  SourceOwnershipType,
  SourceAlertThreshold,
  SourceActivationStatus,
  SourceEndpointType,
} from "@prisma/client";

export type {
  SourceType,
  SourceIngestionMethod,
  SourceVerificationStatus,
  SourceStatus,
  SourceOwnershipType,
  SourceAlertThreshold,
  SourceActivationStatus,
  SourceEndpointType,
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  rss_feed: "RSS Feed",
  atom_feed: "Atom Feed",
  website_page: "Website Page",
  newsroom_page: "Newsroom Page",
  press_release_page: "Press Release Page",
  sitemap_news: "News Sitemap",
  sitemap_general: "General Sitemap",
  search_query: "Search Query",
  google_news_query: "Google News Query",
  youtube_channel: "YouTube Channel",
  youtube_search: "YouTube Search",
  reddit_query: "Reddit Search",
  facebook_page: "Facebook Page",
  x_profile: "X (Twitter) Profile",
  instagram_profile: "Instagram Profile",
  pdf_notice_page: "PDF Notice Page",
  agenda_minutes_page: "Agenda / Minutes Page",
  candidate_site: "Candidate Website",
  competitor_site: "Competitor Website",
  government_page: "Government Page",
  election_office_page: "Election Office Page",
  community_group_page: "Community Group Page",
  custom_url_monitor: "Custom URL Monitor",
};

export const SOURCE_STATUS_LABELS: Record<SourceStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  broken: "Broken",
  archived: "Archived",
  restricted: "Restricted",
};

export const VERIFICATION_STATUS_LABELS: Record<SourceVerificationStatus, string> = {
  unverified: "Unverified",
  verified: "Verified",
  needs_review: "Needs Review",
  rejected: "Rejected",
};

export const ACTIVATION_STATUS_LABELS: Record<SourceActivationStatus, string> = {
  active: "Active",
  paused: "Paused",
  muted: "Muted",
  disabled: "Disabled",
  error: "Error",
  pending_approval: "Pending Approval",
};

export const INGESTION_METHOD_LABELS: Record<SourceIngestionMethod, string> = {
  feed_poller: "Feed Poller",
  html_scraper: "HTML Scraper",
  structured_parser: "Structured Parser",
  sitemap_scanner: "Sitemap Scanner",
  search_ingestor: "Search Ingestor",
  manual_review_only: "Manual Review Only",
  webhook_ingest: "Webhook Ingest",
  future_api_connector: "Future API Connector",
};

export const PACK_TYPE_LABELS: Record<string, string> = {
  municipality: "Municipality Pack",
  ward: "Ward Pack",
  office: "Office Pack",
  local_media: "Local Media Pack",
  opponent_watch: "Opponent Watch Pack",
  municipal_news: "Municipal News Pack",
  community_watch: "Community Watch Pack",
  issue_watch: "Issue Watch Pack",
  compliance: "Compliance / Notice Pack",
};

export const MONITORING_MODE_LABELS: Record<string, string> = {
  mention_monitoring: "Mention Monitoring",
  sentiment_tracking: "Sentiment Tracking",
  issue_tracking: "Issue Tracking",
  opponent_tracking: "Opponent Tracking",
  misinformation_watch: "Misinformation Watch",
  endorsement_watch: "Endorsement Watch",
  crisis_watch: "Crisis Watch",
  media_watch: "Media Watch",
  event_watch: "Event Watch",
  community_watch: "Community Watch",
};

export const ALL_MONITORING_MODES = Object.keys(MONITORING_MODE_LABELS);

export interface SourceFilters {
  sourceType?: SourceType;
  sourceStatus?: SourceStatus;
  verificationStatus?: SourceVerificationStatus;
  ownershipType?: SourceOwnershipType;
  municipality?: string;
  province?: string;
  isRecommended?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SourceValidationResult {
  isReachable: boolean;
  isFeedValid: boolean;
  isContentFresh: boolean;
  httpStatus?: number;
  latencyMs?: number;
  itemsFound?: number;
  feedTitle?: string;
  feedDescription?: string;
  lastItemDate?: string;
  errors: string[];
  suggestions: string[];
}

export interface SourceDiscoveryResult {
  foundFeeds: { url: string; type: string; title?: string }[];
  foundSitemap: string | null;
  suggestedType: SourceType | null;
  notes: string[];
}
