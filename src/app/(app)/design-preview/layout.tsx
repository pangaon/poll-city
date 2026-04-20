import { getSession } from "@/lib/auth/helpers";
import { redirect } from "next/navigation";

export default async function DesignPreviewLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");
  // Escape the app shell (sidebar + topbar + padding) — full-screen overlay
  return (
    <div className="fixed inset-0 z-[999] bg-black overflow-auto">
      {children}
    </div>
  );
}
