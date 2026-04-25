# Claim Verification Log (Anti-Hallucination Record)

Purpose: prevent false statements like "already built" when code does not exist.

## Rule
Any claim about existing functionality must include evidence.

## Required evidence format

For each major claim, record:
1. **Claim**
2. **Verification command(s)**
3. **Evidence file path(s)**
4. **Verdict** (`Verified` / `Not found` / `Partial`)

## Minimum commands

- `git log --oneline -5`
- `git diff origin/main..HEAD --name-only`
- targeted file reads (`sed -n`, `rg -n`) for claimed modules/routes

## Hard rule

No DONE summary may state "already built" without at least one evidence row per claim.
