# Contacts Slide-Over UAT Checklist

Date: 2026-04-06
Owner lane: GPT-Codex (UI reliability)
Feature: #30 Contact Slide-Over Panel

## Preconditions

1. Authenticated user with access to `/contacts` in an active campaign.
2. At least one contact with phone/email and one with sparse data.
3. Browser widths tested at desktop and mobile (`375x812`).

## Desktop Journey

1. Open `/contacts`.
2. Click a contact row.
Expected:
- Slide-over opens from the right.
- Contact identity, support selector, flags, notes, and recent activity render.

3. Change support level.
Expected:
- Save succeeds.
- Success toast appears.
- Value persists after closing and reopening panel.

4. Toggle `Follow up`, `Volunteer`, and `Sign` flags.
Expected:
- Toggles persist.
- No duplicate toasts/errors.

5. Edit notes and click Save.
Expected:
- Notes persist after reopen.
- Panel remains responsive.

6. Click `View full profile`.
Expected:
- Navigates to `/contacts/[id]`.
- Contact detail page loads for same record.

## Failure/Recovery Journey

1. Simulate detail load failure (network devtools offline or API error).
2. Open contact slide-over.
Expected:
- Inline error state appears.
- Retry button is visible.
- No spinner-only dead state.

3. Restore network and click Retry.
Expected:
- Contact loads successfully.
- Panel continues normal operation.

4. Simulate PATCH/save failure during support/notes update.
Expected:
- Inline save error appears.
- Panel remains open.
- User can retry and recover without losing context.

## Mobile Journey (`375x812`)

1. Open `/contacts` at `375x812` viewport.
2. Open contact slide-over.
Expected:
- Panel is fully usable and scrollable.
- Close action works reliably.

3. Perform support update and notes save.
Expected:
- Save success and persistence match desktop behavior.

4. Trigger failure scenarios from the recovery section.
Expected:
- Retry and save-error messaging are readable and actionable on mobile.

## Exit Criteria

1. All expected outcomes above pass.
2. No console crashes that break panel interaction.
3. Checklist item #30 can be moved to `Built & Verified` once this UAT is recorded alongside video proof.
