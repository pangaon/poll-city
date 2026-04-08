#!/usr/bin/env bash
# Poll City — Generate production environment variables
# Run: bash scripts/setup-env.sh
# Then paste the output into Vercel → Settings → Environment Variables

echo ""
echo "════════════════════════════════════════════════════"
echo "  Poll City — Production Environment Variables"
echo "  Copy each value into Vercel Settings → Env Vars"
echo "════════════════════════════════════════════════════"
echo ""

echo "POLL_ANONYMITY_SALT=$(openssl rand -base64 32)"
echo "IP_HASH_SALT=$(openssl rand -base64 32)"
echo "GUEST_TOKEN_SECRET=$(openssl rand -base64 32)"
echo "CRON_SECRET=$(openssl rand -base64 32)"

echo ""
echo "════════════════════════════════════════════════════"
echo "  VAPID Keys (push notifications)"
echo "  Paste VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY"
echo "════════════════════════════════════════════════════"
echo ""
npx web-push generate-vapid-keys 2>/dev/null || echo "(Run: npm install -g web-push first)"

echo ""
echo "════════════════════════════════════════════════════"
echo "  Done. Go to: vercel.com → poll-city → Settings"
echo "  → Environment Variables → Add each one above"
echo "  → Then: Deployments → Redeploy"
echo "════════════════════════════════════════════════════"
echo ""
