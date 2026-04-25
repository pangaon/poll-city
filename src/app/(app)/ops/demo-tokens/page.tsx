import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import DemoTokensClient from "./demo-tokens-client";

export const metadata = { title: "Demo Tokens — Poll City" };

export default async function DemoTokensPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/dashboard");

  const tokens = await prisma.demoToken.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows = tokens.map((t) => ({
    id: t.id,
    token: t.token,
    type: t.type,
    prospectName: t.prospectName,
    prospectEmail: t.prospectEmail,
    views: t.views,
    lastViewedAt: t.lastViewedAt ? t.lastViewedAt.toISOString() : null,
    expiresAt: t.expiresAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    expired: t.expiresAt < new Date(),
  }));

  return <DemoTokensClient tokens={rows} />;
}
