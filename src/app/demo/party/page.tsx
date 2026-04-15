import { Metadata } from "next";
import { validateDemoToken } from "@/lib/demo/validate-token";
import PartyDemoClient from "./party-demo-client";

export const metadata: Metadata = { title: "Party Demo — Poll City" };

export default async function PartyDemoPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";
  let prospectName: string | null = null;
  if (token) {
    const result = await validateDemoToken(token);
    if (result.valid) prospectName = result.prospectName ?? null;
  }

  return <PartyDemoClient prospectName={prospectName} />;
}
