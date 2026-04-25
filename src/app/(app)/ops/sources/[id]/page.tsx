import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import SourceDetailClient from "./source-detail-client";

export const metadata = { title: "Source Detail — Poll City" };

export default async function SourceDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/dashboard");

  return <SourceDetailClient id={params.id} />;
}
