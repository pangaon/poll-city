import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import OfficialsOpsClient from "./officials-ops-client";

export const metadata: Metadata = { title: "Officials Directory — Poll City Ops" };

export default async function OfficialsOpsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/dashboard");
  return <OfficialsOpsClient />;
}
