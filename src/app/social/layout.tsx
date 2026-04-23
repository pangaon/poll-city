import type { Metadata, Viewport } from "next";
import SocialNav from "@/components/social/social-nav";
import PCSHeader from "@/components/social/pcs-header";
import PCSLeftSidebar from "@/components/social/pcs-left-sidebar";
import PCSRightRail from "@/components/social/pcs-right-rail";

export const metadata: Metadata = {
  title: { default: "Poll City Social", template: "%s | Poll City Social" },
  description:
    "Civic engagement, live polling, and your local representatives — all in one place.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Poll City Social",
  },
};

export const viewport: Viewport = {
  themeColor: "#080D14",
  width: "device-width",
  initialScale: 1,
};

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      id="pcs-root"
      className="dark min-h-screen bg-[#F0F4F8] dark:bg-[#080D14] text-gray-900 dark:text-white transition-colors duration-200"
    >
      {/* Runs before React hydration — removes dark if user chose light */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var t=localStorage.getItem('pcs-theme');var el=document.getElementById('pcs-root');if(el){if(t==='light'){el.classList.remove('dark')}else{el.classList.add('dark')}}}catch(e){}`,
        }}
      />

      <PCSHeader />

      {/* 3-column shell — centres at 1400px, left/right sidebars hidden on small screens */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 pt-[57px]">
        <div className="flex gap-4 lg:gap-6">
          {/* ── Left sidebar ── */}
          <aside className="hidden lg:flex flex-col w-[240px] xl:w-[256px] flex-shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto py-4 scrollbar-hide">
            <PCSLeftSidebar />
          </aside>

          {/* ── Main feed / page content ── */}
          <main className="flex-1 min-w-0 py-3 pb-24 md:pb-8">
            {children}
          </main>

          {/* ── Right rail ── */}
          <aside className="hidden xl:flex flex-col w-[280px] 2xl:w-[300px] flex-shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto py-4 space-y-4 scrollbar-hide">
            <PCSRightRail />
          </aside>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <SocialNav />
    </div>
  );
}
