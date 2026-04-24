import { redirect } from "next/navigation";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import DataManagementClient from "./data-management-client";

export const metadata = { title: "Data Management — Poll City Operator" };

export default async function DataManagementPage() {
  const { role } = await resolveActiveCampaign();
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  return <DataManagementClient />;
}
