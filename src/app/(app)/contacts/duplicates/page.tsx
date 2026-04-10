import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import DuplicatesClient from "./duplicates-client";

export const metadata = { title: "Duplicate Contacts — Poll City" };

export default async function DuplicatesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { campaignId } = await resolveActiveCampaign();

  const [rawDuplicates, total] = await Promise.all([
    prisma.duplicateCandidate.findMany({
      where: { campaignId, decision: "pending" },
      orderBy: [{ confidenceScore: "desc" }, { createdAt: "asc" }],
      take: 50,
      include: {
        contactA: {
          select: {
            id: true, firstName: true, lastName: true,
            email: true, phone: true, address1: true, city: true,
            ward: true, supportLevel: true, createdAt: true,
            _count: { select: { interactions: true, donations: true } },
          },
        },
        contactB: {
          select: {
            id: true, firstName: true, lastName: true,
            email: true, phone: true, address1: true, city: true,
            ward: true, supportLevel: true, createdAt: true,
            _count: { select: { interactions: true, donations: true } },
          },
        },
      },
    }),
    prisma.duplicateCandidate.count({ where: { campaignId, decision: "pending" } }),
  ]);

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId } },
    select: { role: true },
  });

  const isAdmin = membership?.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  // Serialize: pick only the fields DuplicateRow needs, converting enums → string and dates → ISO string
  const duplicates = rawDuplicates.map((d) => ({
    id: d.id,
    confidence: d.confidence as string,
    signals: d.signals,
    decision: d.decision as string,
    contactA: { ...d.contactA, supportLevel: d.contactA.supportLevel as string, createdAt: d.contactA.createdAt.toISOString() },
    contactB: { ...d.contactB, supportLevel: d.contactB.supportLevel as string, createdAt: d.contactB.createdAt.toISOString() },
  }));

  return (
    <DuplicatesClient
      campaignId={campaignId}
      initialDuplicates={duplicates}
      total={total}
      isAdmin={isAdmin}
    />
  );
}
