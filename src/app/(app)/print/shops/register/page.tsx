import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PrintShopRegisterClient from "./register-client";

export const metadata = { title: "Register Your Print Shop — Poll City Print" };

export default async function ShopRegisterPage() {
  await resolveActiveCampaign();
  return <PrintShopRegisterClient />;
}
