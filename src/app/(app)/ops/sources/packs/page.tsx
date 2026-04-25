import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import PacksManagementClient from "./packs-management-client";

export const metadata = { title: "Source Packs — Poll City" };

export default async function SourcePacksPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/dashboard");

  return <PacksManagementClient />;
}
