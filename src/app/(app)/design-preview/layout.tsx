import { getSession } from "@/lib/auth/helpers";
import { redirect } from "next/navigation";

export default async function DesignPreviewLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return <>{children}</>;
}
