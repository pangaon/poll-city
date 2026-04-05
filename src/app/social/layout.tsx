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
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Poll City" },
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-gray-50">
        <AuthProvider>
          <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white shadow-sm">
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
              <nav className="px-4 py-3 flex items-center justify-between gap-2 text-sm font-medium text-gray-700 overflow-x-auto">
                <Link href="/social/officials" className="whitespace-nowrap hover:text-blue-700 transition-colors">
                  Find Officials
                </Link>
                <Link href="/social/polls" className="whitespace-nowrap hover:text-blue-700 transition-colors">
                  Polls
                </Link>
                <Link href="/social/profile" className="whitespace-nowrap hover:text-blue-700 transition-colors">
                  My Profile
                </Link>
                <Link href="/login" className="whitespace-nowrap hover:text-blue-700 transition-colors">
                  Login
                </Link>
              </nav>
            </header>
            <main className="flex-1 pb-20">{children}</main>
            <SocialNav />
          </div>
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
