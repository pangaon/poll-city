import type { Metadata } from "next";
import MarketingClient from "./marketing-client";

export const metadata: Metadata = {
  title: "Poll City — The Complete Political Operating System",
  description:
    "Win your Ontario or BC municipal election with Poll City. Campaign website, voter CRM, mobile canvassing, GOTV engine, and print marketplace all in one platform.",
  keywords: [
    "political campaign software",
    "municipal election platform Canada",
    "campaign CRM Ontario",
    "voter canvassing app",
    "Ontario election 2026",
    "BC election 2026",
    "campaign management software",
    "GOTV software Canada",
    "PIPEDA compliant campaign software",
  ],
  openGraph: {
    title: "Poll City — The Complete Political Operating System",
    description:
      "Win your Ontario or BC municipal election with Poll City. Campaign website, voter CRM, mobile canvassing, GOTV engine, and print marketplace all in one platform.",
    type: "website",
    locale: "en_CA",
    siteName: "Poll City",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Poll City" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Poll City — The Complete Political Operating System",
    description:
      "Win your Ontario or BC municipal election with Poll City. Campaign website, voter CRM, mobile canvassing, GOTV engine, and print marketplace all in one platform.",
    images: ["/logo.png"],
  },
  alternates: { canonical: "https://poll.city" },
};

export default function Page() {
  return <MarketingClient />;
}
