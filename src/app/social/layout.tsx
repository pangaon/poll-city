import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "sonner";
import SocialNav from "@/components/social/social-nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
      <body className={`${inter.variable} font-sans antialiased bg-gray-50`}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white shadow-sm">
            <main className="flex-1 pb-20">{children}</main>
            <SocialNav />
          </div>
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
