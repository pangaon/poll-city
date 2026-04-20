import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/helpers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { Role } from "@prisma/client";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { AppShellClient } from "@/components/app-shell-client";
import { AdoniChat } from "@/components/adoni";
import MobileNav from "@/components/layout/mobile-nav";
import DebugToolbarGate from "@/components/debug/debug-toolbar-gate";
import QaOverlayGate from "@/components/ops/qa-overlay-gate";
import CampaignTourGate from "@/components/onboarding/campaign-tour-gate";
import SetupWizardGate from "@/components/onboarding/setup-wizard-gate";
import { FounderBanner } from "@/components/layout/founder-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  // Show Exit banner when George (SUPER_ADMIN) is viewing a client campaign
  const fullSession = await getServerSession(authOptions);
  const u = fullSession?.user as typeof fullSession.user & { role?: Role; activeCampaignId?: string | null };
  let founderCampaignName: string | null = null;
  if (u?.role === Role.SUPER_ADMIN && u?.activeCampaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: u.activeCampaignId },
      select: { name: true },
    });
    founderCampaignName = campaign?.name ?? null;
  }

  return (
    <AppShellClient>
      <div className="flex flex-col h-dvh min-h-dvh md:h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
        {founderCampaignName && <FounderBanner campaignName={founderCampaignName} />}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar user={session.user} />
            <main className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-3 sm:p-4 md:p-6">{children}</div>
            </main>
            <MobileNav />
          </div>
        </div>
        <AdoniChat />
        <SetupWizardGate />
        <CampaignTourGate />
        <DebugToolbarGate />
        <QaOverlayGate />
      </div>
    </AppShellClient>
  );
}
