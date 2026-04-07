import prisma from "@/lib/db/prisma";

export const CIVIC_CREDITS = {
  CREATE_PROFILE: 25,
  COMPLETE_PROFILE: 50,
  VERIFY_PHONE: 25,
  VOTE_IN_POLL: 5,
  SIGN_PETITION: 10,
  CREATE_PETITION: 50,
  ATTEND_EVENT: 50,
  JOIN_CAMPAIGN: 100,
  KNOCK_50_DOORS: 100,
  TRACK_PROMISE: 10,
  VOTED_MUNICIPAL: 100,
  VOTED_PROVINCIAL: 150,
  VOTED_FEDERAL: 200,
} as const;

const BADGE_THRESHOLDS: Record<string, number> = {
  first_steps: 100,
  civic_contributor: 500,
  democracy_champion: 2000,
};

export async function awardCivicCredits(
  userId: string,
  action: keyof typeof CIVIC_CREDITS,
  description: string
): Promise<{ credits: number; newBadges: string[] }> {
  const credits = CIVIC_CREDITS[action];

  await prisma.civicCredit.create({
    data: { userId, action, credits, description },
  });

  // Update profile total
  const profile = await prisma.civicProfile.findUnique({ where: { userId } });
  const newTotal = (profile?.civicCredits ?? 0) + credits;

  if (profile) {
    await prisma.civicProfile.update({
      where: { userId },
      data: { civicCredits: newTotal },
    });
  }

  // Update passport
  await prisma.voterPassport.upsert({
    where: { userId },
    create: { userId, credits: newTotal },
    update: { credits: newTotal },
  });

  // Check badges
  const passport = await prisma.voterPassport.findUnique({ where: { userId } });
  const existingBadges = passport?.badges ?? [];
  const newBadges: string[] = [];

  for (const [badge, threshold] of Object.entries(BADGE_THRESHOLDS)) {
    if (newTotal >= threshold && !existingBadges.includes(badge)) {
      newBadges.push(badge);
    }
  }

  if (newBadges.length > 0) {
    await prisma.voterPassport.update({
      where: { userId },
      data: { badges: [...existingBadges, ...newBadges] },
    });
  }

  return { credits, newBadges };
}
