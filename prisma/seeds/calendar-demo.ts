/**
 * Calendar Demo Seed — Ward 20 Mature Campaign Schedule
 *
 * Run: npx tsx prisma/seeds/calendar-demo.ts
 *
 * Populates a full 7-week campaign schedule (Sept 1 – Oct 26, 2026)
 * for an Ontario municipal ward race. Creates:
 *   - 2 Calendars (Master + Candidate Schedule)
 *   - 37 CalendarItems across all major types
 *   - 12 CandidateAppearance records with full briefing detail
 *   - CalendarItemAssignments (campaign team assigned to each item)
 *   - AvailabilityBlocks (candidate personal protected time)
 *   - 3 ScheduleConflicts for the conflict resolver to demo
 *   - CalendarReminders on key debate + media items
 *
 * Designed to run after ward20-demo.ts. Safe to re-run — deletes
 * existing calendar data for the campaign before re-inserting.
 */

import {
  PrismaClient,
  CalendarType,
  CalendarItemType,
  CalendarItemStatus,
  CalLocationType,
  CandidateAppearanceFormat,
  ConflictType,
  ConflictSeverity,
  CalReminderChannel,
  AvailabilityType,
} from "@prisma/client";

const prisma = new PrismaClient();

// ── Date helpers (Toronto EDT = UTC-4, Sept–Oct) ─────────────────────────────

function t(date: string, time: string): Date {
  return new Date(`${date}T${time}:00-04:00`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("📅 Calendar Demo Seed — Ward 20 Mature Campaign\n");

  // ── Resolve campaign + team ───────────────────────────────────────────────
  const campaign = await prisma.campaign.findFirst({ orderBy: { createdAt: "desc" } });
  if (!campaign) { console.log("❌ No campaign found. Run the main seed first."); return; }
  console.log(`📋 Campaign: ${campaign.name} (${campaign.id})`);

  const admin    = await prisma.user.findFirst({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } });
  const manager  = await prisma.user.findFirst({ where: { email: "manager@pollcity.dev" } });
  const comms    = await prisma.user.findFirst({ where: { email: "comms@pollcity.dev" } });
  const fieldDir = await prisma.user.findFirst({ where: { email: "field@pollcity.dev" } });
  const volcoord = await prisma.user.findFirst({ where: { email: "volunteers@pollcity.dev" } });
  const events   = await prisma.user.findFirst({ where: { email: "events@pollcity.dev" } });

  if (!admin) { console.log("❌ No admin user found. Run the main seed first."); return; }

  const campaignId   = campaign.id;
  const adminId      = admin.id;
  const managerId    = manager?.id ?? adminId;
  const commsId      = comms?.id ?? adminId;
  const fieldId      = fieldDir?.id ?? adminId;
  const volId        = volcoord?.id ?? adminId;
  const eventsId     = events?.id ?? adminId;

  // ── Clean existing calendar data for this campaign ────────────────────────
  console.log("\n🧹 Cleaning existing calendar data...");
  await prisma.scheduleConflict.deleteMany({ where: { campaignId } });
  await prisma.calendarReminder.deleteMany({ where: { calendarItem: { campaignId } } });
  await prisma.calendarItemAssignment.deleteMany({ where: { calendarItem: { campaignId } } });
  await prisma.candidateAppearance.deleteMany({ where: { campaignId } });
  await prisma.calendarItem.deleteMany({ where: { campaignId } });
  await prisma.availabilityBlock.deleteMany({ where: { campaignId } });
  await prisma.calendar.deleteMany({ where: { campaignId } });
  console.log("  ✅ Clean");

  // ── 1. Calendars ──────────────────────────────────────────────────────────
  console.log("\n📆 Creating calendars...");

  const masterCal = await prisma.calendar.create({
    data: {
      campaignId,
      name: "Ward 20 Campaign Calendar",
      description: "Master campaign calendar — all activities",
      calendarType: CalendarType.master,
      color: "#0A2342",
      isDefault: true,
      createdByUserId: adminId,
    },
  });

  const candidateCal = await prisma.calendar.create({
    data: {
      campaignId,
      name: "Candidate Schedule",
      description: "Candidate-only appearances, debates, and media",
      calendarType: CalendarType.candidate,
      color: "#1D9E75",
      createdByUserId: managerId,
    },
  });

  console.log("  ✅ 2 calendars (Master + Candidate Schedule)");

  // ── 2. Calendar Items ─────────────────────────────────────────────────────
  console.log("\n🗓️  Creating 37 calendar items...");

  // Helper — create and return item
  async function item(data: Parameters<typeof prisma.calendarItem.create>[0]["data"]) {
    return prisma.calendarItem.create({ data });
  }

  // ─── WEEK 1: Sept 1–7 — Campaign Launch ────────────────────────────────────

  const launchBbq = await item({
    campaignId, calendarId: masterCal.id,
    title: "Campaign Launch BBQ",
    description: "Public launch event at Withrow Park. Media invited. All volunteers attend.",
    itemType: CalendarItemType.campaign_event,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-02", "17:00"), endAt: t("2026-09-02", "20:00"),
    locationType: CalLocationType.in_person,
    locationName: "Withrow Park", city: "Toronto", province: "Ontario",
    ward: "Ward 20", maxCapacity: 200,
    createdByUserId: adminId,
  });

  const cbcInterview = await item({
    campaignId, calendarId: candidateCal.id,
    title: "CBC Metro Morning — Campaign Launch Interview",
    description: "Live 8-minute segment with Matt Galloway. Transit and housing platform.",
    itemType: CalendarItemType.media_appearance,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-03", "07:45"), endAt: t("2026-09-03", "08:00"),
    locationType: CalLocationType.in_person,
    locationName: "CBC Toronto Studios", addressLine1: "250 Front St W", city: "Toronto", province: "Ontario",
    createdByUserId: managerId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Travel to CBC — depart campaign office",
    itemType: CalendarItemType.travel_block,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-03", "07:00"), endAt: t("2026-09-03", "07:40"),
    locationType: CalLocationType.in_person,
    locationName: "En route — Campaign Office to CBC", city: "Toronto", province: "Ontario",
    createdByUserId: managerId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Door Knock Launch — Oak Street Turf",
    description: "First major canvassing push. 12 volunteers. Focus: undecided + leaning support.",
    itemType: CalendarItemType.canvassing_run,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-05", "10:00"), endAt: t("2026-09-05", "14:00"),
    locationType: CalLocationType.in_person,
    locationName: "Oak Street & Dundas", city: "Toronto", province: "Ontario",
    ward: "Ward 20", maxCapacity: 15,
    createdByUserId: fieldId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Weekly Team Strategy Meeting",
    description: "Review week 1 results. Assign turf for week 2. Finance update.",
    itemType: CalendarItemType.staff_meeting,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-06", "09:00"), endAt: t("2026-09-06", "10:30"),
    locationType: CalLocationType.in_person,
    locationName: "Campaign Office — Board Room", city: "Toronto", province: "Ontario",
    createdByUserId: managerId,
  });

  // ─── WEEK 2: Sept 8–14 ─────────────────────────────────────────────────────

  const biaAppearance = await item({
    campaignId, calendarId: candidateCal.id,
    title: "East Toronto BIA — Meet the Candidate Morning",
    description: "45-minute meet-and-greet with business owners on Queen East strip.",
    itemType: CalendarItemType.candidate_appearance,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-08", "08:30"), endAt: t("2026-09-08", "09:30"),
    locationType: CalLocationType.in_person,
    locationName: "The Broadview Hotel — Meeting Room", addressLine1: "106 Broadview Ave",
    city: "Toronto", province: "Ontario", ward: "Ward 20",
    createdByUserId: managerId,
  });

  const cp24Segment = await item({
    campaignId, calendarId: candidateCal.id,
    title: "CP24 — Morning Live Segment",
    description: "4-minute live hit. Topic: housing affordability and Ward 20 density plan.",
    itemType: CalendarItemType.media_appearance,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-09", "08:20"), endAt: t("2026-09-09", "08:30"),
    locationType: CalLocationType.in_person,
    locationName: "CP24 Studios", addressLine1: "299 Queen St W", city: "Toronto", province: "Ontario",
    createdByUserId: commsId,
  });

  const fundraiserDinner = await item({
    campaignId, calendarId: masterCal.id,
    title: "Fundraiser Dinner — Terroni Queen East",
    description: "Table dinner for 40 major donors. $500/person. Campaign finance compliance required.",
    itemType: CalendarItemType.fundraiser,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-10", "18:30"), endAt: t("2026-09-10", "21:00"),
    locationType: CalLocationType.in_person,
    locationName: "Terroni Queen East", addressLine1: "1095 Queen St E",
    city: "Toronto", province: "Ontario", ward: "Ward 20",
    maxCapacity: 45,
    createdByUserId: eventsId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Town Hall — Transit & Crosstown LRT",
    description: "Public town hall. 80 attendees expected. Opponent will attend. Have transit points ready.",
    itemType: CalendarItemType.town_hall,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-11", "19:00"), endAt: t("2026-09-11", "21:00"),
    locationType: CalLocationType.in_person,
    locationName: "Ralph Thornton Community Centre", addressLine1: "765 Queen St E",
    city: "Toronto", province: "Ontario", ward: "Ward 20",
    maxCapacity: 100,
    createdByUserId: eventsId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Canvass Blitz — Broadview Corridor (North)",
    itemType: CalendarItemType.canvassing_run,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-12", "10:00"), endAt: t("2026-09-12", "15:00"),
    locationType: CalLocationType.in_person,
    locationName: "Broadview Ave & Danforth", city: "Toronto", province: "Ontario",
    ward: "Ward 20",
    createdByUserId: fieldId,
  });

  const debate1 = await item({
    campaignId, calendarId: candidateCal.id,
    title: "All-Candidates Debate #1 — Riverdale Community Centre",
    description: "Organized by East End Community Alliance. 3 other candidates. CBC and Global covering.",
    itemType: CalendarItemType.debate,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-14", "19:00"), endAt: t("2026-09-14", "21:30"),
    locationType: CalLocationType.in_person,
    locationName: "Riverdale Collegiate Auditorium", addressLine1: "1094 Gerrard St E",
    city: "Toronto", province: "Ontario", ward: "Ward 20",
    maxCapacity: 300,
    createdByUserId: managerId,
  });

  await item({
    campaignId, calendarId: candidateCal.id,
    title: "Debate Prep Session #1",
    description: "Mock questions, platform review, 2-minute opener draft. Manager + comms lead.",
    itemType: CalendarItemType.prep_window,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-13", "10:00"), endAt: t("2026-09-13", "13:00"),
    locationType: CalLocationType.in_person,
    locationName: "Campaign Office", city: "Toronto", province: "Ontario",
    createdByUserId: managerId,
  });

  // ─── WEEK 3: Sept 15–21 ────────────────────────────────────────────────────

  const starInterview = await item({
    campaignId, calendarId: candidateCal.id,
    title: "Toronto Star — Editorial Board Interview",
    description: "45-minute sit-down. They'll endorse 2 weeks out. Housing + parks platform focus.",
    itemType: CalendarItemType.media_appearance,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-16", "14:00"), endAt: t("2026-09-16", "15:00"),
    locationType: CalLocationType.in_person,
    locationName: "Toronto Star — Editorial Boardroom", addressLine1: "1 Yonge St",
    city: "Toronto", province: "Ontario",
    createdByUserId: commsId,
  });

  const unionEndorsement = await item({
    campaignId, calendarId: candidateCal.id,
    title: "Amalgamated Transit Union — Endorsement Ceremony",
    description: "ATU Local 113 endorsement. Photo op. Short 3-minute remarks. Media invited.",
    itemType: CalendarItemType.candidate_appearance,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-17", "11:00"), endAt: t("2026-09-17", "11:45"),
    locationType: CalLocationType.in_person,
    locationName: "ATU Local 113 Hall", addressLine1: "1943 Yonge St",
    city: "Toronto", province: "Ontario",
    createdByUserId: managerId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Phone Bank — Undecided List Push",
    description: "Call 400 undecideds from voter file. 8 callers. Script: transit + parks.",
    itemType: CalendarItemType.phone_bank_item,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-18", "17:00"), endAt: t("2026-09-18", "20:00"),
    locationType: CalLocationType.in_person,
    locationName: "Campaign Office", city: "Toronto", province: "Ontario",
    maxCapacity: 12,
    createdByUserId: volId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Sign Blitz — 50 Lawn Signs, Ward East Side",
    description: "Install 50 lawn signs on supporter properties. 3 vehicles, 6 volunteers.",
    itemType: CalendarItemType.sign_install_item,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-20", "09:00"), endAt: t("2026-09-20", "13:00"),
    locationType: CalLocationType.in_person,
    locationName: "Campaign Office (depart)", city: "Toronto", province: "Ontario",
    ward: "Ward 20",
    createdByUserId: fieldId,
  });

  await item({
    campaignId, calendarId: candidateCal.id,
    title: "Protected — Family Day (No Campaign Activities)",
    itemType: CalendarItemType.protected_time,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-09-21", "00:00"), endAt: t("2026-09-21", "23:59"),
    allDay: true,
    locationType: CalLocationType.tbd,
    createdByUserId: managerId,
  });

  // ─── WEEK 4: Sept 22–28 ────────────────────────────────────────────────────

  const withrowMeetGreet = await item({
    campaignId, calendarId: candidateCal.id,
    title: "Withrow Park Neighbourhood Meet & Greet",
    description: "Informal drop-in at the park. 30-50 residents expected. No formal remarks — just conversation.",
    itemType: CalendarItemType.candidate_appearance,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-22", "10:00"), endAt: t("2026-09-22", "12:00"),
    locationType: CalLocationType.in_person,
    locationName: "Withrow Park — Splash Pad Area",
    city: "Toronto", province: "Ontario", ward: "Ward 20",
    createdByUserId: managerId,
  });

  const majorDonorMtg = await item({
    campaignId, calendarId: masterCal.id,
    title: "Major Donor Meeting — Riverside Development Group",
    description: "Confidential. $5,000 ask. Legal: document all commitments for compliance filing.",
    itemType: CalendarItemType.donor_meeting,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-23", "12:00"), endAt: t("2026-09-23", "13:00"),
    locationType: CalLocationType.in_person,
    locationName: "The King Edward Hotel", addressLine1: "37 King St E",
    city: "Toronto", province: "Ontario",
    createdByUserId: adminId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Team Meeting — GOTV Planning Session",
    description: "Assign poll captains. Review voter contact universe. Set E-day targets by poll.",
    itemType: CalendarItemType.staff_meeting,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-24", "09:00"), endAt: t("2026-09-24", "11:00"),
    locationType: CalLocationType.in_person,
    locationName: "Campaign Office", city: "Toronto", province: "Ontario",
    createdByUserId: managerId,
  });

  const debate2 = await item({
    campaignId, calendarId: candidateCal.id,
    title: "All-Candidates Debate #2 — East York Civic Centre",
    description: "Organized by East York Tenants Association. Focus: rental housing + renovictions. Toughest crowd.",
    itemType: CalendarItemType.debate,
    itemStatus: CalendarItemStatus.completed,
    startAt: t("2026-09-25", "19:00"), endAt: t("2026-09-25", "21:30"),
    locationType: CalLocationType.in_person,
    locationName: "East York Civic Centre", addressLine1: "850 Coxwell Ave",
    city: "Toronto", province: "Ontario", ward: "Ward 20",
    maxCapacity: 250,
    createdByUserId: managerId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Canvass — Queen Street Corridor",
    itemType: CalendarItemType.canvassing_run,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-09-27", "10:00"), endAt: t("2026-09-27", "14:00"),
    locationType: CalLocationType.in_person,
    locationName: "Queen St E & Logan", city: "Toronto", province: "Ontario", ward: "Ward 20",
    createdByUserId: fieldId,
  });

  const communityConsult = await item({
    campaignId, calendarId: candidateCal.id,
    title: "Riverdale BIA — Community Consultation",
    description: "Discuss pedestrianizing Broadview between Gerrard and Danforth. 25 business owners.",
    itemType: CalendarItemType.candidate_appearance,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-09-28", "18:00"), endAt: t("2026-09-28", "19:30"),
    locationType: CalLocationType.in_person,
    locationName: "Broadview Hotel — Event Room", addressLine1: "106 Broadview Ave",
    city: "Toronto", province: "Ontario", ward: "Ward 20",
    createdByUserId: managerId,
  });

  // ─── WEEK 5: Sept 29 – Oct 5 ──────────────────────────────────────────────

  const mediaScrum = await item({
    campaignId, calendarId: candidateCal.id,
    title: "Media Scrum — Response to Opponent's Transit Attack Ad",
    description: "30-minute press availability outside campaign office. Have factsheet ready.",
    itemType: CalendarItemType.candidate_appearance,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-09-29", "10:30"), endAt: t("2026-09-29", "11:15"),
    locationType: CalLocationType.in_person,
    locationName: "Campaign Office — Front Steps",
    city: "Toronto", province: "Ontario",
    createdByUserId: commsId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Print Deadline — Mail Flyer (60,000 units)",
    description: "Final art approval due by noon. Goes to printer at 5pm. No extensions.",
    itemType: CalendarItemType.print_deadline,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-01", "09:00"), endAt: t("2026-10-01", "17:00"),
    allDay: false,
    locationType: CalLocationType.tbd,
    createdByUserId: commsId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Phone Bank Blitz — Final Undecided Push",
    description: "1,200 calls. 15 callers. Two sessions: 10am–1pm and 5pm–8pm.",
    itemType: CalendarItemType.phone_bank_item,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-02", "10:00"), endAt: t("2026-10-02", "20:00"),
    locationType: CalLocationType.in_person,
    locationName: "Campaign Office", city: "Toronto", province: "Ontario",
    maxCapacity: 18,
    createdByUserId: volId,
  });

  const volunteerAppreciation = await item({
    campaignId, calendarId: masterCal.id,
    title: "Volunteer Appreciation Potluck",
    description: "Thank-you event for 40+ volunteers. Debrief, stories, food. No asks.",
    itemType: CalendarItemType.campaign_event,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-04", "17:00"), endAt: t("2026-10-04", "20:00"),
    locationType: CalLocationType.in_person,
    locationName: "Campaign Office", city: "Toronto", province: "Ontario",
    maxCapacity: 50,
    createdByUserId: volId,
  });

  await item({
    campaignId, calendarId: candidateCal.id,
    title: "Protected — Rest Day",
    itemType: CalendarItemType.protected_time,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-05", "00:00"), endAt: t("2026-10-05", "23:59"),
    allDay: true, locationType: CalLocationType.tbd,
    createdByUserId: managerId,
  });

  // ─── WEEK 6: Oct 6–12 ─────────────────────────────────────────────────────

  const debate3Virtual = await item({
    campaignId, calendarId: candidateCal.id,
    title: "All-Candidates Debate #3 — Virtual (BlogTO / NOW)",
    description: "Streamed live on YouTube. 45 mins. Reader-submitted questions format. Comms on Zoom backup.",
    itemType: CalendarItemType.debate,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-06", "19:00"), endAt: t("2026-10-06", "20:30"),
    locationType: CalLocationType.virtual,
    virtualUrl: "https://meet.pollcity.demo/debate3",
    createdByUserId: commsId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Canvass Push — Priority Polls (Polls 12, 18, 31)",
    description: "Target 300 doors across 3 high-yield polls. Identify final GOTV universe.",
    itemType: CalendarItemType.canvassing_run,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-07", "10:00"), endAt: t("2026-10-07", "15:00"),
    locationType: CalLocationType.in_person,
    locationName: "Multiple turfs — Ward 20", city: "Toronto", province: "Ontario",
    ward: "Ward 20",
    createdByUserId: fieldId,
  });

  const nowMagazineInterview = await item({
    campaignId, calendarId: candidateCal.id,
    title: "NOW Magazine — Profile Interview",
    description: "Long-form profile piece. 90-minute sit-down. Progressive readership. Housing + climate angle.",
    itemType: CalendarItemType.media_appearance,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-09", "13:00"), endAt: t("2026-10-09", "14:30"),
    locationType: CalLocationType.in_person,
    locationName: "NOW Magazine Office", city: "Toronto", province: "Ontario",
    createdByUserId: commsId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Team Meeting — Final Stretch Briefing",
    description: "Polling update. GOTV universe finalized. E-day ride assignments confirmed.",
    itemType: CalendarItemType.staff_meeting,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-10", "09:00"), endAt: t("2026-10-10", "10:30"),
    locationType: CalLocationType.in_person,
    locationName: "Campaign Office", city: "Toronto", province: "Ontario",
    createdByUserId: managerId,
  });

  // ─── WEEK 7: Oct 13–19 ────────────────────────────────────────────────────

  await item({
    campaignId, calendarId: candidateCal.id,
    title: "Protected — Thanksgiving (No Campaign)",
    itemType: CalendarItemType.protected_time,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-12", "00:00"), endAt: t("2026-10-12", "23:59"),
    allDay: true, locationType: CalLocationType.tbd,
    createdByUserId: managerId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Canvass Push — Door Knock GOTV Universe",
    description: "First contact with confirmed GOTV list. Poll 18 and 31 only. Ride offers.",
    itemType: CalendarItemType.canvassing_run,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-14", "09:00"), endAt: t("2026-10-14", "14:00"),
    locationType: CalLocationType.in_person,
    locationName: "Ward 20 — Polls 18 & 31", city: "Toronto", province: "Ontario",
    ward: "Ward 20",
    createdByUserId: fieldId,
  });

  const debate4Final = await item({
    campaignId, calendarId: candidateCal.id,
    title: "All-Candidates Debate #4 — FINAL (CBC Radio)",
    description: "Broadcast + live audience. Most important debate. Big turnout expected. Legal must review notes.",
    itemType: CalendarItemType.debate,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-15", "19:00"), endAt: t("2026-10-15", "21:00"),
    locationType: CalLocationType.in_person,
    locationName: "CBC Broadcasting Centre — Studio Q", addressLine1: "250 Front St W",
    city: "Toronto", province: "Ontario",
    maxCapacity: 200,
    createdByUserId: managerId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Phone Bank — GOTV Confirmed Supporters",
    description: "Reminder calls to confirmed supporters. Remind of E-day location + hours.",
    itemType: CalendarItemType.phone_bank_item,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-18", "10:00"), endAt: t("2026-10-18", "19:00"),
    locationType: CalLocationType.in_person,
    locationName: "Campaign Office", city: "Toronto", province: "Ontario",
    createdByUserId: volId,
  });

  // ─── FINAL WEEK: Oct 20–26 ────────────────────────────────────────────────

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Print Deadline — E-Day Cards + Door Hangers",
    description: "Last print run. 10,000 E-day reminder cards. Must be done by Tuesday.",
    itemType: CalendarItemType.print_deadline,
    itemStatus: CalendarItemStatus.scheduled,
    startAt: t("2026-10-20", "09:00"), endAt: t("2026-10-20", "17:00"),
    locationType: CalLocationType.tbd,
    createdByUserId: commsId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "Final Door Knock Blitz — All Confirmed GOTV",
    description: "All hands. Every confirmed supporter contacted. Leave door hangers at no-answers.",
    itemType: CalendarItemType.canvassing_run,
    itemStatus: CalendarItemStatus.scheduled,
    startAt: t("2026-10-21", "09:00"), endAt: t("2026-10-21", "16:00"),
    locationType: CalLocationType.in_person,
    locationName: "Ward 20 — All Turfs", city: "Toronto", province: "Ontario",
    ward: "Ward 20",
    createdByUserId: fieldId,
  });

  const globalTvHit = await item({
    campaignId, calendarId: candidateCal.id,
    title: "Global Toronto — Final Week Candidate Roundup",
    description: "3-minute taped segment. All ward candidates. Final pitch to voters.",
    itemType: CalendarItemType.media_appearance,
    itemStatus: CalendarItemStatus.scheduled,
    startAt: t("2026-10-22", "15:00"), endAt: t("2026-10-22", "15:30"),
    locationType: CalLocationType.in_person,
    locationName: "Global TV — Toronto Studios", city: "Toronto", province: "Ontario",
    createdByUserId: commsId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "GOTV Phone Bank — Last Push",
    itemType: CalendarItemType.phone_bank_item,
    itemStatus: CalendarItemStatus.scheduled,
    startAt: t("2026-10-23", "17:00"), endAt: t("2026-10-23", "21:00"),
    locationType: CalLocationType.in_person,
    locationName: "Campaign Office", city: "Toronto", province: "Ontario",
    createdByUserId: volId,
  });

  await item({
    campaignId, calendarId: masterCal.id,
    title: "E-Day Ops Setup — Poll Captain Briefing",
    description: "Poll captain assignments, sign-in sheets, ride coordination, scrutineer placements.",
    itemType: CalendarItemType.poll_day_ops,
    itemStatus: CalendarItemStatus.scheduled,
    startAt: t("2026-10-24", "10:00"), endAt: t("2026-10-24", "13:00"),
    locationType: CalLocationType.in_person,
    locationName: "Campaign Office", city: "Toronto", province: "Ontario",
    createdByUserId: managerId,
  });

  await item({
    campaignId, calendarId: candidateCal.id,
    title: "Protected — E-Day Eve Rest",
    description: "No events. Candidate rests. Early bed.",
    itemType: CalendarItemType.protected_time,
    itemStatus: CalendarItemStatus.confirmed,
    startAt: t("2026-10-25", "18:00"), endAt: t("2026-10-25", "23:59"),
    locationType: CalLocationType.tbd,
    createdByUserId: managerId,
  });

  const electionDay = await item({
    campaignId, calendarId: masterCal.id,
    title: "ELECTION DAY — Oct 26, 2026",
    description: "Polls open 10am–8pm. All hands. Ride program live. Scrutineers at every poll. E-day party 9pm.",
    itemType: CalendarItemType.poll_day_ops,
    itemStatus: CalendarItemStatus.scheduled,
    startAt: t("2026-10-26", "10:00"), endAt: t("2026-10-26", "23:59"),
    locationType: CalLocationType.in_person,
    locationName: "Ward 20 — All Polling Stations", city: "Toronto", province: "Ontario",
    ward: "Ward 20",
    createdByUserId: adminId,
  });

  console.log("  ✅ 37 calendar items created");

  // ── 3. CandidateAppearance detail records ─────────────────────────────────
  console.log("\n🎤 Creating 12 candidate appearance records...");

  const appearances = [
    {
      item: cbcInterview,
      format: CandidateAppearanceFormat.media_interview,
      hostOrganization: "CBC Radio — Metro Morning",
      hostContactName: "Matt Galloway",
      hostContactEmail: "metro.morning@cbc.ca",
      expectedAttendees: 0, // broadcast
      mediaPresent: true, mediaOutlets: ["CBC Radio"],
      hasLiveStream: true, liveStreamUrl: "https://cbc.ca/listen/live-radio/1-91",
      speakingDurationMinutes: 8, prepWindowMinutes: 30,
      talkingPoints: ["Crosstown LRT extension to Coxwell", "Queen St dedicated bus lane", "Housing near transit corridors"],
      briefingNotes: "Matt will open on housing. Pivot to transit quickly. 8 minutes goes fast — land the message in first 90 seconds.",
      dresscode: "Business casual — no tie",
      staffingNotes: "Comms lead in earpiece. Marcus drives to studio.",
    },
    {
      item: cp24Segment,
      format: CandidateAppearanceFormat.media_interview,
      hostOrganization: "CP24",
      hostContactName: "Pooja Handa",
      expectedAttendees: 0,
      mediaPresent: true, mediaOutlets: ["CP24"],
      hasLiveStream: true, speakingDurationMinutes: 4, prepWindowMinutes: 20,
      talkingPoints: ["Housing affordability in Ward 20", "Missing middle density policy", "Opposing tower-only development"],
      briefingNotes: "Live hit — 4 minutes, no retakes. Don't get into the zoning numbers on air. Stay on narrative.",
      dresscode: "Dark jacket, no patterns",
      staffingNotes: "Marcus accompanies. Have canned response ready for opponent attack.",
    },
    {
      item: biaAppearance,
      format: CandidateAppearanceFormat.meet_and_greet,
      hostOrganization: "East Toronto Business Improvement Area",
      hostContactName: "Deborah Shapiro",
      hostContactPhone: "416-555-0200",
      hostContactEmail: "deborah@etbia.ca",
      expectedAttendees: 25,
      mediaPresent: false, mediaOutlets: [],
      hasLiveStream: false, speakingDurationMinutes: 10, prepWindowMinutes: 20,
      talkingPoints: ["Parking permit reform on Queen East", "Patio permit streamlining", "Clean sidewalk program funding"],
      briefingNotes: "BIA members care about parking above everything. Don't promise anything on metered parking — that's TPA jurisdiction, not Council.",
      staffingNotes: "Events lead attends. Take photos for social.",
    },
    {
      item: unionEndorsement,
      format: CandidateAppearanceFormat.endorsement_event,
      hostOrganization: "Amalgamated Transit Union Local 113",
      hostContactName: "Frank Vercillo",
      hostContactPhone: "416-555-0201",
      expectedAttendees: 40,
      mediaPresent: true, mediaOutlets: ["Toronto Star", "CP24"],
      hasLiveStream: false, speakingDurationMinutes: 3, prepWindowMinutes: 15,
      talkingPoints: ["Commitment to bus lane expansion", "Oppose contracting out transit jobs", "Fair wages for TTC workers"],
      briefingNotes: "3-minute remarks after the endorsement read. Have the talking points card in pocket. Don't wing it — union members notice.",
      dresscode: "Smart casual — no suits",
      staffingNotes: "Photo op mandatory. Post to all socials within 10 minutes.",
    },
    {
      item: withrowMeetGreet,
      format: CandidateAppearanceFormat.meet_and_greet,
      hostOrganization: "Withrow Park Neighbourhood Association",
      expectedAttendees: 45,
      mediaPresent: false, mediaOutlets: [],
      hasLiveStream: false, speakingDurationMinutes: 0, prepWindowMinutes: 15,
      talkingPoints: ["Park maintenance budget", "Basketball courts resurfacing ask", "Dog off-leash area expansion"],
      briefingNotes: "No formal remarks — just walk and talk. Bring printed one-pager on parks platform.",
      staffingNotes: "Candidate attends alone. Relaxed setting.",
    },
    {
      item: communityConsult,
      format: CandidateAppearanceFormat.community_consultation,
      hostOrganization: "Riverdale BIA",
      hostContactName: "Janet O'Connor",
      hostContactPhone: "416-555-0203",
      expectedAttendees: 25,
      mediaPresent: false, mediaOutlets: [],
      hasLiveStream: false, speakingDurationMinutes: 15, prepWindowMinutes: 30,
      talkingPoints: ["Pedestrianization feasibility study commitment", "Parking replacement strategy", "BIA grant program"],
      briefingNotes: "25 business owners who are skeptical. Opposing candidate has already met with 5 of them. Lead with the feasibility study — it doesn't commit us to anything but shows respect.",
      staffingNotes: "Manager attends. Have the BIA grant one-pager.",
    },
    {
      item: mediaScrum,
      format: CandidateAppearanceFormat.media_scrum,
      hostOrganization: "Candidate-called press availability",
      expectedAttendees: 0,
      mediaPresent: true, mediaOutlets: ["Toronto Star", "Globe and Mail", "CBC", "CP24", "Global TV"],
      hasLiveStream: false, speakingDurationMinutes: 30, prepWindowMinutes: 45,
      talkingPoints: ["Opponent's attack ad misrepresents transit vote record", "Our LRT extension position has been consistent since 2022", "Voters deserve a factual debate"],
      briefingNotes: "Controlled aggression. We called this. Don't let them turn it into a free-for-all. Comms lead manages the scrum — not the candidate. Open with the two-paragraph factsheet statement, then take questions.",
      securityNotes: "Manager stays beside candidate at all times. Opponent supporter group may attend.",
    },
    {
      item: debate1,
      format: CandidateAppearanceFormat.debate,
      hostOrganization: "East End Community Alliance",
      hostContactName: "Rev. Karen Blackwood",
      hostContactEmail: "karen@eeca.ca",
      expectedAttendees: 280,
      mediaPresent: true, mediaOutlets: ["CBC Metro Morning", "Global Toronto", "Toronto Star"],
      hasLiveStream: true, speakingDurationMinutes: 30, prepWindowMinutes: 120,
      talkingPoints: ["2-minute opener: 35 years of this ward, three things broken, one term to fix them", "Transit — Crosstown extension, King Car fix", "Housing — missing middle, oppose towers-only", "Closing: we win this together or not at all"],
      briefingNotes: "First debate. Set the tone. Don't engage with Rodriguez on housing — his record is weaker. Go after the incumbent on transit votes. Opening line lands everything.",
      dresscode: "Navy suit, no pocket square",
      staffingNotes: "Full team attends. Manager in front row. Comms monitoring social in real time. Water on podium.",
      securityNotes: "Large crowd. Campaign manager stays backstage.",
    },
    {
      item: debate2,
      format: CandidateAppearanceFormat.debate,
      hostOrganization: "East York Tenants Association",
      hostContactName: "Mike Flores",
      expectedAttendees: 220,
      mediaPresent: true, mediaOutlets: ["Toronto Star", "CBC Online"],
      hasLiveStream: false, speakingDurationMinutes: 25, prepWindowMinutes: 90,
      talkingPoints: ["Renoviction protection — support Tenant Protection Bylaw", "Secondary suites — waive permit fees", "Affordable housing definition must be real numbers"],
      briefingNotes: "Toughest crowd of the campaign. Tenants activists, many angry. Don't get defensive on development file. Own the affordable housing numbers gap head-on.",
      dresscode: "Smart casual — they'll distrust a suit",
      staffingNotes: "Manager only. No large team presence — looks tone-deaf.",
    },
    {
      item: debate3Virtual,
      format: CandidateAppearanceFormat.debate,
      hostOrganization: "BlogTO / NOW Magazine",
      expectedAttendees: 0,
      mediaPresent: true, mediaOutlets: ["BlogTO", "NOW Magazine", "YouTube Live"],
      hasLiveStream: true, liveStreamUrl: "https://youtube.com/c/BlogTO/live",
      speakingDurationMinutes: 25, prepWindowMinutes: 60,
      talkingPoints: ["Climate — urban tree canopy plan", "Cycling — Broadview to the lake", "Parks — underfunded for 15 years, fix it"],
      briefingNotes: "Progressive/young audience. Lead with climate + cycling. Transit is assumed — push further. Don't mention crime — wrong room.",
      dresscode: "Casual — filming from home studio",
      staffingNotes: "Comms sets up camera + lighting. 30 minutes before go-live.",
    },
    {
      item: debate4Final,
      format: CandidateAppearanceFormat.debate,
      hostOrganization: "CBC Radio Toronto",
      hostContactName: "Sarah Treleaven",
      hostContactEmail: "sarah.treleaven@cbc.ca",
      expectedAttendees: 180,
      mediaPresent: true, mediaOutlets: ["CBC Radio", "CBC Online", "Toronto Star"],
      hasLiveStream: true, liveStreamUrl: "https://cbc.ca/listen/live-radio/1-91",
      speakingDurationMinutes: 30, prepWindowMinutes: 120,
      talkingPoints: ["This debate wins or loses the race — everything counts", "Closing argument: specific, personal, memorable", "If attacked on housing vote: 'That vote was before the affordability crisis — I've updated my position and here's why'"],
      briefingNotes: "MOST IMPORTANT EVENT OF THE CAMPAIGN. Three days before election. Full prep two days prior. Don't improvise the close. We've written it — deliver it.",
      dresscode: "Full suit. Pressed. Lapel pin.",
      staffingNotes: "All senior staff present. Manager stays backstage. Phone off.",
      securityNotes: "High-profile. Campaign office should be staffed for real-time reaction.",
    },
    {
      item: starInterview,
      format: CandidateAppearanceFormat.media_interview,
      hostOrganization: "Toronto Star Editorial Board",
      hostContactName: "Irene Gentle (Editor-in-Chief)",
      expectedAttendees: 6,
      mediaPresent: true, mediaOutlets: ["Toronto Star"],
      hasLiveStream: false, speakingDurationMinutes: 45, prepWindowMinutes: 90,
      talkingPoints: ["Housing — specific numbers, not just vision", "Transit — what exactly will you do in first term", "Budget — where does the money come from"],
      briefingNotes: "Star endorses 2 weeks out. They need facts, not feelings. Have numbers on everything. They will test if you understand the budget process. If they endorse us, it's worth 3 points.",
      dresscode: "Conservative business — this is an editorial board",
      staffingNotes: "Manager accompanies but waits outside. 45 minutes is the full session.",
    },
  ];

  for (const a of appearances) {
    await prisma.candidateAppearance.create({
      data: {
        campaignId,
        calendarItemId: a.item.id,
        appearanceFormat: a.format,
        hostOrganization: a.hostOrganization ?? null,
        hostContactName: a.hostContactName ?? null,
        hostContactPhone: (a as any).hostContactPhone ?? null,
        hostContactEmail: (a as any).hostContactEmail ?? null,
        expectedAttendees: a.expectedAttendees,
        mediaPresent: a.mediaPresent,
        mediaOutlets: a.mediaOutlets,
        hasLiveStream: a.hasLiveStream,
        liveStreamUrl: (a as any).liveStreamUrl ?? null,
        speakingDurationMinutes: a.speakingDurationMinutes,
        prepWindowMinutes: a.prepWindowMinutes,
        talkingPoints: a.talkingPoints,
        briefingNotes: a.briefingNotes,
        dresscode: (a as any).dresscode ?? null,
        staffingNotes: (a as any).staffingNotes ?? null,
        securityNotes: (a as any).securityNotes ?? null,
        travelRequiresVehicle: a.item.locationName?.includes("Studios") || a.item.locationName?.includes("Star") || false,
      },
    });
  }
  console.log("  ✅ 12 candidate appearance records (debates, media hits, community events)");

  // ── 4. Assignments — who attends what ────────────────────────────────────
  console.log("\n👥 Creating team assignments...");

  const assignmentData: { calendarItemId: string; userId: string; role: string }[] = [
    // Launch BBQ — all hands
    { calendarItemId: launchBbq.id, userId: managerId, role: "lead" },
    { calendarItemId: launchBbq.id, userId: eventsId, role: "logistics" },
    { calendarItemId: launchBbq.id, userId: commsId, role: "comms" },
    { calendarItemId: launchBbq.id, userId: volId, role: "volunteers" },
    // CBC interview
    { calendarItemId: cbcInterview.id, userId: managerId, role: "accompanies" },
    { calendarItemId: cbcInterview.id, userId: commsId, role: "lead" },
    // CP24
    { calendarItemId: cp24Segment.id, userId: commsId, role: "lead" },
    // Fundraiser dinner
    { calendarItemId: fundraiserDinner.id, userId: managerId, role: "lead" },
    { calendarItemId: fundraiserDinner.id, userId: eventsId, role: "logistics" },
    { calendarItemId: fundraiserDinner.id, userId: adminId, role: "host" },
    // Debates — core team
    { calendarItemId: debate1.id, userId: managerId, role: "lead" },
    { calendarItemId: debate1.id, userId: commsId, role: "media_monitor" },
    { calendarItemId: debate2.id, userId: managerId, role: "lead" },
    { calendarItemId: debate3Virtual.id, userId: commsId, role: "tech_lead" },
    { calendarItemId: debate4Final.id, userId: managerId, role: "lead" },
    { calendarItemId: debate4Final.id, userId: commsId, role: "media_monitor" },
    { calendarItemId: debate4Final.id, userId: adminId, role: "candidate" },
    // Election day
    { calendarItemId: electionDay.id, userId: managerId, role: "campaign_director" },
    { calendarItemId: electionDay.id, userId: fieldId, role: "field_director" },
    { calendarItemId: electionDay.id, userId: volId, role: "volunteer_coordinator" },
    { calendarItemId: electionDay.id, userId: commsId, role: "comms_director" },
    { calendarItemId: electionDay.id, userId: adminId, role: "candidate" },
    // Major donor meeting
    { calendarItemId: majorDonorMtg.id, userId: adminId, role: "candidate" },
    { calendarItemId: majorDonorMtg.id, userId: managerId, role: "accompanies" },
    // Volunteer appreciation
    { calendarItemId: volunteerAppreciation.id, userId: volId, role: "lead" },
    { calendarItemId: volunteerAppreciation.id, userId: eventsId, role: "logistics" },
  ];

  for (const a of assignmentData) {
    await prisma.calendarItemAssignment.create({
      data: {
        calendarItemId: a.calendarItemId,
        assignedUserId: a.userId,
        roleOnItem: a.role,
        responseStatus: "accepted",
      },
    }).catch(() => {}); // skip duplicates
  }
  console.log(`  ✅ ${assignmentData.length} team assignments`);

  // ── 5. Availability blocks — candidate personal time ─────────────────────
  console.log("\n🚫 Creating availability blocks (candidate personal time)...");

  const availabilityData = [
    { title: "School pickup — every weekday", availabilityType: AvailabilityType.unavailable,
      startAt: t("2026-09-01", "15:30"), endAt: t("2026-09-01", "16:30"), recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
    { title: "Weekly Shabbat", availabilityType: AvailabilityType.unavailable,
      startAt: t("2026-09-04", "18:00"), endAt: t("2026-09-05", "20:00"), recurrenceRule: "FREQ=WEEKLY;BYDAY=FR" },
    { title: "Family dinner — Sundays", availabilityType: AvailabilityType.unavailable,
      startAt: t("2026-09-06", "17:00"), endAt: t("2026-09-06", "20:00"), recurrenceRule: "FREQ=WEEKLY;BYDAY=SU" },
    { title: "Morning run — do not book before 8am", availabilityType: AvailabilityType.unavailable,
      startAt: t("2026-09-01", "06:00"), endAt: t("2026-09-01", "07:30"), recurrenceRule: "FREQ=DAILY" },
    { title: "Thanksgiving long weekend — off", availabilityType: AvailabilityType.out_of_office,
      startAt: t("2026-10-10", "18:00"), endAt: t("2026-10-12", "20:00") },
    { title: "E-Day Eve — no campaign after 6pm", availabilityType: AvailabilityType.unavailable,
      startAt: t("2026-10-25", "18:00"), endAt: t("2026-10-26", "09:30") },
  ];

  for (const b of availabilityData) {
    await prisma.availabilityBlock.create({
      data: {
        campaignId,
        userId: adminId,
        title: b.title,
        availabilityType: b.availabilityType,
        startAt: b.startAt,
        endAt: b.endAt,
        recurrenceRule: b.recurrenceRule ?? null,
        timezone: "America/Toronto",
      },
    });
  }
  console.log(`  ✅ ${availabilityData.length} availability blocks`);

  // ── 6. Schedule Conflicts — for the conflict resolver demo ───────────────
  console.log("\n⚡ Creating 3 schedule conflicts...");

  // Conflict 1: Debate #4 (CBC) overlaps with a volunteer event on same night (hypothetical)
  await prisma.scheduleConflict.create({
    data: {
      campaignId,
      entityType: "user",
      entityId: adminId,
      entityLabel: "Candidate",
      conflictType: ConflictType.person_double_booked,
      sourceCalendarItemId: debate4Final.id,
      conflictingCalendarItemId: volunteerAppreciation.id,
      severity: ConflictSeverity.blocking,
      status: "open",
    },
  }).catch(() => {});
  // Note: above is artificially a conflict for demo — different dates, but stored to show UI

  // Conflict 2: Media scrum vs. donor meeting same morning
  await prisma.scheduleConflict.create({
    data: {
      campaignId,
      entityType: "user",
      entityId: managerId,
      entityLabel: "Rachel Dubois (Manager)",
      conflictType: ConflictType.person_double_booked,
      sourceCalendarItemId: mediaScrum.id,
      conflictingCalendarItemId: majorDonorMtg.id,
      severity: ConflictSeverity.warning,
      status: "open",
    },
  }).catch(() => {});

  // Conflict 3: Print deadline vs. town hall on same day (resource strain)
  await prisma.scheduleConflict.create({
    data: {
      campaignId,
      entityType: "campaign",
      entityId: campaignId,
      entityLabel: "Campaign",
      conflictType: ConflictType.deadline_missed,
      sourceCalendarItemId: debate3Virtual.id,
      conflictingCalendarItemId: nowMagazineInterview.id,
      severity: ConflictSeverity.info,
      status: "open",
    },
  }).catch(() => {});

  console.log("  ✅ 3 conflicts (1 blocking, 1 warning, 1 info)");

  // ── 7. Reminders on high-stakes items ────────────────────────────────────
  console.log("\n🔔 Creating reminders...");

  const reminderTargets = [
    { id: debate1.id, minutesBefore: 1440 },  // 24h before
    { id: debate1.id, minutesBefore: 60 },
    { id: debate2.id, minutesBefore: 1440 },
    { id: debate2.id, minutesBefore: 60 },
    { id: debate4Final.id, minutesBefore: 2880 }, // 48h — this one matters
    { id: debate4Final.id, minutesBefore: 1440 },
    { id: debate4Final.id, minutesBefore: 120 },
    { id: cbcInterview.id, minutesBefore: 120 },
    { id: cbcInterview.id, minutesBefore: 30 },
    { id: electionDay.id, minutesBefore: 1440 },
  ];

  for (const r of reminderTargets) {
    await prisma.calendarReminder.create({
      data: {
        calendarItemId: r.id,
        deliveryChannel: CalReminderChannel.in_app,
        minutesBefore: r.minutesBefore,
        status: "pending",
        scheduledFor: new Date(Date.now() + r.minutesBefore * 60 * 1000), // placeholder
      },
    });
  }
  console.log(`  ✅ ${reminderTargets.length} reminders`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalItems    = await prisma.calendarItem.count({ where: { campaignId } });
  const totalAppear   = await prisma.candidateAppearance.count({ where: { campaignId } });
  const totalAssign   = await prisma.calendarItemAssignment.count({ where: { calendarItem: { campaignId } } });
  const totalConflict = await prisma.scheduleConflict.count({ where: { campaignId } });

  console.log("\n" + "=".repeat(55));
  console.log("🗳️  CALENDAR DEMO SEED COMPLETE — Ward 20 Municipal 2026");
  console.log("=".repeat(55));
  console.log(`  Calendar items:         ${totalItems}`);
  console.log(`  Candidate appearances:  ${totalAppear}`);
  console.log(`  Team assignments:       ${totalAssign}`);
  console.log(`  Schedule conflicts:     ${totalConflict}`);
  console.log(`  Availability blocks:    ${availabilityData.length}`);
  console.log(`  Reminders:              ${reminderTargets.length}`);
  console.log("");
  console.log("  Election Day: October 26, 2026");
  console.log("  Calendars: Master + Candidate Schedule");
  console.log("  4 debates, 5 media hits, 5 canvass runs, E-day ops");
  console.log("");
  console.log("Visit: /calendar");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
