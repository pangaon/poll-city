import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import VendorProfileClient from "./vendor-profile-client";

export const metadata = { title: "Vendor Profile — Poll City" };

export default async function VendorProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: params.id, isActive: true },
    select: {
      id: true,
      name: true,
      contactName: true,
      email: true,
      phone: true,
      website: true,
      bio: true,
      categories: true,
      provincesServed: true,
      serviceAreas: true,
      tags: true,
      isVerified: true,
      isFeatured: true,
      rating: true,
      reviewCount: true,
      logoUrl: true,
      portfolioUrls: true,
      avgResponseHours: true,
      yearsExperience: true,
      rateFrom: true,
      createdAt: true,
    },
  });

  if (!vendor) notFound();

  return (
    <VendorProfileClient
      vendor={{ ...vendor, createdAt: vendor.createdAt.toISOString() }}
    />
  );
}
