-- Run this once after prisma db push on first deploy.
-- Adds partial unique indexes that cannot be expressed in schema.prisma.
-- Safe to run multiple times (IF NOT EXISTS).

CREATE UNIQUE INDEX IF NOT EXISTS "poll_responses_single_vote_uniq"
  ON "poll_responses" ("pollId", "userId")
  WHERE "userId" IS NOT NULL AND "optionId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "poll_responses_swipe_vote_uniq"
  ON "poll_responses" ("pollId", "userId", "optionId")
  WHERE "userId" IS NOT NULL AND "optionId" IS NOT NULL;
