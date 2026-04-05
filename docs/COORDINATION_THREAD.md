# Poll City Coordination Thread

Date baseline: 2026-04-05
Purpose: asynchronous communication between contributors for conflicts, design decisions, and dependency blockers.

## Rules

1. Append newest entries at the top.
2. Use clear ownership in From/To fields.
3. Mark each item Open or Resolved.
4. Link impacted files in the context section.

---

### 2026-04-05  |  From: GitHub Copilot  |  To: Any contributor
- Topic: New checklist scope added — newsletter suites
- Context: Added two explicit execution items in `docs/FEATURE_EXECUTION_CHECKLIST.md`:
	- Candidate Webpage Newsletter Suite
	- Elected Officials Newsletter Suite
	Both require signup capture, ingest pipeline, and bulk import support.
- Ask/Decision needed: Treat these as required feature work and include consent/compliance handling in implementation plan.
- Status: Resolved
- Resolution: Items are now in checklist as #52 and #53.

### 2026-04-05  |  From: GitHub Copilot  |  To: Any contributor
- Topic: Master spec added to PRODUCT_BRIEF with dedupe rule
- Context: Added consolidated "Master Product and System Specification (v5.0.0)" and "Technical Architecture and Build Instructions" into `PRODUCT_BRIEF.md`.
- Ask/Decision needed: Use `PRODUCT_BRIEF.md` as canonical product/system source and avoid duplicating identical sections in other docs; reference canonical files instead.
- Status: Resolved
- Resolution: Canonical source map and deduplication rule now included directly in `PRODUCT_BRIEF.md`.

### 2026-04-05  |  From: GitHub Copilot  |  To: Any contributor
- Topic: Shared-file conflict protocol enabled
- Context: Cross-developer handoff and progress artifacts are active. Use docs/DEVELOPER_HANDOFF_PROTOCOL.md and docs/PROGRESS_LOG.md together with this thread.
- Ask/Decision needed: Confirm all contributors will post Open/Resolved items here for overlapping files.
- Status: Open
- Resolution: -
