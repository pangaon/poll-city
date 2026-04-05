import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "sonner";
import PwaRegister from "@/components/pwa/pwa-register";

export const metadata: Metadata = {
  title: { default: "Poll City", template: "%s | Poll City" },
  description: "Campaign operations and voter engagement platform",
  metadataBase: new URL("https://poll.city"),
  manifest: "/manifest.json",
  openGraph: {
    title: "Poll City",
    description: "Campaign operations and voter engagement platform",
    images: [{ url: "/logo.png", alt: "Poll City logo" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Poll City",
    description: "Campaign operations and voter engagement platform",
    images: ["/logo.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Poll City",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1e40af",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <head>
        <meta name="application-name" content="Poll City" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Poll City" />
        <meta property="og:image" content="/logo.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="msapplication-TileColor" content="#1e40af" />
        <meta name="msapplication-TileImage" content="/apple-touch-icon.png" />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
          <PwaRegister />
        </AuthProvider>
      </body>
    </html>
  );
}
