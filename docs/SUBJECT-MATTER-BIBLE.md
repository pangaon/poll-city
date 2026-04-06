# POLL CITY — SUBJECT MATTER BIBLE
## The most important document in this repository.
## Written from 35 years of Canadian political campaign experience.
## Every agent reads this before touching any feature.
## This is not a technical document. This is the WHY behind everything.

---

## HOW TO USE THIS DOCUMENT

You are a developer. You know how to write code.
What you do not know is what it feels like to be a
campaign manager at 9pm the night before a canvass
when the voters list will not import.

You do not know what it feels like to be a canvasser
standing at 308 King Street in the rain looking at
three opposition lawn signs wondering if anyone on
this street is even persuadable.

You do not know what election night feels like when
the gap between winning and losing is 47 votes and
you have 200 supporters who have not voted yet and
2 hours until polls close.

This document teaches you those things.
Read it. Think about it. Then build.

When you are about to build any feature ask yourself:
"Who is using this? Where are they? What are they
trying to accomplish? What goes wrong if this fails?
What does winning look like for them?"

If you cannot answer those questions — read this
document again before writing a line of code.

---

## PART 1 — WHO IS ACTUALLY USING THIS

### The first-time candidate

Age 28-45. Never run before. Has a job. Has a family.
Decided to run because something in their community
made them angry enough to act.

They have no idea what they are doing.
They are terrified of making mistakes.
They are trying to run a campaign while also going
to work, picking up their kids, and pretending to
their spouse that this is all under control.

They need Poll City to be the friend who has done
this 50 times. Not the software that makes them feel
stupid. Not the tool that requires a training session.
The friend who says "here is what to do today and
why it matters."

**What they need from every feature:**
- Obvious. They should not have to think.
- Forgiving. Mistakes should be easy to fix.
- Encouraging. Progress should feel real.
- Fast. They have 20 minutes between meetings.

### The experienced campaign manager

Has run 5-15 campaigns. Knows what works.
Has strong opinions. Has been burned by bad software.
Does not have time to learn new systems.

They will adopt Poll City if it is faster than what
they do now. They will leave immediately if it adds
friction anywhere in their existing workflow.

**What they need from every feature:**
- Power. More capability than they had before.
- Speed. Faster than the spreadsheet they use now.
- Control. They decide how the campaign is run.
- Data. Real numbers that help them make decisions.

### The canvasser (volunteer)

Shows up on a Tuesday night at 6:30pm after working
all day. They want to help. They are a little nervous.
They have never knocked doors before.

They need to be on the street and knocking within
10 minutes of arriving. Not learning software.

They will be on their phone the entire time.
The phone will be in one hand. Their door hanger
will be in the other hand. It might be raining.
They are walking between houses. They cannot fumble.

**What they need from every feature:**
- Works one-handed
- Works in the dark and rain
- Huge touch targets
- Never lose data if they lose signal
- Scripts accessible without interrupting their flow

### The field director

Deploying 20 volunteers across 8 turfs simultaneously.
Watching who is where. Making sure turfs get completed.
Solving problems as they arise.

They need to see everything at once.
They need to reassign turfs on the fly.
They need to know when a volunteer is stuck.
They need to be able to reach anyone instantly.

**What they need from every feature:**
- The full picture at a glance
- Quick reassignment tools
- Real-time volunteer positions
- One-tap communication with the team

### The candidate

Terrified. Hopeful. Exhausted.
Calling George at midnight asking "are we going to win?"

They need one number. Just one.
"You need 47 more votes."
Everything else is noise.

---

## PART 2 — THE CANADIAN ELECTION CONTEXT

### What makes Canadian campaigns different

**The voters list is a legal right.**
Every registered candidate is entitled to the
official list of electors for their ward or riding.
This is not a premium feature. It is the foundation
of democratic participation. Every contact system
we build assumes this list as the starting point.

**Campaign finance is tightly regulated.**
Ontario municipal: spending limits enforced by ward size.
Donation limits: $1,200 per individual.
Corporations and unions: completely prohibited.
Anonymous donations: maximum $25.
Receipts required for everything over $10.
Financial filing due within months of election day.

This is not bureaucracy. This is the law.
Poll City must make compliance automatic and invisible.
The campaign manager should never have to think
"wait, is this donation legal?" Poll City checks.

**Election timing is fixed.**
Ontario municipal: October 26, 2026.
BC local: October 17, 2026.
Federal: within 4 years of April 28, 2025.

Every campaign has a clock running.
Every feature should acknowledge the clock.
With 200 days to go the tone is patient and strategic.
With 10 days to go everything is urgent and tactical.
On election day everything is about one number.

**CRTC rules govern communications.**
Robocalls: must identify the caller. Must allow opt-out.
Cannot call before 9am or after 9pm.
Cannot mislead voters about polling locations.
Political calls are exempt from NDNCL but best
practice is to honour it anyway.

These rules are not optional. They are automatic in Poll City.

---

## PART 3 — THE CANVASSING REALITY
## Read this before building any canvassing feature.

### What actually happens when a canvasser knocks a door

They walk up to a house. They knock. One of these things happens:

**Nobody answers (60-70% of the time)**
They need to mark "Not Home" and decide:
- Leave a door hanger? Which one?
- Come back? When?
- Note anything about the property?
They need to do this in under 10 seconds
and be walking to the next door already.

**Someone answers who is supportive**
This is why they are out here.
They need to mark: Supporter
They might want to: get a lawn sign, volunteer,
get a call from the candidate, request information.
They need to capture this without fumbling.
The conversation should not be interrupted by software.

**Someone answers who is opposed**
They need to mark: Against
They do NOT need to spend more time here.
One tap and walk away.
The system should not ask them to fill out a form.

**Someone answers who is undecided**
This is the most important conversation of the night.
They need to: engage, listen, identify the key issue,
ask the right question, mark the result.
Adoni's script should be accessible but not intrusive.
One gentle swipe to see the script. One tap to dismiss it.

**Someone answers who is home but hostile**
They need to end the conversation gracefully.
Mark as Against. Note if there was an incident.
Get out safely.

**They see something important at the property**
Opposition sign in the yard. Accessibility issues.
Construction happening. Building with many units.
They need to note this without breaking stride.

### The canvassing app MUST work like this

**One thumb. One hand. Always.**
The canvasser's other hand has door hangers,
a coffee, or is knocking. The phone is one-handed.
Every tap target is at least 56px.
Every important button is at the bottom of the screen
within thumb reach.
Never require two hands for any field operation.

**Offline first. Always.**
Signal dies in basements. Signal dies in elevators.
Signal dies when 20 canvassers all hit the same
neighbourhood at once.
Every interaction saves locally first.
Syncs when signal returns.
The canvasser never sees an error. They just work.

**The walk list is ordered for efficiency.**
Not alphabetical. Not by house number alone.
One side of the street first. Other side back.
Skip already-completed doors automatically.
Show the next door prominently. Everything else secondary.

**The result buttons are instant.**
Not Home. Supporter. Undecided. Against. Refused.
These are the five most common outcomes.
Each one is one tap. Large. Clear. Colour coded.
No confirmation dialog for basic results.
Undo available for 10 seconds if they tap wrong.

**Dynamic fields that campaigns configure:**

Different campaigns need different data.
A ward councillor needs: support level, sign request, volunteer interest.
A provincial riding needs: GOTV score, phone number, issue priority.
A federal campaign needs: language preference, vote intention, riding-specific flags.

The campaign manager configures their field set once.
Every canvasser sees those fields.
New fields can be added mid-campaign.
Fields can be marked required or optional.
Fields can be conditional (show only if support = undecided).

**Examples of dynamic fields:**

```
Sign request:           [ ] Yes [ ] No [ ] Already have one
Volunteer interest:     [ ] Yes [ ] No [ ] Maybe
Call from candidate:    [ ] Yes please
Main issue:             [Transit] [Housing] [Safety] [Other: ___]
Language:               [English] [French] [Other: ___]
Unit count (building):  [____] units
Accessibility:          [ ] Wheelchair accessible building
Opposition signs:       [0] [1] [2] [3+]
Our signs visible:      [ ] Yes [ ] No
Notes:                  [                    ]
```

Every field the canvasser fills in becomes intelligence.
Three houses in a row with opposition signs?
The system flags that block as low priority.
A building with 40 units where nobody has answered?
The system suggests a different approach (lobby day, flyer drop).

**What the canvasser sees when they arrive at a door:**

```
308 King Street

[Sarah Chen — apartment not specified]
Last contact: 45 days ago — Undecided
Note from last visit: "Interested in transit issue"

RESULT:
[✅ Supporter] [🤷 Undecided] [❌ Against] [🚪 Not Home] [• • •]

— tap • • • for more options —
```

The more options menu (accessed with one tap, not buried):
```
[ ] Sign request
[ ] Volunteer
[ ] Call from candidate
[ ] Wrong address
[ ] Moved away
[ ] Hostile — do not return
[ ] Multiple units — enter count
[ ] Add note
[ ] Flag for follow-up
```

**Opposition intelligence — the thing nobody else has:**

As the canvasser walks down the street they can note
what they see on every house — even ones they do not knock.

This is done without stopping. Without opening a form.
They tap the house number on the map.
They tap what they see:
[Our sign] [Opposition sign] [No sign] [Multiple signs]

This builds a block-by-block intelligence map.
Where is opposition concentrated?
Where are we dominant?
Where is there an opportunity?
The field director sees this in real time on the map.

**Literature drops — the other canvassing mode:**

Sometimes you drop flyers without knocking.
Early in the campaign. Saturated streets. Bad weather.

The literature drop mode:
- Shows the street in order
- Canvasser taps each house as they drop the flyer
- System records: which piece, which date, which canvasser
- No need to note support level — just the drop
- Entire street can be marked in seconds by swiping

**Team canvassing — multiple people, same turf:**

Two people working together on the same street.
One does odd numbers, one does even numbers.
System splits the turf automatically.
Both can see each other's progress in real time.
No duplicate knocks. No gaps.

**After the canvass — the debrief:**

At the end of the night the app asks three questions:
"How did it feel out there tonight?"
"Any streets that need follow-up?"
"Anything unusual we should know about?"

These answers go to the field director.
They are not buried in a report nobody reads.
They appear in Adoni's morning brief:
"Three canvassers mentioned 4th Avenue felt hostile.
You may want to deprioritize that block."

---

## PART 4 — GOTV REALITY
## The most important 72 hours of the campaign.

### What GOTV actually is

GOTV stands for Get Out The Vote.
It is the final push to make sure your confirmed
supporters actually go to the polls and vote.

Here is the harsh truth: campaigns lose because their
supporters do not vote. Not because they do not have
enough supporters. Because their supporters stay home.

A campaign with 2,000 confirmed supporters where 800
actually vote loses to a campaign with 1,500 supporters
where 1,100 actually vote.

Every GOTV action has one goal:
Convert a confirmed supporter into a confirmed voter.

### The priority system (P1 through P4)

P1 (score 85-100): Your most reliable voters.
They have voted in every election for years.
They are definitely with you. They will probably vote.
Call them election morning. One reminder is enough.

P2 (score 70-84): Reliable but need encouragement.
They vote most of the time. They are with you.
Call them the day before. Call them election morning.
Ask if they need a ride.

P3 (score 55-69): Unreliable voters who support you.
They say they will vote but often do not.
Start calling 3 days out. Remind them. Ask them to
commit to a specific time they will vote.

P4 (score 40-54): Soft supporters.
They might vote. They might not. They are with you
but not strongly. Last to contact. Focus on P1-P3 first.

### The voted list — the most critical data on election day

Every polling station has scrutineers.
A scrutineer is someone who sits inside the polling
station and watches who votes.
They have the voters list. They check off names as
people come in and vote.

Throughout election day the campaign collects these
lists from every scrutineer — usually at 10am, 1pm,
4pm, and final count.

Each upload tells the campaign: these people voted.
Remove them from the call list.
The gap narrows. The urgency intensifies.

This is why the Upload Voted List button on GOTV
is the most important button in the entire platform.
It is not a file management feature.
It is a weapon.

### Rides — the silent vote multiplier

A significant number of supporters do not vote because
they cannot get to the polling station.
They are elderly. They do not have a car.
It is raining. They work late.

A campaign that systematically offers rides to
supporters who need them can increase their
supported turnout by 5-15%.

In a race decided by 47 votes that is everything.

The rides coordination feature:
- Identifies supporters who flagged they need a ride
- Clusters them by neighbourhood for efficient routing
- Matches them with volunteers who have cars
- Confirms the ride was completed
- This is not logistics. This is the difference between winning and losing.

---

## PART 5 — DATA ENRICHMENT PHILOSOPHY

### The voters list is the floor not the ceiling

The official voters list has: name, address, poll number.
That is it.

Over the course of a campaign Poll City enriches this
with everything the campaign learns:

- Phone number (from canvassing, from sign requests, from events)
- Email (from website signups, from events, from volunteers)
- Support level (from door knocking, from phone calls)
- Issues they care about (from conversations, from polls)
- Voting history (from public records, from self-reporting)
- Household composition (from canvassing notes)
- Language preference (from interactions)
- Accessibility needs (from notes)
- Connection to the candidate (neighbour, parent, coworker)

Every interaction is an opportunity to enrich the record.
A canvasser notes "has a dog — nice — came to the door."
That seems trivial. It is not. Next time someone knocks
that door they know to be ready for the dog.
It builds rapport. Rapport builds votes.

### Phone number enrichment — how it actually works

The canvasser is at the door talking to a supporter.
The supporter wants to hear more.
The canvasser asks: "Can I get your phone number
so we can keep you updated?"

Right there at the door the canvasser taps the
phone number field, the supporter reads out their number,
the canvasser enters it.

That supporter now gets:
- GOTV calls
- Event invitations
- Volunteer opportunities
- Election day reminders

One conversation at one door just turned an unknown
contact into a fully engaged supporter.

### Getting them on Poll City Social

The QR code on the door hanger is not decoration.
It links directly to the candidate's Poll City Social page.

When a voter scans it:
- They see the candidate's platform
- They can follow the campaign
- They can sign up for updates
- They can volunteer
- Their phone number is captured with consent
- They are now in the CRM

This is permission-based data collection at scale.
Every door hanger is a data collection instrument.

---

## PART 6 — THE SIGN PROGRAM

### Why lawn signs matter (more than people think)

Lawn signs do not change votes. Research is clear on this.
But they do three important things:

**1. They signal viability.**
A candidate with signs everywhere looks like a winner.
Voters do not want to waste their vote.
Signs create momentum and perceived momentum is real momentum.

**2. They identify your supporters publicly.**
A supporter who puts up a sign is a different kind of
supporter. They are committed. They are visible.
They will vote. They will bring their household to vote.

**3. They create conversation.**
"I saw your sign on Oak Street — you are running?"
That conversation starts at a sign and ends with a vote.

### The sign program needs to work like this

**Requests are captured everywhere:**
At the door (canvasser marks "sign request")
On the website (supporter fills the form)
At an event (attendee asks)
Over the phone (caller requests one)
On Poll City Social (follower requests one)

All of these flow into one list.
Nobody falls through the cracks.

**The sign map shows everything:**
Where our signs are deployed.
Where requests are waiting.
Where opponent signs are concentrated.
Where we have gaps in visible coverage.

**Sign deployment is tracked precisely:**
Who delivered it.
When it was delivered.
What size it is.
Is it still up? (canvassers confirm on subsequent visits)

**Sign removal after the election:**
The map shows every sign location.
Volunteers collect them systematically.
The municipality often has rules about removal timing.
Poll City tracks compliance.

---

## PART 7 — COMMUNICATIONS REALITY

### Email

Campaigns use email for three things:
Fundraising. Announcements. GOTV.

Fundraising emails need to feel personal.
"I am writing to you personally because..."
Even if it goes to 2,000 people it should feel like
a letter from the candidate.

Announcement emails need to be short.
Nobody reads long campaign emails.
One message. One link. One call to action.

GOTV emails need urgency without panic.
"Tomorrow is election day. Here is where to vote.
Here is why it matters."

### SMS and robocalls

SMS open rate: 98%. Email open rate: 22%.
When you need someone to do something today — text them.

Robocalls are not spam when done right.
"Hi, this is Jane Smith. I am calling personally
to thank you for your support and ask you to vote
tomorrow. Polls are open until 8pm."

That call from the candidate's own voice to a
confirmed supporter the night before the election
is one of the most powerful tools in a campaign.

### The CRTC rules are automatic in Poll City

The developer does not need to think about this.
The compliance layer handles it.
But they need to understand WHY it is there.

A campaign that violates CRTC rules can be fined.
Can be disqualified. Can create a scandal.
The rules exist to protect voters from harassment.
Poll City's automatic compliance protects both
the campaign and the voter.

---

## PART 8 — FINANCE AND COMPLIANCE

### Why this matters more than most campaigns realize

Campaign finance violations have ended careers.
A well-meaning candidate who did not track their
expenses properly has lost their chance to run again.
Has been fined. Has been investigated.

Poll City makes compliance automatic because the
alternative is candidates making honest mistakes
with serious consequences.

### The spending limit is a hard ceiling

Ontario municipal councillor spending limit:
Lesser of ($5,000 + $0.20 per elector) or $25,000.

For a ward with 15,000 electors:
$5,000 + $3,000 = $8,000 limit.

Every expense must be tracked.
Every receipt must be kept.
Every donation must be recorded with the donor's
full name, address, and employer.

Poll City's finance module:
- Tracks every expense as it happens
- Shows the remaining budget in real time
- Alerts when approaching the limit
- Requires receipt photos before marking paid
- Generates the financial report in the format
  required for filing

### The auditor threshold

Ontario: campaigns that raise or spend over $10,000
must have a licensed auditor certify their return.

Poll City detects when a campaign crosses this threshold
and notifies them. Ignoring this is not an option.

---

## PART 9 — THE VOLUNTEER EXPERIENCE

### Volunteers are the campaign

A candidate with 100 dedicated volunteers will beat
a candidate with $100,000 and no volunteers.

Volunteers knock doors. Volunteers make calls.
Volunteers stand at polling stations.
Volunteers drive supporters to vote.
Volunteers are the campaign.

### What good volunteer management looks like

**Recruitment is ongoing not one-time.**
The campaign never stops recruiting volunteers.
Every event is a recruitment opportunity.
Every door knock is a recruitment opportunity.
Every supporter is a potential volunteer.

**Onboarding must be instant.**
A volunteer who signs up and does not hear back
for a week is a lost volunteer.
Poll City sends an immediate confirmation.
Adoni sends a personalized welcome.
They are given a shift within 24 hours.

**Recognition is not optional.**
Volunteers give their time for free.
They need to feel that time matters.
The leaderboard on TV Mode is not vanity.
It is recognition. It is why people come back.

**Retention is harder than recruitment.**
After the first shift some volunteers never return.
Poll City flags volunteers who have not been active
in 10 days. Adoni drafts a personal re-engagement
message from the candidate. That message goes out.

---

## PART 10 — WHAT DEVELOPERS MUST ASK BEFORE BUILDING

Before building any feature read through these questions.
They are not checkboxes. They are thinking prompts.

**Who uses this feature?**
Name them. Are they a tired canvasser at 8pm?
A campaign manager on election night?
A first-time candidate terrified of making a mistake?

**Where are they when they use it?**
At a desk? On a phone walking down a street?
In a noisy campaign office? In a car?

**What are they trying to accomplish?**
Not "submit a form." What is the actual human goal?
Win a vote? Coordinate a team? Know if they are winning?

**What goes wrong without this feature?**
What does the campaign do now? Excel spreadsheet?
Paper lists? Nothing? What breaks when they do it that way?

**What does success look like?**
If this feature works perfectly — what happens?
The canvasser marks 80 doors in an evening instead of 40?
The campaign manager knows they are winning at 7pm instead of 10pm?

**What are the edge cases?**
What if the volunteer has no signal?
What if the campaign manager enters the wrong result?
What if two people update the same contact simultaneously?
What if the import file has corrupted data?
What if the election is postponed?

**How does this connect to the rest of the system?**
Does this feed into Adoni's briefing?
Does this trigger a notification?
Does this appear on the GOTV dashboard?
Does this affect the approval rating engine?

**Is this fast enough for the field?**
If an API call takes 2 seconds — a canvasser at 100 doors
waits 3 minutes total just on loading. That is unacceptable.
Everything in the field must respond in under 300ms.
Everything in the app must be usable offline.

---

## PART 11 — PHRASES THAT SHOULD GUIDE EVERY DECISION

**"The canvasser has one free hand."**
Every mobile feature must work one-handed.

**"The campaign manager at midnight."**
Every data feature must be readable at a glance
by someone who has not slept and is stressed.

**"The gap is the only number that matters."**
Every GOTV feature serves one metric: closing the gap.

**"The first-time candidate is terrified."**
Every empty state, every error message, every tooltip
should make them feel capable not overwhelmed.

**"The opponent is also using software."**
Speed matters. Every second of friction we remove
is a competitive advantage for our campaigns.

**"Democracy is worth doing right."**
Every compliance feature, every privacy protection,
every data isolation measure serves something bigger
than a software product.

---

## PART 12 — THE CANVASSING APP — EXACT SPECIFICATIONS

This is the most field-tested feature in the platform.
Build it exactly like this.

### Screen 1 — The walk list

What the canvasser sees when they open the app:

```
WOODBINE CORRIDOR TURF
Mike Chen — 23 doors remaining

[MAP showing current position and next 5 doors]

NEXT DOOR:
308 King Street East — Unit 4
Sarah Chen

[Navigate →]
```

The map is not decorative. It shows:
- Their current GPS position (blue dot)
- The route (blue line)
- Next door (pulsing orange pin)
- Completed doors (green pins)
- Not home doors (grey pins)
- Doors not yet visited (blue pins)

The Navigate button opens Apple Maps or Google Maps
with the address pre-filled. They never have to type.

### Screen 2 — The door

When they arrive at a door:

```
308 King Street East
Unit 4

SARAH CHEN
Previously: Undecided (March 15)
"Interested in transit issue"

━━━━━━━━━━━━━━━━━━━━━━━━━━

[✅ SUPPORTER]    [🤷 UNDECIDED]

[❌ AGAINST]      [🚪 NOT HOME]

━━━━━━━━━━━━━━━━━━━━━━━━━━

[Script ↑]    [More options ···]    [Skip →]
```

Design rules:
- Result buttons fill most of the screen
- Each button is at least 80px tall
- Colour coded: green, yellow, red, grey
- Previous contact shows at top — valuable context
- Script is one swipe up — not buried, not intrusive
- More options is never more than one tap away

### Screen 2a — The script (swipe up)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━

TALKING POINTS FOR UNDECIDED

"Hi, I'm [name] volunteering for Jane Smith
for Ward 20 Councillor.

Sarah, I understand transit is important to you.
Jane's number one priority is expanding the
Eglinton Crosstown into Ward 20.

Can we count on your support?"

IF THEY SAY YES: Tap Supporter
IF THEY ASK ABOUT HOUSING: "Jane also supports..."
IF THEY NEED TIME: Tap Undecided, offer literature

━━━━━━━━━━━━━━━━━━━━━━━━━━

[Swipe down to close]
```

The script is contextual. Different script for different
prior support levels. Different script for different issues.
The campaign configures scripts. Canvassers see them.

### Screen 2b — More options (tap •••)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━

ADDITIONAL ACTIONS

[ ] Sign request
[ ] Wants to volunteer
[ ] Candidate call requested
[ ] Add to email list
[ ] Needs a ride on election day

PROPERTY NOTES
[ ] Opposition signs on property: [0][1][2][3+]
[ ] Our sign already visible: yes / no
[ ] Multiple units in building: [___]
[ ] Accessibility — wheelchair accessible building

CONTACT UPDATE
[Update phone number]
[Update email address]
[Flag as wrong address]
[Flag as moved away]

MARK FULL HOUSEHOLD
[All supporters] [All undecided] [All against]

━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Screen 3 — After marking a result

Immediate confirmation. Then instant navigation to next door.

```
✅ Supporter marked for 308 King Street

[Undo (9 seconds)] ——————

NEXT: 312 King Street East
James Park — No prior contact

[Go to next door →]
```

The undo timer is visible and counting down.
If they tapped wrong — one tap to fix it.
After 10 seconds — locked. Proceed.

### The opposition intelligence feature

When the canvasser is walking between doors:

On the map, any house can be tapped even if it is
not on their walk list.

Tap any house on the map:
```
320 King Street East
Not on your walk list

WHAT DO YOU SEE?
[Our sign 🟢] [Opponent sign 🔴] [Multiple signs 🔴🔴] [Nothing]

[Save and continue]
```

This takes 3 seconds. The canvasser never breaks stride.
The field director sees this intelligence in real time.
By end of evening they have a block-by-block picture
of sign distribution across the ward.

### Literature drop mode

Toggled from the turf home screen.

```
LITERATURE DROP MODE

Dropping: "Jane Smith — Transit First" flyer
Area: Woodbine Corridor North

TAP EACH ADDRESS AS YOU DROP

[Swipe through addresses in order]
[Tap to mark dropped]

Progress: 14 / 67 addresses
```

At the end:
```
Drop complete. 67 addresses.

"Jane Smith — Transit First" flyer
Dropped by: Mike Chen
Date: April 6, 2026, 7:45pm

[Done]
```

This creates a complete literature delivery record.
The campaign knows exactly what was delivered where and when.
No more "I think we dropped Oak Street but I'm not sure."

### Team canvassing — two people, same turf

From the turf screen:
```
[Solo] [Team: 2 people] [Team: 3 people]
```

Team of 2 selected:
System splits the street. Odd numbers go to canvasser A.
Even numbers go to canvasser B.
Both see each other's progress on the map.
When one finishes their side — they can claim
more doors from the unfinished queue.
No overlap. No gaps. Constant progress.

### Adoni in canvassing mode

Adoni is not a chat bubble in the field.
He is a quiet assistant.

He appears as a small pill at the bottom of the screen:
"Ask Adoni"

When tapped he expands to show a simple voice interface:
"Ask anything"

Voice only. No typing while canvassing.
"Adoni, how many doors have I knocked tonight?"
"47 doors. You are tracking to finish your turf by 8:30."

"Adoni, what do I say to someone worried about housing?"
"Jane's housing position: she supports allowing secondary
suites in all residential zones and removing development
charges on affordable units under $600,000."

When not in use: completely invisible.
Never covers result buttons. Never covers the map.
Always dismissible with one tap.

---

## PART 13 — THE COMPLETE EDGE CASE LIST

These are real situations that will happen.
Build for all of them.

**Canvassing edge cases:**
- Signal dies mid-session → all data saves locally, syncs when signal returns
- Two canvassers update same contact simultaneously → most recent wins, both versions logged
- Canvasser taps wrong result → undo available 10 seconds
- Building with 200 units → enter unit count, system adjusts expectations
- Gated community with no access → mark as inaccessible, field director notified
- Hostile resident threatens canvasser → mark as hostile, incident report created, field director alerted
- It is raining and the phone is wet → touch still works (capacitive screens work with light moisture), large targets help
- Canvasser loses their phone → their results are saved to the server, not just locally
- Import fails halfway → rollback to before the import started, no partial data

**GOTV edge cases:**
- Power outage at polling station → system flags the affected polls, campaign gets alert
- Candidate concedes before polls close → system asks if GOTV should continue, default is yes
- Heavy rain on election day → system suggests shifting calls to supporters in affected area
- Scrutineer reports wrong numbers → double-entry verification catches this before it goes live
- Campaign incorrectly marks a supporter as voted → can be unmarked within 24 hours
- Gap reaches zero before polls close → celebration moment, then ask for help with other ridings

**Finance edge cases:**
- Donor makes two donations in same year → system warns if combined exceeds annual limit
- Corporate donation attempted → blocked automatically with explanation
- Cash donation over $25 → flagged, campaign must document
- Receipt for expense goes missing → system prompts but allows filing note "receipt lost"
- Expense entered in wrong category → easy correction with audit trail
- Campaign approaches spending limit → warning at 80%, alert at 90%, hard block at 100%

**Import edge cases:**
- CSV with merged cells → detected and cleaned automatically
- Duplicate contacts in import file → deduplicated by name + address matching
- Contacts already in system with different phone → system asks which to keep
- Import of 100,000 contacts → background processing, progress bar, completion notification
- Import with wrong column mapping → user corrects mapping before import begins
- Import cancelled halfway → rollback, no partial data in system

---

## CONCLUSION — THE STANDARD WE BUILD TO

Every feature in Poll City is built for a real person
in a real situation trying to do something that matters.

The canvasser at door 67 of 80 at 8pm in the rain.
The campaign manager watching the voted list at 6pm.
The first-time candidate checking their dashboard at midnight.
The field director trying to reach a volunteer who stopped responding.

Build for them.

Not for the demo. Not for the investor. Not for the review.
For the person in the rain at door 67 who is doing this
because they believe their community deserves better
representation.

That is why this platform exists.
That is the standard we build to.
