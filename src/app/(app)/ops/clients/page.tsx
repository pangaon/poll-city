import { redirect } from "next/navigation";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import ClientsOpsClient from "./clients-ops-client";

export const metadata = { title: "Clients — Poll City Operator" };

export default async function ClientsOpsPage() {
  const { role } = await resolveActiveCampaign();
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  return <ClientsOpsClient />;
}
