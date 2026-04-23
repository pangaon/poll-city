import { redirect } from "next/navigation";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PacksManagementClient from "./packs-management-client";

export const metadata = { title: "Source Packs — Poll City" };

export default async function SourcePacksPage() {
  const { role } = await resolveActiveCampaign();
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  return <PacksManagementClient />;
}
