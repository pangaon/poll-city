import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/helpers";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { AppShellClient } from "@/components/app-shell-client";
import { AdoniChat } from "@/components/adoni";
import MobileNav from "@/components/layout/mobile-nav";
import DebugToolbarGate from "@/components/debug/debug-toolbar-gate";
import QaOverlayGate from "@/components/ops/qa-overlay-gate";
import CampaignTourGate from "@/components/onboarding/campaign-tour-gate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <AppShellClient>
      <div className="flex h-dvh min-h-dvh md:h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar user={session.user} />
          <main className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-3 sm:p-4 md:p-6">{children}</div>
          </main>
          <MobileNav />
        </div>
        <AdoniChat />
        <CampaignTourGate />
        <DebugToolbarGate />
        <QaOverlayGate />
      </div>
    </AppShellClient>
  );
}
