-- ═══════════════════════════════════════════════════════════════════════════
-- POLL CITY — COMMUNICATIONS PLATFORM SCHEMA EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════
-- These tables EXTEND the existing Prisma schema.
-- Do NOT run this directly — translate to Prisma schema + run:
--   npx prisma migrate dev --name comms_platform --skip-seed
-- Existing tables referenced: campaigns, contacts, users, notification_logs,
--   social_accounts, social_posts, social_mentions, newsletter_campaigns,
--   newsletter_subscribers, voice_broadcasts, activity_logs, memberships
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS (new — add to prisma schema enum blocks)
-- ─────────────────────────────────────────────────────────────────────────────

-- MessageChannel: unified across all send systems
-- Values: email | sms | voice | push | social_dm | social_post

-- AutomationTriggerType: what fires the workflow
-- Values: contact_created | support_level_changed | funnel_stage_changed |
--         tag_added | tag_removed | donation_received | event_rsvp |
--         volunteer_signup | form_submitted | reply_received |
--         no_contact_days | canvass_logged | date_relative_to_election |
--         manual

-- AutomationStepType: what the step does
-- Values: send_email | send_sms | send_push | wait_duration | wait_until_date |
--         update_contact | add_tag | remove_tag | advance_funnel |
--         create_task | create_interaction | branch_condition | end

-- AutomationEnrollmentStatus
-- Values: active | paused | completed | cancelled | failed | waiting

-- MessageTemplateChannel
-- Values: email | sms | push

-- ConsentChannel
-- Values: email | sms | voice | push

-- ConsentStatus
-- Values: explicit_opt_in | soft_opt_in | opted_out | pending | bounced

-- InboxThreadChannel
-- Values: email | sms | social_facebook | social_instagram | social_x |
--         social_linkedin

-- InboxThreadStatus
-- Values: open | assigned | resolved | archived

-- MessageDeliveryEventType
-- Values: sent | delivered | opened | clicked | replied | bounced |
--         unsubscribed | complained | failed | opted_out

-- SocialPublishJobStatus
-- Values: queued | in_progress | published | failed | cancelled

-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE 1: MESSAGE TEMPLATES
-- Reusable email + SMS content. Scoped to campaign.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE message_templates (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    created_by_id       TEXT NOT NULL REFERENCES users(id),
    channel             TEXT NOT NULL,          -- 'email' | 'sms' | 'push'
    name                TEXT NOT NULL,          -- internal name
    subject             TEXT,                   -- email only
    body_html           TEXT,                   -- email: full HTML
    body_text           TEXT NOT NULL,          -- SMS: plain text; email: plain fallback
    preview_text        TEXT,                   -- email preview snippet
    -- Personalization tokens available: {{firstName}}, {{lastName}},
    -- {{ward}}, {{candidateName}}, {{campaignName}}
    tokens_used         TEXT[] DEFAULT '{}',    -- tokens present in body
    is_active           BOOLEAN DEFAULT TRUE,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_msg_templates_campaign ON message_templates(campaign_id, channel)
    WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE 2: SAVED SEGMENTS
-- Persisted audience filter definitions. Dynamic = re-evaluated at send time.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE saved_segments (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    created_by_id       TEXT NOT NULL REFERENCES users(id),
    name                TEXT NOT NULL,
    description         TEXT,
    -- filter_definition: JSON object matching audience API schema
    -- { supportLevels: [], wards: [], tagIds: [], funnelStages: [],
    --   excludeDnc: true, volunteerOnly: false, donorOnly: false,
    --   lastContactedBefore: ISO8601, lastContactedAfter: ISO8601,
    --   hasEmail: bool, hasPhone: bool, postalCodes: [] }
    filter_definition   JSONB NOT NULL,
    is_dynamic          BOOLEAN DEFAULT TRUE,   -- true = count recalculated each time
    last_count          INTEGER DEFAULT 0,
    last_counted_at     TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, name)
);

CREATE INDEX idx_saved_segments_campaign ON saved_segments(campaign_id)
    WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE 3: SCHEDULED MESSAGES
-- Queue for timed email/SMS sends. Audience resolved AT send time.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE scheduled_messages (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    created_by_id       TEXT NOT NULL REFERENCES users(id),
    template_id         TEXT REFERENCES message_templates(id) ON DELETE SET NULL,
    -- If segment_id = null, filter_definition used directly
    segment_id          TEXT REFERENCES saved_segments(id) ON DELETE SET NULL,
    channel             TEXT NOT NULL,
    subject             TEXT,                   -- email only
    body_html           TEXT,                   -- email only
    body_text           TEXT NOT NULL,
    -- Audience override: if set, ignores segment_id
    filter_override     JSONB,
    send_at             TIMESTAMPTZ NOT NULL,
    timezone            TEXT NOT NULL DEFAULT 'America/Toronto',
    status              TEXT DEFAULT 'queued',  -- queued|processing|sent|failed|cancelled
    -- Filled after send
    actual_sent_at      TIMESTAMPTZ,
    audience_size       INTEGER DEFAULT 0,
    sent_count          INTEGER DEFAULT 0,
    failed_count        INTEGER DEFAULT 0,
    notification_log_id TEXT REFERENCES notification_logs(id) ON DELETE SET NULL,
    error_message       TEXT,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_msgs_send ON scheduled_messages(send_at, status)
    WHERE deleted_at IS NULL AND status = 'queued';
CREATE INDEX idx_scheduled_msgs_campaign ON scheduled_messages(campaign_id)
    WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE 4: MESSAGE DELIVERY EVENTS
-- Per-recipient tracking. Email: via Resend webhooks. SMS: via Twilio webhooks.
-- Voice: via VoiceBroadcastCall (already exists). Social: via platform callbacks.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE message_delivery_events (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id          TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    -- Source: one of these must be non-null
    newsletter_campaign_id TEXT REFERENCES newsletter_campaigns(id) ON DELETE SET NULL,
    scheduled_message_id   TEXT REFERENCES scheduled_messages(id) ON DELETE SET NULL,
    social_post_id         TEXT REFERENCES social_posts(id) ON DELETE SET NULL,
    -- Event details
    channel             TEXT NOT NULL,          -- email|sms|push|voice|social_post
    event_type          TEXT NOT NULL,          -- sent|delivered|opened|clicked|replied|bounced|unsubscribed|complained|failed|opted_out
    -- Email specifics
    email_address       TEXT,
    link_url            TEXT,                   -- clicked link
    -- SMS specifics
    phone_number        TEXT,
    -- Platform-specific IDs for dedup
    external_event_id   TEXT,                  -- Resend/Twilio event ID
    -- Attribution window: did this contact convert within 72h?
    attributed_to_conversion BOOLEAN DEFAULT FALSE,
    conversion_action   TEXT,                  -- 'support_level_up'|'donation'|'volunteer_signup'
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_events_campaign ON message_delivery_events(campaign_id, created_at DESC);
CREATE INDEX idx_delivery_events_contact ON message_delivery_events(contact_id, created_at DESC);
CREATE INDEX idx_delivery_events_source_nl ON message_delivery_events(newsletter_campaign_id)
    WHERE newsletter_campaign_id IS NOT NULL;
CREATE INDEX idx_delivery_events_source_sm ON message_delivery_events(scheduled_message_id)
    WHERE scheduled_message_id IS NOT NULL;
CREATE INDEX idx_delivery_events_dedup ON message_delivery_events(channel, external_event_id)
    WHERE external_event_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE 5: CONSENT RECORDS
-- CASL explicit consent audit log. One record per consent event.
-- Never update — append only. Current status = latest record by channel.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE consent_records (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id          TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    email               TEXT,
    phone               TEXT,
    channel             TEXT NOT NULL,          -- email|sms|voice|push
    status              TEXT NOT NULL,          -- explicit_opt_in|soft_opt_in|opted_out|pending|bounced
    -- Source of this consent event
    source              TEXT NOT NULL,          -- 'form_submission'|'import'|'manual'|'unsubscribe_link'|
                                                --  'sms_stop'|'email_bounce'|'canvass_contact'|'event_rsvp'
    source_id           TEXT,                   -- ID of the form/import/campaign that triggered this
    consent_text        TEXT,                   -- exact text shown to user at opt-in
    ip_address          TEXT,
    user_agent          TEXT,
    recorded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Get current consent: SELECT DISTINCT ON (contact_id, channel) ORDER BY created_at DESC
CREATE INDEX idx_consent_records_contact ON consent_records(contact_id, channel, created_at DESC);
CREATE INDEX idx_consent_records_campaign ON consent_records(campaign_id, channel);

-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE 6: MESSAGE FATIGUE GUARD
-- Per-contact per-channel rolling send count. Prevents over-messaging.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE contact_message_frequency (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id          TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    channel             TEXT NOT NULL,
    -- Rolling 7-day count (updated on each send, recalculated from delivery events)
    sends_last_7_days   INTEGER DEFAULT 0,
    sends_last_30_days  INTEGER DEFAULT 0,
    last_sent_at        TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, contact_id, channel)
);

CREATE INDEX idx_msg_freq_contact ON contact_message_frequency(contact_id, channel);

-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE 7: AUTOMATION ENGINE
-- Workflow: trigger → steps → actions → completion.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE automations (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    created_by_id       TEXT NOT NULL REFERENCES users(id),
    name                TEXT NOT NULL,
    description         TEXT,
    is_active           BOOLEAN DEFAULT FALSE,  -- must be explicitly activated
    -- Trigger configuration
    trigger_type        TEXT NOT NULL,          -- see AutomationTriggerType enum above
    trigger_conditions  JSONB NOT NULL DEFAULT '{}',
    -- { supportLevel: "strong_support", funnelStage: "supporter",
    --   tagId: "xxx", formId: "xxx", daysBeforeElection: 14, ... }
    -- Enrollment control
    allow_re_enrollment BOOLEAN DEFAULT FALSE,
    enrollment_cooldown_days INTEGER DEFAULT 30,
    -- Stats
    total_enrolled      INTEGER DEFAULT 0,
    total_completed     INTEGER DEFAULT 0,
    total_cancelled     INTEGER DEFAULT 0,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automations_campaign ON automations(campaign_id, is_active)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_automations_trigger ON automations(campaign_id, trigger_type, is_active)
    WHERE deleted_at IS NULL AND is_active = TRUE;

CREATE TABLE automation_steps (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    automation_id       TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    step_order          INTEGER NOT NULL,
    step_type           TEXT NOT NULL,          -- see AutomationStepType enum above
    -- Step configuration
    config              JSONB NOT NULL DEFAULT '{}',
    -- send_email: { templateId, subject, bodyHtml, bodyText }
    -- send_sms: { templateId, body }
    -- wait_duration: { days: 3, hours: 0 }
    -- wait_until_date: { isoDate: "2026-10-25" }
    -- update_contact: { field: "supportLevel", value: "leaning_support" }
    -- add_tag: { tagId: "xxx" }
    -- create_task: { title, priority, assignedUserId }
    -- branch_condition: { field: "supportLevel", operator: "equals", value: "strong_support",
    --                     trueStepOrder: 3, falseStepOrder: 5 }
    -- Branch support: next step can be conditional
    next_step_order     INTEGER,                -- null = end of automation
    true_branch_step    INTEGER,                -- used by branch_condition
    false_branch_step   INTEGER,                -- used by branch_condition
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(automation_id, step_order)
);

CREATE INDEX idx_automation_steps_auto ON automation_steps(automation_id, step_order);

CREATE TABLE automation_enrollments (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    automation_id       TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id          TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status              TEXT DEFAULT 'active',  -- active|paused|completed|cancelled|failed|waiting
    current_step_order  INTEGER DEFAULT 0,
    -- Waiting state
    next_run_at         TIMESTAMPTZ,            -- when to execute next step
    -- Completion
    completed_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    cancel_reason       TEXT,
    error_message       TEXT,
    -- Audit
    steps_executed      INTEGER DEFAULT 0,
    messages_sent       INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(automation_id, contact_id)          -- one enrollment per contact per automation (unless re-enrollment allowed)
);

CREATE INDEX idx_auto_enrollments_run ON automation_enrollments(next_run_at, status)
    WHERE status IN ('active', 'waiting');
CREATE INDEX idx_auto_enrollments_campaign ON automation_enrollments(campaign_id, status);
CREATE INDEX idx_auto_enrollments_contact ON automation_enrollments(contact_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE 8: UNIFIED INBOX
-- All inbound messages from all channels. Linked to Contact.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE inbox_threads (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id          TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    channel             TEXT NOT NULL,          -- email|sms|social_facebook|social_instagram|social_x|social_linkedin
    -- Channel-specific identity
    external_thread_id  TEXT,                   -- platform thread/conversation ID
    contact_phone       TEXT,
    contact_email       TEXT,
    contact_handle      TEXT,                   -- social handle
    -- Status
    status              TEXT DEFAULT 'open',    -- open|assigned|resolved|archived
    assigned_to_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
    -- Metrics
    unread_count        INTEGER DEFAULT 0,
    last_message_at     TIMESTAMPTZ,
    last_message_preview TEXT,
    -- Tags + flags
    tags                TEXT[] DEFAULT '{}',
    is_priority         BOOLEAN DEFAULT FALSE,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, channel, external_thread_id)
);

CREATE INDEX idx_inbox_threads_campaign ON inbox_threads(campaign_id, status, last_message_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_inbox_threads_contact ON inbox_threads(contact_id);
CREATE INDEX idx_inbox_threads_assigned ON inbox_threads(assigned_to_id, status)
    WHERE deleted_at IS NULL;

CREATE TABLE inbox_messages (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    thread_id           TEXT NOT NULL REFERENCES inbox_threads(id) ON DELETE CASCADE,
    campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    -- Direction
    direction           TEXT NOT NULL,          -- 'inbound' | 'outbound'
    -- Author (inbound: contact, outbound: staff)
    from_contact_id     TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    from_user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
    -- Content
    body                TEXT NOT NULL,
    media_urls          TEXT[] DEFAULT '{}',
    -- Platform message ID for dedup
    external_message_id TEXT,
    -- Status
    is_read             BOOLEAN DEFAULT FALSE,
    read_at             TIMESTAMPTZ,
    read_by_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
    -- Quick reply template used
    template_id         TEXT REFERENCES message_templates(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inbox_messages_thread ON inbox_messages(thread_id, created_at ASC);
CREATE INDEX idx_inbox_messages_dedup ON inbox_messages(thread_id, external_message_id)
    WHERE external_message_id IS NOT NULL;
CREATE INDEX idx_inbox_messages_unread ON inbox_messages(thread_id, is_read)
    WHERE is_read = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE 9: SOCIAL PUBLISH JOBS
-- Queued publishing tasks for SocialPost records.
-- Decouples UI action from platform API call.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE social_publish_jobs (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    social_post_id      TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    social_account_id   TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    platform            TEXT NOT NULL,
    status              TEXT DEFAULT 'queued',  -- queued|in_progress|published|failed|cancelled
    scheduled_for       TIMESTAMPTZ,            -- null = immediate
    -- Retry logic
    attempt_count       INTEGER DEFAULT 0,
    max_attempts        INTEGER DEFAULT 3,
    next_retry_at       TIMESTAMPTZ,
    last_error          TEXT,
    -- Success
    external_post_id    TEXT,
    published_at        TIMESTAMPTZ,
    -- Metrics (updated by polling job)
    likes_count         INTEGER DEFAULT 0,
    comments_count      INTEGER DEFAULT 0,
    shares_count        INTEGER DEFAULT 0,
    reach_count         INTEGER DEFAULT 0,
    impressions_count   INTEGER DEFAULT 0,
    metrics_updated_at  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_jobs_queue ON social_publish_jobs(scheduled_for, status)
    WHERE status = 'queued';
CREATE INDEX idx_social_jobs_retry ON social_publish_jobs(next_retry_at, status)
    WHERE status = 'failed' AND attempt_count < max_attempts;
CREATE INDEX idx_social_jobs_post ON social_publish_jobs(social_post_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- MODULE 10: SOCIAL MEDIA LIBRARY
-- Campaign's media assets (images, videos) for social posts.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE media_library_items (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    campaign_id         TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    uploaded_by_id      TEXT NOT NULL REFERENCES users(id),
    name                TEXT NOT NULL,
    file_type           TEXT NOT NULL,          -- 'image/jpeg'|'image/png'|'video/mp4' etc.
    file_url            TEXT NOT NULL,          -- Cloudinary/Vercel Blob URL
    thumbnail_url       TEXT,
    width               INTEGER,
    height              INTEGER,
    size_bytes          INTEGER,
    tags                TEXT[] DEFAULT '{}',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_library_campaign ON media_library_items(campaign_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- SCHEMA ADDITIONS TO EXISTING TABLES
-- These are ALTER TABLE statements — translate to Prisma schema fields.
-- ─────────────────────────────────────────────────────────────────────────────

-- contacts: add email bounce + SMS opt-out tracking
-- (check if already present — smsOptOut was added 2026-04-09)
ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS email_bounced BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_bounce_reason TEXT,
    ADD COLUMN IF NOT EXISTS email_bounced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sms_opt_out BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sms_opt_out_at TIMESTAMPTZ;

-- newsletter_campaigns: add per-recipient tracking linkage + template reference
ALTER TABLE newsletter_campaigns
    ADD COLUMN IF NOT EXISTS template_id TEXT REFERENCES message_templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS segment_id TEXT REFERENCES saved_segments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS unsubscribe_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS spam_complaint_count INTEGER DEFAULT 0;

-- social_posts: add media library linkage + cross-post parent
ALTER TABLE social_posts
    ADD COLUMN IF NOT EXISTS parent_post_id TEXT REFERENCES social_posts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_cross_post BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES ON EXISTING TABLES (performance for comms queries)
-- ─────────────────────────────────────────────────────────────────────────────

-- Support fast audience queries
CREATE INDEX IF NOT EXISTS idx_contacts_comms_email
    ON contacts(campaign_id, support_level, deleted_at, do_not_contact, email)
    WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_comms_phone
    ON contacts(campaign_id, support_level, deleted_at, do_not_contact, phone)
    WHERE deleted_at IS NULL AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_last_contacted
    ON contacts(campaign_id, last_contacted_at DESC)
    WHERE deleted_at IS NULL;

-- Newsletter campaign fast status check
CREATE INDEX IF NOT EXISTS idx_nl_campaign_send
    ON newsletter_campaigns(campaign_id, status, scheduled_for);

-- ─────────────────────────────────────────────────────────────────────────────
-- SAMPLE DATA SHAPE (reference, not executable)
-- ─────────────────────────────────────────────────────────────────────────────

/*
-- Example: Automation for new strong supporters
INSERT INTO automations (campaign_id, created_by_id, name, trigger_type, trigger_conditions, is_active) VALUES
  ('camp_123', 'user_456', 'Strong Supporter Welcome Series', 'support_level_changed',
   '{"supportLevel": "strong_support"}', true);

-- Step 1: Send thank-you email immediately
INSERT INTO automation_steps (automation_id, step_order, step_type, config, next_step_order) VALUES
  ('auto_789', 0, 'send_email', '{"templateId": "tmpl_abc"}', 1);

-- Step 2: Wait 3 days
INSERT INTO automation_steps (automation_id, step_order, step_type, config, next_step_order) VALUES
  ('auto_789', 1, 'wait_duration', '{"days": 3}', 2);

-- Step 3: Send volunteer ask SMS
INSERT INTO automation_steps (automation_id, step_order, step_type, config, next_step_order) VALUES
  ('auto_789', 2, 'send_sms', '{"body": "Hi {{firstName}}, would you consider volunteering?"}', 3);

-- Step 4: Create follow-up task
INSERT INTO automation_steps (automation_id, step_order, step_type, config, next_step_order) VALUES
  ('auto_789', 3, 'create_task', '{"title": "Call new strong supporter {{firstName}} {{lastName}}", "priority": "high"}', null);
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- CRM + CONTACT INTELLIGENCE SUITE — SCHEMA EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════
-- Do NOT run this directly — implemented via Prisma schema + migration.
-- Migration name: crm_domain_model
-- ═══════════════════════════════════════════════════════════════════════════

-- ENUMS
-- ContactNoteType: general | call | canvass | email | event | complaint | system
-- ContactNoteVisibility: all_members | managers_only | admin_only
-- ContactRelationshipType: spouse_partner | parent | child | sibling | roommate | colleague | volunteer_captain | introduced_donor | staff_owner | candidate_connection | influencer | household_relative | other
-- ContactRoleType: voter | donor | volunteer | supporter | staff | event_attendee | influencer | candidate_contact | vendor_contact
-- ContactRoleStatus: active | inactive | pending
-- DuplicateConfidence: exact (95-100) | high (80-94) | medium (60-79) | low (40-59)
-- DuplicateDecision: pending | merged | not_duplicate | deferred | auto_linked

-- contact_notes
CREATE TABLE contact_notes (
  id            TEXT PRIMARY KEY,
  campaign_id   TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id    TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  note_type     TEXT NOT NULL DEFAULT 'general',
  body          TEXT NOT NULL,
  visibility    TEXT NOT NULL DEFAULT 'all_members',
  is_pinned     BOOLEAN NOT NULL DEFAULT false,
  created_by_id TEXT NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_notes_contact ON contact_notes(contact_id);
CREATE INDEX idx_contact_notes_campaign ON contact_notes(campaign_id);

-- contact_relationships
CREATE TABLE contact_relationships (
  id                TEXT PRIMARY KEY,
  campaign_id       TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  from_contact_id   TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  to_contact_id     TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  strength          INT,
  notes             TEXT,
  source            TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_by_id     TEXT REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, from_contact_id, to_contact_id, relationship_type)
);
CREATE INDEX idx_contact_rels_from ON contact_relationships(from_contact_id);
CREATE INDEX idx_contact_rels_to ON contact_relationships(to_contact_id);

-- contact_role_profiles
CREATE TABLE contact_role_profiles (
  id            TEXT PRIMARY KEY,
  contact_id    TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role_type     TEXT NOT NULL,
  role_status   TEXT NOT NULL DEFAULT 'active',
  metadata_json JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, role_type)
);
CREATE INDEX idx_role_profiles_contact ON contact_role_profiles(contact_id);

-- support_profiles
CREATE TABLE support_profiles (
  id                    TEXT PRIMARY KEY,
  contact_id            TEXT NOT NULL UNIQUE REFERENCES contacts(id) ON DELETE CASCADE,
  support_score         INT,
  turnout_likelihood    INT,
  persuasion_priority   INT,
  volunteer_potential   INT,
  donor_potential       INT,
  issue_affinity_json   JSONB,
  flag_high_value       BOOLEAN NOT NULL DEFAULT false,
  flag_high_priority    BOOLEAN NOT NULL DEFAULT false,
  flag_hostile          BOOLEAN NOT NULL DEFAULT false,
  flag_deceased         BOOLEAN NOT NULL DEFAULT false,
  flag_moved            BOOLEAN NOT NULL DEFAULT false,
  flag_duplicate_risk   BOOLEAN NOT NULL DEFAULT false,
  flag_needs_follow_up  BOOLEAN NOT NULL DEFAULT false,
  flag_compliance_review BOOLEAN NOT NULL DEFAULT false,
  last_assessed_at      TIMESTAMPTZ,
  assessed_by_user_id   TEXT REFERENCES users(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_profiles_contact ON support_profiles(contact_id);

-- duplicate_candidates
CREATE TABLE duplicate_candidates (
  id                TEXT PRIMARY KEY,
  campaign_id       TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_a_id      TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  contact_b_id      TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  confidence        TEXT NOT NULL,
  confidence_score  INT NOT NULL,
  signals           JSONB NOT NULL,
  decision          TEXT NOT NULL DEFAULT 'pending',
  decided_by_user_id TEXT REFERENCES users(id),
  decided_at        TIMESTAMPTZ,
  survivor_id       TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, contact_a_id, contact_b_id)
);
CREATE INDEX idx_dup_candidates_campaign_decision ON duplicate_candidates(campaign_id, decision);

-- merge_history
CREATE TABLE merge_history (
  id                    TEXT PRIMARY KEY,
  campaign_id           TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  survivor_contact_id   TEXT NOT NULL,
  absorbed_contact_id   TEXT NOT NULL,
  merged_by_user_id     TEXT NOT NULL REFERENCES users(id),
  field_decisions_json  JSONB NOT NULL,
  absorbed_snapshot_json JSONB NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_merge_history_campaign ON merge_history(campaign_id);
CREATE INDEX idx_merge_history_survivor ON merge_history(survivor_contact_id);

-- contact_audit_logs
CREATE TABLE contact_audit_logs (
  id             TEXT PRIMARY KEY,
  campaign_id    TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id     TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      TEXT NOT NULL,
  action         TEXT NOT NULL,
  field_name     TEXT,
  old_value_json JSONB,
  new_value_json JSONB,
  actor_user_id  TEXT REFERENCES users(id),
  source         TEXT NOT NULL DEFAULT 'manual',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_audit_contact ON contact_audit_logs(contact_id, created_at);
CREATE INDEX idx_contact_audit_campaign ON contact_audit_logs(campaign_id, created_at);
