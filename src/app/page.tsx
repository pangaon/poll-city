import type { Metadata } from "next";
import MarketingClient from "./marketing-client";

export const metadata: Metadata = {
  title: "Poll City — The Complete Political Operating System",
  description:
    "Win your election with the only platform that connects your campaign operations, voter engagement, and campaign materials in one place. Used by candidates across Ontario.",
  keywords: [
    "political campaign software",
    "municipal election platform",
    "campaign CRM",
    "voter canvassing app",
    "Ontario election 2026",
    "campaign management",
    "GOTV software",
  ],
  openGraph: {
    title: "Poll City — The Complete Political Operating System",
    description:
      "Win your election with the only platform that connects your campaign operations, voter engagement, and campaign materials in one place.",
    type: "website",
    locale: "en_CA",
    siteName: "Poll City",
  },
  twitter: {
    card: "summary_large_image",
    title: "Poll City — The Complete Political Operating System",
    description:
      "Win your election with the only platform that connects campaign operations, voter engagement, and campaign materials.",
  },
};

export default function Page() {
  return <MarketingClient />;
}
