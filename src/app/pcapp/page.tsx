import type { Metadata } from "next";
import PcAppClient from "./pcapp-client";

export const metadata: Metadata = {
  title: "Poll City — Figma Prototype",
  robots: { index: false, follow: false },
};

export default function PcAppPage() {
  return <PcAppClient />;
}
