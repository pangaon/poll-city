import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import IntelClient from "./intel-client";

export const metadata = { title: "Candidate Intelligence — Poll City" };

export default async function IntelPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as typeof session.user & { role?: string };
  if (user?.role !== "SUPER_ADMIN") redirect("/dashboard");

  return <IntelClient />;
}
