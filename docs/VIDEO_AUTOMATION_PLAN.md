# Poll City Video Automation Plan (Help Library + Marketing/Promo)

## Goal
Create high-quality how-to videos continuously with minimal manual effort, then publish to:
- in-app Help Library,
- marketing pages,
- promo channels.

## Recommended production stack

### 1) Capture + editing
- Record product walkthroughs with Loom or Screen Studio.
- Use Descript for transcript-based edits, cleanup, and fast revisions.

### 2) Scaled AI narration/localization
- Use Synthesia or HeyGen for template-based multilingual variants when needed.

### 3) Hosting + embeds
- Use Wistia (primary) for help/marketing embeds, analytics, and site-first ownership.
- Optional fallback: Vimeo embeds for simpler distribution use-cases.

## Automation pipeline

1. Trigger on docs/feature changes (weekly batch or release hook).
2. Generate/update script from product docs + release notes.
3. Produce draft video from template.
4. Human QA pass (accuracy + tone + legal checks).
5. Publish to Wistia channel/folder by category.
6. Sync metadata to Help Library index.
7. Auto-embed selected videos on marketing pages by slug.

## Content taxonomy

- Getting Started
- Canvassing Core Flow
- Offline + Sync
- Adoni Usage + Fallback
- Manager Operations
- Troubleshooting

## Quality bar (non-negotiable)

- Audio clean and intelligible
- Step sequence matches current UI
- Captions included
- Duration target: 60–180s for task videos
- Clear CTA at the end (next action)

## Governance

- Every release marks videos as: Reuse / Refresh / Re-record
- Expire stale videos automatically if related feature changed materially
- Track completion SLA for missing videos

## Practical next steps

1. Pick one hosting source of truth (recommend Wistia).
2. Define 8–12 core help videos for first pass.
3. Build one reusable video template per category.
4. Pilot weekly auto-draft generation + human review.
5. Add embed mapping file for marketing pages and help routes.

## Autopilot inventory command

Run `npm run video:plan` to generate `docs/video-library/video-plan.generated.json`.
This reports all required videos, which are present, which are missing, and completion %.
