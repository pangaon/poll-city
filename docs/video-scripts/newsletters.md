# Video Walkthrough: Newsletter System
Duration: ~3 minutes
Feature: Candidate Newsletter (#52), Officials Newsletter (#53)

## Script

### Scene 1: Opening (0:00 - 0:10)
VOICE: "Stay in touch between elections. A regular newsletter keeps your supporters engaged and your name top of mind."

### Scene 2: Building Your List (0:10 - 0:40)
VOICE: "Add a newsletter signup to your candidate page. Visitors enter their name, email, and postal code. CASL requires explicit consent — Poll City records the consent date, IP address, and source for every subscriber."

### Scene 3: Subscriber Management (0:40 - 1:10)
VOICE: "View your subscribers — active, unsubscribed, bounced. Import a list from a CSV. Every import respects CASL — consent must have been obtained before import."

### Scene 4: Creating a Campaign (1:10 - 1:50)
VOICE: "Create a newsletter campaign. Write your subject line and body. Schedule it for tomorrow morning or send it now. Poll City sends through Resend and tracks delivery — sent, opened, bounced."

### Scene 5: Official Newsletters (1:50 - 2:20)
VOICE: "The same system works for elected officials. Constituents sign up on your official page. Send updates about community issues, council decisions, and upcoming town halls. Same CASL compliance, same delivery tracking."

### Scene 6: Closing (2:20 - 3:00)
VOICE: "A newsletter is not spam. It is a relationship. Send when you have something worth saying. Be consistent. Be useful. And always honour the unsubscribe — it is the law and it is respect."

## Verification Checklist
- [ ] Public subscribe form works with consent checkbox
- [ ] Subscriber list loads with status filter
- [ ] Bulk import works
- [ ] Newsletter campaign creation and scheduling works
- [ ] Send delivers via Resend
- [ ] Unsubscribe works
- [ ] Official newsletter signup works (officialId scoped)
