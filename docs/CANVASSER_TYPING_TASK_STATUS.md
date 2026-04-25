# Canvasser Typing UX Task Status

Last updated: 2026-04-25 (UTC)

## Scope requested

1. Spellcheck / autocorrect smoothness across canvasser text inputs
2. Adoni writing assist availability in text-entry contexts
3. Address autocomplete/autofill across relevant forms

## Current status

- **Spellcheck/autocorrect**: **NOT STARTED** (no implementation PR in this branch yet)
- **Adoni writing assist in text fields**: **PARTIALLY SCOPED ONLY** (spec guidance exists; implementation not shipped)
- **Address autocomplete/autofill**: **NOT STARTED** (no shared module wired across forms yet)

## What is done already (supporting foundation only)

- Backend canvasser APIs, transcript parse/execute scaffold, sync foundation, and docs are in place.
- UX/spec docs now define fallback behavior and field constraints.

## Next execution order (recommended)

1. Ship shared text-input behavior layer (spellcheck/autocap/autocorrect defaults)
2. Ship shared address-autocomplete component + hook
3. Add Adoni assist action to high-value note/comment fields
4. Wire priority surfaces first (door note, sign request, volunteer lead)
5. Run focused QA script and list remaining unwired surfaces explicitly

## Reporting rule

Every update must include:
- Done by agent
- Needs George action
- Live status
- Remaining unwired surfaces
