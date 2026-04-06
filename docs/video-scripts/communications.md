# Video Walkthrough: Communications (Email + SMS)
Duration: ~4 minutes
Feature: Email Campaigns, SMS Campaigns

## Script

### Scene 1: Opening (0:00 - 0:15)
SCREEN: Dashboard
VOICE: "Reaching your supporters at the right time with the right message wins elections. Poll City gives you CASL-compliant email and SMS tools that target exactly who you need."

### Scene 2: Email Campaigns (0:15 - 1:00)
SCREEN: Click Communications > Email in sidebar
VOICE: "Go to Email Campaigns. Click New Campaign. Write your subject line and body. Use merge tags — {{firstName}}, {{ward}}, {{candidateName}} — for personalisation."
ACTION: Show the email composer
VOICE: "Target your audience. Send to all supporters, just undecided voters in Ward 12, or only people tagged as 'Event Attendee'. Choose support levels, wards, and tags."
ACTION: Show audience targeting

### Scene 3: CASL Compliance (1:00 - 1:20)
SCREEN: Show the CASL footer
VOICE: "Every email automatically includes a CASL-compliant footer with your campaign name, unsubscribe link, and compliance notice. This is not optional — it is Canadian law."

### Scene 4: Sending and Results (1:20 - 1:45)
SCREEN: Send confirmation
VOICE: "Preview your email, then hit Send. Poll City sends through Resend and tracks delivery. You see how many sent, how many delivered, how many failed."

### Scene 5: SMS Campaigns (1:45 - 2:30)
SCREEN: Click Communications > SMS
VOICE: "SMS is your most direct channel. Click New SMS. Write your message — keep it under 160 characters for a single segment. Target the same way as email — support levels, wards, tags."
ACTION: Show SMS composer with character count
VOICE: "SMS is powerful but expensive. Use it for time-sensitive messages — 'Polls close in 2 hours, your station is St. James Church' — not general updates."

### Scene 6: Unified Inbox (2:30 - 3:00)
SCREEN: Communications > Inbox
VOICE: "The Unified Inbox shows all sent campaigns — email and SMS — in one timeline. See what went out, when, and to how many. No more guessing what the team sent."

### Scene 7: Social Media (3:00 - 3:30)
SCREEN: Communications > Social
VOICE: "Connect your social media accounts — Twitter, Facebook, Instagram, LinkedIn. Schedule posts, monitor mentions, and track engagement. All from one place."

### Scene 8: Closing (3:30 - 4:00)
SCREEN: Dashboard
VOICE: "Every email needs a clear subject, one ask, and a deadline. Every SMS needs to feel personal and urgent. And always — always — have an unsubscribe option. It is the law and it is the right thing to do."

## Verification Checklist
- [ ] Email composer loads with merge tags
- [ ] Audience targeting filters work (support, ward, tags)
- [ ] CASL footer appears on sent emails
- [ ] SMS composer shows character/segment count
- [ ] SMS sends (or gracefully degrades without Twilio)
- [ ] Unified inbox shows sent campaigns
- [ ] Social media account connection works
