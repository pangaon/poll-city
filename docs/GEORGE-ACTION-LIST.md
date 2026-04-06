# GEORGE'S LIST — WHAT ONLY YOU CAN DO
## In order. One at a time. Takes about 30 minutes total.
## Everything else the agents handle.

---

## RIGHT NOW — BEFORE SENDING PROMPTS (20 minutes)

### Step 1 — Open your terminal in VS Code
Bottom of VS Code screen. Click "Terminal" or press Ctrl + `

### Step 2 — Generate your secret keys
Copy and paste each command one at a time. Hit Enter after each.

```
openssl rand -hex 32
```
Copy the output. This is your DATABASE_ENCRYPTION_KEY.

```
openssl rand -hex 16
```
Copy the output. This is your CRON_SECRET.

```
openssl rand -hex 16
```
Copy the output. This is your HEALTH_CHECK_SECRET.

```
openssl rand -hex 32
```
Copy the output. This is your POLL_ANONYMITY_SALT.

```
npx web-push generate-vapid-keys
```
Copy both lines. These are VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.

Keep these somewhere safe — a notes app on your phone is fine.

---

### Step 3 — Add them to Vercel
Go to: vercel.com → your poll-city project → Settings → Environment Variables

Add each one. Name on the left. Value on the right. Hit Save.

```
DATABASE_ENCRYPTION_KEY     [the 64-character key from step 2]
CRON_SECRET                 [the 32-character key from step 2]
HEALTH_CHECK_SECRET         [the 32-character key from step 2]
POLL_ANONYMITY_SALT         [the 64-character key from step 2]
VAPID_PUBLIC_KEY            [from web-push command]
VAPID_PRIVATE_KEY           [from web-push command]
DEBUG_SECRET_KEY            pollcity2026george
NEXT_PUBLIC_DEBUG_SECRET_KEY pollcity2026george
```

---

### Step 4 — Find your user ID
Go to your live site. Log in as yourself.
Visit this URL: https://poll-city-8uoe6290x-pangaons-projects.vercel.app/api/auth/session
You will see some text. Find the "id" field. Copy it.

Go back to Vercel Environment Variables.
Add: GEORGE_USER_ID = [the id you just copied]

---

### Step 5 — Enable Railway backups
Go to: railway.app
Click your database project.
Click Settings.
Find Backups.
Turn on daily backups.
Done. Two minutes. Most important infrastructure action.

---

## AFTER SENDING THE PROMPTS (do this while agents are building)

### Step 6 — Install Poll City as a PWA on your phone
Open your live site on your phone browser.
iPhone: tap the Share button (box with arrow) → Add to Home Screen
Android: tap the three dots → Add to Home Screen
Open it from your home screen.
Allow notifications when it asks.

### Step 7 — Activate your debug suite
On your phone, go to:
https://poll-city-8uoe6290x-pangaons-projects.vercel.app/debug-access?key=pollcity2026george

You will see a confirmation screen.
Done. Debug toolbar now appears when you are logged in.

---

## THIS WEEK (not tonight — this week)

### Contact Anthropic for Zero Data Retention
Go to: console.anthropic.com
Find the support or enterprise contact option.
Tell them: "We process Canadian political data under PIPEDA
and need Zero Data Retention for all API calls."
This makes Adoni legally bulletproof for party customers.

### Create the private intelligence repo
Go to github.com → New repository
Name: poll-city-intelligence
Make it: Private
Do not add anything yet. Just create it.
This is where ATLAS (the proprietary algorithm) will live.

### Set up Twilio (for voice and SMS)
Go to: twilio.com → sign up or log in
Get your Account SID and Auth Token from the dashboard.
Get a Canadian phone number ($1.15/month).
Add to Vercel:
```
TWILIO_ACCOUNT_SID    [from Twilio dashboard]
TWILIO_AUTH_TOKEN     [from Twilio dashboard]
TWILIO_PHONE_NUMBER   [the Canadian number you bought]
```

### Set up Resend (for email)
Go to: resend.com → sign up
Create an API key.
Add to Vercel:
```
RESEND_API_KEY    [from Resend dashboard]
```

---

## AFTER TONIGHT'S BUILD IS DONE

### Run the seed data
Open VS Code terminal.
Type: npm run db:seed:ward20
Hit Enter.
Wait about 2 minutes.
5,000 real Toronto contacts will appear in your database.
Your maps will now look real.

### Run the help content seed
Type: npm run db:seed:help
Hit Enter.
Help articles will appear in the system.

---

## THE MOST IMPORTANT THING — DO THIS THIS WEEK

Call one person you know who is running in October 2026.
Anyone. A ward councillor candidate. Someone in a riding.
Tell them you want to show them something.
Get them on a call or meet them for coffee.
Show them the demo.
Charge them $799.

That first customer matters more than any feature.
Everything else is ready when you are.

---

## WHAT YOU DO NOT NEED TO WORRY ABOUT

The agents handle everything technical.
You do not need to understand:
- How the database works
- How the API routes work
- How React components work
- How deployments work
- How cron jobs work

You need to understand:
- What campaigns need (you already know this — 35 years)
- What the product should feel like (you are building this)
- Who your first customers are (you know these people)

Everything else is the army's job. You are the one.

---

## IF YOU GET STUCK ON ANY STEP

Come back here and ask. One question at a time.
Nothing is too basic. Nothing is a dumb question.
This is new territory and you are figuring it out
faster than most people with a computer science degree.
