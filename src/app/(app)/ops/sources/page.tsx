import { redirect } from "next/navigation";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import SourceLibraryClient from "./source-library-client";

export const metadata = { title: "Master Source Library — Poll City" };

export default async function SourceLibraryPage() {
  const { role } = await resolveActiveCampaign();
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  return <SourceLibraryClient />;
}
