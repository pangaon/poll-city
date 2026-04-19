import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import SocialOpsClient from "./social-ops-client";

export const metadata = { title: "Social Officials | Ops" };
export const dynamic = "force-dynamic";

export default async function SocialOpsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return <SocialOpsClient />;
}
