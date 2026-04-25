import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import ContentReviewClient from "./content-review-client";

export const metadata = { title: "Content Review — Poll City" };

export default async function ContentReviewPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/dashboard");

  const [pendingCount, items] = await Promise.all([
    prisma.autonomousContent.count({ where: { status: "pending" } }),
    prisma.autonomousContent.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        source: { select: { name: true, geography: true } },
      },
    }),
  ]);

  const rows = items.map((item) => ({
    id: item.id,
    sourceName: item.source.name,
    sourceGeography: item.source.geography ?? "unknown",
    headline: item.headline,
    sourceUrl: item.sourceUrl,
    extractedPoll: item.extractedPoll as Record<string, unknown> | null,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
  }));

  return <ContentReviewClient pendingCount={pendingCount} initialItems={rows} />;
}
