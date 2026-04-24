import prisma from "@/lib/db/prisma";
import VendorDirectoryClient from "./vendor-directory-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vendor Network — Poll City" };

export default async function VendorNetworkPage() {
  const total = await prisma.vendor.count({ where: { isActive: true } });
  return <VendorDirectoryClient initialTotal={total} />;
}
