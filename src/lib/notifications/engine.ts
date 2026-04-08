import prisma from "@/lib/db/prisma";

type NotificationEvent =
  | { type: "result_verified"; ward: string; candidateName: string; votes: number }
  | { type: "poll_threshold"; pollId: string; threshold: number }
  | { type: "petition_milestone"; petitionId: string; signatures: number }
  | { type: "promise_updated"; promiseId: string; status: string }
  | { type: "event_reminder"; eventId: string }
  | { type: "emergency"; area: string; message: string };

export async function triggerNotification(event: NotificationEvent): Promise<number> {
  let recipients: { userId: string; pushToken?: string | null }[] = [];

  switch (event.type) {
    case "result_verified": {
      const profiles = await prisma.civicProfile.findMany({
        where: { ward: event.ward, notifyResults: true },
        select: { userId: true, pushToken: true, quietHoursStart: true, quietHoursEnd: true },
      });
      recipients = profiles
        .filter((p): p is typeof p & { userId: string } => p.userId !== null && !isQuietHours(p.quietHoursStart, p.quietHoursEnd));
      break;
    }
    case "poll_threshold": {
      const subs = await prisma.pollSubscriber.findMany({
        where: { pollId: event.pollId },
        select: { pushToken: true, email: true },
      });
      // PollSubscribers don't have userId, handle separately
      return subs.length;
    }
    case "petition_milestone": {
      const petition = await prisma.petition.findUnique({ where: { id: event.petitionId } });
      if (petition) {
        recipients = [{ userId: petition.createdByUserId }];
      }
      break;
    }
    case "promise_updated": {
      const trackers = await prisma.promiseTracker.findMany({
        where: { promiseId: event.promiseId },
        select: { userId: true },
      });
      recipients = trackers;
      break;
    }
    case "emergency": {
      const profiles = await prisma.civicProfile.findMany({
        where: { notifyEmergency: true },
        select: { userId: true, pushToken: true },
      });
      recipients = profiles.filter((p): p is typeof p & { userId: string } => p.userId !== null); // Emergency overrides quiet hours
      break;
    }
  }

  // Queue notifications for each recipient
  for (const r of recipients) {
    await prisma.notificationLog.create({
      data: {
        userId: r.userId,
        campaignId: "system",
        title: getNotificationTitle(event),
        body: getNotificationBody(event),
        status: "pending",
      },
    });
  }

  return recipients.length;
}

function isQuietHours(start: number, end: number): boolean {
  const hour = new Date().getHours();
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

function getNotificationTitle(event: NotificationEvent): string {
  switch (event.type) {
    case "result_verified":
      return `Election Result: ${event.ward}`;
    case "poll_threshold":
      return "Poll Milestone";
    case "petition_milestone":
      return "Petition Update";
    case "promise_updated":
      return "Promise Status Update";
    case "event_reminder":
      return "Event Reminder";
    case "emergency":
      return "Emergency Alert";
  }
}

function getNotificationBody(event: NotificationEvent): string {
  switch (event.type) {
    case "result_verified":
      return `${event.candidateName} — ${event.votes} votes`;
    case "poll_threshold":
      return `Your poll crossed ${event.threshold} votes`;
    case "petition_milestone":
      return `${event.signatures} signatures collected`;
    case "promise_updated":
      return `Promise status changed to ${event.status}`;
    case "event_reminder":
      return "You have an upcoming event";
    case "emergency":
      return event.message;
  }
}
