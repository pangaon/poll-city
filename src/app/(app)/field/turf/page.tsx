import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import TurfClient from "./turf-client";

export const metadata = { title: "Turf Management — Poll City" };

export default async function FieldTurfPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const [turfs, programs, memberships, wardData] = await Promise.all([
    // All turfs with assignment info and stop counts
    prisma.turf.findMany({
      where: { campaignId },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        assignedVolunteer: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        assignedGroup: { select: { id: true, name: true } },
        _count: { select: { stops: true, routes: true, fieldShifts: true } },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),

    // Active programs for the create drawer
    prisma.fieldProgram.findMany({
      where: { campaignId, deletedAt: null, status: { in: ["planning", "active"] } },
      select: { id: true, name: true, programType: true },
      orderBy: { name: "asc" },
    }),

    // Team members for assignment
    prisma.membership.findMany({
      where: { campaignId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),

    // Poll/ward density from contacts
    prisma.contact.groupBy({
      by: ["municipalPoll", "ward"],
      where: { campaignId, deletedAt: null, municipalPoll: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  const density = wardData.map((d) => ({
    poll: d.municipalPoll!,
    ward: d.ward ?? null,
    contactCount: d._count.id,
  }));

  const teamMembers = memberships.map((m) => m.user);

  return (
    <TurfClient
      campaignId={campaignId}
      campaignName={campaignName}
      initialTurfs={turfs}
      programs={programs}
      teamMembers={teamMembers}
      density={density}
    />
  );
}
