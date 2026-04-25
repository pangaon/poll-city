import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import SourceLibraryClient from "./source-library-client";

export const metadata = { title: "Master Source Library — Poll City" };

export default async function SourceLibraryPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/dashboard");

  return <SourceLibraryClient />;
}
