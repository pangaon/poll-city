# VAPID Push Notification Setup

Poll City uses the Web Push API with VAPID authentication. This guide walks through generating keys and wiring them into your environment.

---

## 1. Generate VAPID Keys

Run this once in your terminal (requires `web-push` installed):

```bash
npx web-push generate-vapid-keys
```

Output looks like:

```
Public Key:
BNxxxxxx...

Private Key:
xxxxxxxx...
```

---

## 2. Set Environment Variables

Add the following to your `.env` (local) and to your Vercel/Railway project environment:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | The **public** key from step 1 |
| `VAPID_PRIVATE_KEY` | The **private** key from step 1 |
| `VAPID_SUBJECT` | `mailto:admin@poll.city` (or your contact email) |

> **Important:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` must be prefixed with `NEXT_PUBLIC_` so it's available in the browser. `VAPID_PRIVATE_KEY` must **not** be prefixed (server-only).

---

## 3. Verify Setup

1. Start your dev server: `npm run dev`
2. Open the app → Notifications page
3. Enable browser notifications when prompted
4. Click **Send Test Notification** — you should receive a browser notification within 2 seconds

If you see an error:
- Check your `.env` has both variables set correctly
- Restart the dev server after adding env vars
- Ensure your browser allows notifications for `localhost`

---

## 4. Scheduled Notifications (Vercel Cron)

Scheduled notifications are saved to `NotificationLog` with `status = "scheduled"`. To process them automatically, add a Vercel Cron Job:

**`vercel.json`:**

```json
{
  "crons": [
    {
      "path": "/api/cron/process-scheduled-notifications",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**`src/app/api/cron/process-scheduled-notifications/route.ts`** — create this route to:

1. Query `NotificationLog` where `status = "scheduled"` and `scheduledFor <= now()`
2. For each record, load `PushSubscription` records for the campaign
3. Call `sendPushBatch()` from `@/lib/notifications/push`
4. Update `NotificationLog` with `status = "sent"`, `deliveredCount`, `failedCount`, `sentAt`

Secure the endpoint with a `CRON_SECRET` header check:

```ts
const secret = req.headers.get("authorization");
if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

Add `CRON_SECRET` to your Vercel env and reference it in `vercel.json`.

---

## 5. Voter Opt-In (Poll City Social)

Voters can opt in to election-day notifications on Poll City Social (`/social`). Their consent is stored in `ConsentLog` with `signalType = "notification_opt_in"`. The notifications page shows the total opt-in count.

To send to opted-in voters, you'll need a separate `PushSubscription` flow on the Social side — voters subscribe via the `/api/social/notifications/subscribe` endpoint (if implemented), and the subscription is tagged with `type: "voter"` for targeting.

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| "Push notifications not configured" | Check both env vars are set |
| Test sends but nothing appears | Check browser notification permission |
| `410 Gone` errors in logs | Stale subscriptions are auto-deleted — user must re-subscribe |
| Delivery rate drops below 80% | Run `prisma.pushSubscription.deleteMany` to purge stale endpoints |
