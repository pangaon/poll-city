import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "../globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "sonner";
import SocialNav from "@/components/social/social-nav";

export const metadata: Metadata = {
  title: { default: "Poll City Social", template: "%s | Poll City Social" },
  description: "Civic engagement, live polling, and your local representatives — all in one place.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Poll City Social" },
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
};

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-gray-50">
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
              <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6 text-sm font-medium text-gray-700">
                <Link href="/social" className="flex items-center gap-2 whitespace-nowrap">
                  <span className="font-bold text-lg text-blue-700 hover:text-blue-800 transition-colors">Poll City Social</span>
                  <span className="hidden sm:inline text-xs text-gray-400 font-normal">Civic engagement for Canadians</span>
                </Link>
                {/* Desktop nav links */}
                <div className="hidden md:flex items-center gap-6">
                  <Link href="/social/officials" className="hover:text-blue-700 transition-colors">Representatives</Link>
                  <Link href="/social/polls" className="hover:text-blue-700 transition-colors">Polls</Link>
                  <Link href="/social/groups" className="hover:text-blue-700 transition-colors">Groups</Link>
                  <Link href="/social/notifications" className="hover:text-blue-700 transition-colors">Alerts</Link>
                </div>
                <div className="hidden md:flex items-center gap-3">
                  <Link href="/" className="text-xs text-gray-500 hover:text-blue-700 transition-colors">Running for office?</Link>
                  <Link href="/social/profile" className="hover:text-blue-700 transition-colors">My Profile</Link>
                  <Link href="/login" className="bg-blue-700 text-white px-4 py-1.5 rounded-lg hover:bg-blue-800 transition-colors">
                    Login
                  </Link>
                </div>
                {/* Mobile: just show login */}
                <Link href="/login" className="md:hidden text-blue-700 font-medium">Login</Link>
              </nav>
            </header>

            <main className="flex-1 pb-20 md:pb-0">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>

            {/* Mobile-only bottom nav */}
            <SocialNav />
          </div>
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
