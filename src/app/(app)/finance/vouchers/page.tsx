import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import VouchersClient from "./vouchers-client";

export const metadata = { title: "Vouchers" };

export default async function VouchersPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <VouchersClient campaignId={campaignId} />;
}
