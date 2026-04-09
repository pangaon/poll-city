import { redirect } from "next/navigation";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import BuildClient from "./build-client";

export const metadata = { title: "Build Console — Poll City" };

export default async function BuildPage() {
  const { role } = await resolveActiveCampaign();
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  return <BuildClient />;
}
