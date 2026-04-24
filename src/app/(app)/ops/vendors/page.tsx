import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import VendorsOpsClient from "./vendors-ops-client";

export const metadata = { title: "Vendor Network — Poll City Ops" };

export default async function VendorsOpsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return <VendorsOpsClient />;
}
