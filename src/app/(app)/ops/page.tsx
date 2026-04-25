import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import OpsTabsClient from "./ops-tabs-client";

export const metadata: Metadata = { title: "Operator Dashboard — Poll City" };

export default async function OpsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/dashboard");
  return <OpsTabsClient />;
}
