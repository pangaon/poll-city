# Poll City Developer Handoff Protocol

Date: 2026-04-05
Version: 1.0

## Goal

Keep multiple developers and AI contributors continuously aligned without direct chat.

## Required Handoff Artifacts

1. docs/PROGRESS_LOG.md
2. docs/FEATURE_EXECUTION_CHECKLIST.md
3. docs/CHANGELOG.md
4. docs/COORDINATION_THREAD.md

## Start-of-Work Protocol

1. Pull latest branch state.
2. Read latest entries in docs/PROGRESS_LOG.md.
3. Read target feature row in docs/FEATURE_EXECUTION_CHECKLIST.md.
4. Re-read any files touched by another contributor before editing.
5. Publish one short "starting" entry to docs/PROGRESS_LOG.md (feature, scope, risks).

## During-Work Protocol

1. If a shared file changes unexpectedly, stop and re-read latest file contents.
2. Preserve stronger logic/usability changes regardless of author.
3. Keep updates additive; avoid broad unrelated refactors.
4. Post coordination notes/questions in docs/COORDINATION_THREAD.md (do not rely on memory or terminal history).

## Completion Protocol (mandatory before handoff)

1. Update docs/CHANGELOG.md.
2. Update docs/USER_GUIDE.md for operator-facing changes.
3. Update src/app/(marketing)/marketing-client.tsx for product-facing claims when applicable.
4. Update docs/FEATURE_EXECUTION_CHECKLIST.md row status/report fields.
5. Append completion entry to docs/PROGRESS_LOG.md containing:
   - What shipped
   - Files changed
   - Validation commands + pass/fail
   - Blockers/risks
   - Dependency readiness (ready now vs needs key/config)
6. Resolve or hand off open coordination items in docs/COORDINATION_THREAD.md.

## Standard Entry Template

Copy this block into docs/PROGRESS_LOG.md:

### YYYY-MM-DD HH:MM  |  Contributor: <name>
- Feature: <checklist item>
- Scope: <what was done>
- Files: <list>
- Validation: docs:check:master=<pass/fail>; verify:regression=<pass/fail>; build=<pass/fail>; tsc=<pass/fail>
- Dependencies: ready now=<yes/no>; needs=<keys/config>
- Handoff: <what next contributor should do first>

## Coordination Thread Template (docs/COORDINATION_THREAD.md)

### YYYY-MM-DD HH:MM  |  From: <name>  |  To: <owner/any>
- Topic: <feature/file/risk>
- Context: <what changed>
- Ask/Decision needed: <question or proposal>
- Status: Open / Resolved
- Resolution: <filled when resolved>
