import { redirect } from "next/navigation";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import SourceDetailClient from "./source-detail-client";

export const metadata = { title: "Source Detail — Poll City" };

export default async function SourceDetailPage({ params }: { params: { id: string } }) {
  const { role } = await resolveActiveCampaign();
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  return <SourceDetailClient id={params.id} />;
}
