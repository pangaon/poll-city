import prisma from "@/lib/db/prisma";

export interface DemoTokenResult {
  valid: boolean;
  type?: string;
  prospectName?: string | null;
}

export async function validateDemoToken(token: string): Promise<DemoTokenResult> {
  if (!token) return { valid: false };

  const demo = await prisma.demoToken.findUnique({ where: { token } });
  if (!demo) return { valid: false };
  if (demo.expiresAt < new Date()) return { valid: false };

  // Increment view count (fire and forget)
  prisma.demoToken
    .update({
      where: { token },
      data: { views: { increment: 1 }, lastViewedAt: new Date() },
    })
    .catch(() => {});

  return { valid: true, type: demo.type, prospectName: demo.prospectName };
}
