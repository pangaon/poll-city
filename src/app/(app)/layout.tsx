import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/helpers";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { AppShellClient } from "@/components/app-shell-client";
import AdoniButton from "@/components/ai/adoni";
import MobileNav from "@/components/layout/mobile-nav";
import DebugToolbarGate from "@/components/debug/debug-toolbar-gate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <AppShellClient>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar user={session.user} />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">{children}</div>
          </main>
          <MobileNav />
        </div>
        <AdoniButton />
        <DebugToolbarGate />
      </div>
    </AppShellClient>
  );
}
