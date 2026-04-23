import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import AdoniTrainerClient from "./adoni-trainer-client";

export const metadata = { title: "Adoni Training — Poll City Ops" };

export default async function AdoniTrainerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return <AdoniTrainerClient />;
}
