import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import ContactsClient from "./contacts-client";
import { ErrorBoundary } from "@/components/error-boundary";
export const metadata = { title: "Contacts — Poll City" };

export default async function ContactsPage() {
  const { campaignId, role } = await resolveActiveCampaign();
  const [tags, teamMembers] = await Promise.all([
    prisma.tag.findMany({ where: { campaignId }, orderBy: { name: "asc" } }),
    prisma.membership.findMany({
      where: { campaignId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);
  return (
    <ErrorBoundary
      resetKeys={[campaignId]}
      fallback={
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Contacts view failed to render</p>
          <p className="text-xs text-amber-800 mt-1">Try refreshing this page. If the issue persists, reopen the campaign context.</p>
        </div>
      }
    >
      <ContactsClient
        campaignId={campaignId}
        campaignName=""
        tags={tags}
        teamMembers={teamMembers.map(m => m.user)}
        userRole={role}
      />
    </ErrorBoundary>
  );
}
