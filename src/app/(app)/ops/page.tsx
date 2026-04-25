import type { Metadata } from "next";
import OpsTabsClient from "./ops-tabs-client";

export const metadata: Metadata = { title: "Operator Dashboard — Poll City" };

export default function OpsPage() {
  return <OpsTabsClient />;
}
