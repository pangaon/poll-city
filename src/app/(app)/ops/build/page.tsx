import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import BuildClient from "./build-client";

export const metadata = { title: "Build Console — Poll City" };

export default async function BuildPage() {
  // SUPER_ADMIN is a user-level role (User.role), not a campaign membership role.
  // resolveActiveCampaign() returns membership.role — wrong source. Use session directly.
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "SUPER_ADMIN") redirect("/dashboard");

  return <BuildClient />;
}
