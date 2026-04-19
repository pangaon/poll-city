import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Image from "next/image";
import "../globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "sonner";
import SocialNav from "@/components/social/social-nav";

export const metadata: Metadata = {
  title: { default: "Poll City Social", template: "%s | Poll City Social" },
  description: "Civic engagement, live polling, and your local representatives — all in one place.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Poll City Social" },
};

export const viewport: Viewport = {
  themeColor: "#080D14",
  width: "device-width",
  initialScale: 1,
};

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased bg-[#F0F4F8] dark:bg-[#080D14] text-gray-900 dark:text-white transition-colors duration-200">
        {/* Theme init — runs before React, prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('pcs-theme')==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            {/* ── Top Header ── */}
            <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#080D14]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/[0.06]">
              <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
                {/* Brand */}
                <Link href="/social" className="flex items-center gap-2 flex-shrink-0">
                  <Image src="/logo.png" alt="Poll City" width={26} height={26} className="rounded-md" />
                  <div className="flex items-baseline gap-1">
                    <span className="font-black text-base tracking-tight text-gray-900 dark:text-white">
                      POLL CITY
                    </span>
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[#009B91] dark:text-[#00D4C8]">
                      SOCIAL
                    </span>
                  </div>
                </Link>

                {/* Right actions */}
                <div className="flex items-center gap-3">
                  <Link
                    href="/"
                    className="hidden sm:block text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
                  >
                    Campaign app →
                  </Link>
                  <Link
                    href="/login"
                    className="text-sm font-bold px-4 py-1.5 rounded-full bg-[#00D4C8] text-[#080D14] hover:bg-[#00BFB4] transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </header>

            <main className="flex-1 pb-24">
              {children}
            </main>

            <SocialNav />
          </div>
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
