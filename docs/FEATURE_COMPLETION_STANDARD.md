# Poll City Feature Completion Standard

Date: 2026-04-05
Owner: Engineering and AI Agents

## Purpose

Every started feature must be fully completed to Poll City enterprise standards. Partial delivery is not acceptable.

This standard is mandatory for each checklist item in docs/FEATURE_EXECUTION_CHECKLIST.md.

## Mandatory Completion Gates (all required)

1. Product completeness
- The primary user problem is solved end to end in real workflows.
- UX includes loading, empty, error, and success states.
- Operator actions are obvious and reversible where needed.

2. Integration completeness
- UI inputs map to validated API contracts.
- API handlers enforce auth, campaign scope, and role constraints.
- Writes are persisted to Prisma models with correct indexes and relations.
- Read surfaces that depend on new data are verified (dashboard, exports, analytics, search, mobile/PWA views where relevant).

3. Data lifecycle completeness
- Create, update, and read paths are verified.
- Audit logging is present for mutating actions.
- Import/export implications are verified where feature touches contact or campaign data.

4. Security and abuse readiness
- Input validation present (Zod or equivalent route validation path).
- Rate limiting and anti-abuse posture assessed for public/mutation endpoints.
- No sensitive data leakage in API responses.

5. Documentation completeness
- docs/CHANGELOG.md updated.
- docs/USER_GUIDE.md updated for operator-facing behavior.
- src/app/(marketing)/marketing-client.tsx updated for product claims when user-facing capabilities changed.
- FEATURE_MATRIX.md status/notes updated when feature status changes.

6. Verification completeness
- npm run docs:check:master passes.
- npm run verify:regression passes.
- npm run build passes.
- Any targeted tests for touched domain pass.

7. Delivery completeness
- Single feature commit includes all code, docs, and validation updates.
- Checklist item updated with status, commit hash, and report summary.

8. Train Adoni (mandatory)
- Write or update the help article for this feature.
- Run: `npm run adoni:train`
- Confirm output shows the new feature was included in the knowledge base.
- Test: ask Adoni about the feature and confirm he answers accurately.
- A feature Adoni does not know about is a feature that will generate support tickets.

## Cross-Feature Planning Rule

Before coding, map dependencies and downstream impact:

1. Upstream dependencies
- Required auth providers, API keys, cron, queues, external integrations.

2. Lateral dependencies
- Other feature modules touched by shared entities (contacts, tasks, gotv, notifications, custom fields, exports).

3. Downstream surfaces
- Dashboard widgets.
- Analytics calculations.
- Import/export schemas.
- Mobile and social experiences if data is shared.

No implementation starts until this dependency map is explicit.

## Form-to-Database Flow Checklist

Use this for every new or changed form:

1. UI captures values with clear constraints.
2. Request body schema validates shape and type.
3. Server derives trusted campaign/user context (never from client-only claims).
4. Persistence write updates canonical model(s).
5. Audit event records what changed.
6. Read-after-write views confirm persisted state.
7. Export/report/query consumers continue to function.

## Dynamic Field Flow Checklist

Use this whenever campaign-defined columns/fields are involved:

1. Field definition source is campaign-scoped.
2. Dynamic values persist in CustomFieldValue with stable key references.
3. UI renderers support display and edit for each field type.
4. Import mapping supports custom field assignment.
5. Filters/search support custom fields where feature requires discovery.
6. Exports include custom fields when applicable.
7. Dashboard or stats consumers are updated if they aggregate custom field values.

## External Dependency Readiness Template

For each feature report, include:

- Ready now with current env: Yes/No
- Missing keys/config required for full live behavior:
  - key or config name
  - purpose
  - impact when missing

If any dependency is missing, feature report must state:
- "Feature is production-complete after dependency X is connected."
