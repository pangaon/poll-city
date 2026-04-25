import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import CandidatesOpsClient from "./candidates-ops-client";

export const metadata: Metadata = { title: "Candidates Intelligence — Poll City Ops" };

export default async function CandidatesOpsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/dashboard");
  return <CandidatesOpsClient />;
}
