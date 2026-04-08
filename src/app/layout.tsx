import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "sonner";
import PwaRegister from "@/components/pwa/pwa-register";
import Analytics from "@/components/tracking/analytics";

export const metadata: Metadata = {
  title: { default: "Poll City", template: "%s | Poll City" },
  description: "The civic operating system for Canadian democracy. Campaign management, voter engagement, election results, and civic intelligence.",
  metadataBase: new URL("https://www.poll.city"),
  alternates: { canonical: "https://www.poll.city" },
  keywords: ["campaign software Canada", "election results", "municipal elections 2026", "Ontario elections", "BC elections", "voter engagement", "canvassing app", "GOTV", "political campaign management"],
  manifest: "/manifest.json",
  openGraph: {
    title: "Poll City — The Civic Operating System for Canadian Democracy",
    description: "Campaign management, voter engagement, election results, and civic intelligence for Canadian campaigns.",
    siteName: "Poll City",
    images: [{ url: "/logo.png", alt: "Poll City logo" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Poll City — Canadian Democracy Platform",
    description: "Campaign management, voter engagement, election results, and civic intelligence.",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Poll City",
              "applicationCategory": "GovernmentApplication",
              "operatingSystem": "Web",
              "description": "The civic operating system for Canadian democracy. Campaign management, voter engagement, election results, and civic intelligence.",
              "url": "https://www.poll.city",
              "author": {
                "@type": "Organization",
                "name": "Poll City",
                "url": "https://www.poll.city"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "CAD",
                "description": "Free tier available"
              }
            }),
          }}
        />
        <meta name="msapplication-TileColor" content="#1e40af" />
        <meta name="msapplication-TileImage" content="/apple-touch-icon.png" />
      </head>
      <Analytics />
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
            <PwaRegister />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
