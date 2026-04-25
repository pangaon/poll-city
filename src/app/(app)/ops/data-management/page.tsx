import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import DataManagementClient from "./data-management-client";

export const metadata = { title: "Data Management — Poll City Operator" };

export default async function DataManagementPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/dashboard");

  return <DataManagementClient />;
}
