import { Metadata } from "next";
import { validateDemoToken } from "@/lib/demo/validate-token";
import MediaDemoClient from "./media-demo-client";

export const metadata: Metadata = { title: "Election Night Demo — Poll City" };

export default async function MediaDemoPage({
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

  return <MediaDemoClient prospectName={prospectName} />;
}
