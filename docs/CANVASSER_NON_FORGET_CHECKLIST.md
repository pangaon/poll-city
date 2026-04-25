# Canvasser Non-Forget Checklist (Session Guardrail)

This file exists to prevent agent drift, missing follow-through, and vague status updates.

## Rule
For every canvasser update, the agent must report using this exact structure:

1. **Done by agent**
   - exact files changed
   - commit hash
   - what behavior changed
2. **Needs George action**
   - exact command(s)
   - where to run (local / CI / Vercel)
   - required env vars/secrets
   - expected success output
3. **Live status**
   - `Not deployed` / `Pushed` / `Deployed`
   - if not live, explicitly say why
4. **Risk + fallback status**
   - Adoni status (healthy/degraded)
   - Manual Fast Mode readiness
   - offline queue readiness

If any section is missing, the update is incomplete.

---

## Mandatory canvasser release checks

Before calling any canvasser work "done":

- [ ] Tenant isolation verified (campaign scope + membership checks)
- [ ] Prisma schema diff checked; if changed, explicitly list migration step and owner
- [ ] Core door flow still works without Adoni
- [ ] Offline queue path still works
- [ ] Map/List toggle keeps user context (current stop + position)
- [ ] Error states are non-blocking for field logging
- [ ] QA script from `docs/CANVASSER_V1_FIELD_UX_SPEC.md` is referenced
- [ ] Push guard approval timestamp and `diffHash` verified against final pushed diff
- [ ] `npm run guard:ops` executed and `.push-guard/ops-readiness.json` reviewed
- [ ] Claim verification evidence captured for all \"already built\" statements

---

## Non-ambiguous language rules

Never say:
- "should be fine"
- "probably works"
- "you may need to"

Always say:
- "Done by agent: ..."
- "Needs George action: run `...` in `...`"
- "Live status: ..."

---

## Why this exists

Campaign weekend operations are high pressure.
Ambiguous handoffs create anxiety and production mistakes.
This checklist makes delivery explicit and repeatable.
Push/deploy coordination runbook: `docs/PUSH_DEPLOY_AUTOPILOT.md`.
Typing UX execution tracker: `docs/CANVASSER_TYPING_TASK_STATUS.md`.
Agent startup guardrail: `docs/AGENT_ENV_BOOTSTRAP.md`.
Video automation runbook: `docs/VIDEO_AUTOMATION_PLAN.md`.
