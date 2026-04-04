import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import BillingClient from "./billing-client";

export default async function BillingPage() {
  const { userId } = await resolveActiveCampaign();

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, createdAt: true },
  });

  return (
    <BillingClient
      subscription={subscription}
      userEmail={user?.email || ""}
      userCreatedAt={user?.createdAt || new Date()}
    />
  );
}