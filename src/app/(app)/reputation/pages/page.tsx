import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import ResponsePagesClient from "./response-pages-client";

export const metadata = { title: "Response Pages — Poll City" };

export default async function ResponsePagesPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <ResponsePagesClient campaignId={campaignId} />;
}
