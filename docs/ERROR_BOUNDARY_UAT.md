# Error Boundary UAT Runbook

Date: 2026-04-06
Owner lane: GPT-Codex (UI resilience)
Scope: Contacts list/detail boundary recovery behavior
Feature: #42 Error Boundary Component

## Preconditions

1. Authenticated user with campaign access.
2. Ability to open `/contacts` and `/contacts/[id]`.
3. Browser devtools available to simulate network/API failures.

## Contacts List Boundary (`/contacts`)

1. Open `/contacts` and confirm normal render.
2. Trigger a runtime fault in list surface (for test build only) or simulate a render failure path.
Expected:
- Error boundary fallback card appears.
- Page shell remains usable (no full-app white screen).

3. Change campaign context and return.
Expected:
- Boundary auto-resets via `resetKeys`.
- Contacts list can render again.

## Contact Detail Boundary (`/contacts/[id]`)

1. Open a contact detail page.
2. Trigger a runtime fault in detail surface (test mode) or simulate failure.
Expected:
- Detail fallback appears.
- Global navigation remains intact.

3. Navigate to another contact ID.
Expected:
- Boundary resets on `params.id` change.
- New contact renders if healthy.

## Retry Flow

1. Click `Try again` on boundary fallback after failure condition is cleared.
Expected:
- Component re-attempts render.
- User can continue without full page reload.

## Exit Criteria

1. Boundary catches local UI failures in both contacts surfaces.
2. Boundary reset works for campaign/contact context changes.
3. No full shell crash from local component fault.
