# Deploy Claim Verification

Use this before saying "What George needs to do: Nothing."

## Required checks

1. `git diff --name-only origin/main..HEAD` is empty after push.
2. If `prisma/schema.prisma` changed in shipped commits, list migration command + owner explicitly.
3. Confirm push guard `diffHash` corresponds to the final pushed diff.
4. Confirm Vercel deployment state is green for the target commit hash.
5. Confirm final summary uses exact live state:
   - Not deployed
   - Pushed (deploy pending)
   - Deployed (green)

## Hard rule

Never claim “no manual steps” when schema changed and migration has not been confirmed run.
