import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import ClientsOpsClient from "./clients-ops-client";

export const metadata = { title: "Clients — Poll City Operator" };

export default async function ClientsOpsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/dashboard");

  return <ClientsOpsClient />;
}
