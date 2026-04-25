# Build Instructions

This file gives AI coding agents a simple starting point for working in this repository.

## Required first step

Before making any code changes, read these files in this order:

1. `CLAUDE.md`
2. `PLATFORM_TRUTH.md`
3. `SESSION_HANDOFF.md`
4. `WORK_QUEUE.md`
5. `GEORGE_TODO.md`

If any file is missing, report it before coding.

## Default build rule

Do not assume the application builds. Verify it.

Use:

```bash
npm run push:safe:check
```

Do not push code unless the repository's required push process passes.

## Task rule

Work on one scoped task at a time.

Before coding, identify:

- the exact feature or bug being worked on;
- the files likely affected;
- auth and tenant-isolation impact;
- database/schema impact;
- testing and QA requirements.

## Security rule

Every private campaign feature must enforce authentication, authorization, campaign membership, and campaign-scoped data access.

If campaign isolation cannot be confirmed, stop and report the risk.

## Reporting rule

At the end of work, report:

- files changed;
- what was changed;
- what was verified;
- what still needs manual testing;
- any risks or incomplete items.

This file does not replace `CLAUDE.md`. If there is a conflict, `CLAUDE.md` controls.
