import { Metadata } from "next";
import { validateDemoToken } from "@/lib/demo/validate-token";
import CandidateDemoClient from "./candidate-demo-client";

export const metadata: Metadata = { title: "Candidate Demo — Poll City" };

export default async function CandidateDemoPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";
  // Allow public access without a token. If a valid token is present, show personalised version.
  let prospectName: string | null = null;
  if (token) {
    const result = await validateDemoToken(token);
    if (result.valid) prospectName = result.prospectName ?? null;
  }

  return <CandidateDemoClient prospectName={prospectName} />;
}
