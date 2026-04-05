"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui";

interface Props {
  campaignId: string;
  active: boolean;
}

export default function CampaignSwitcherClient({ campaignId, active }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [loading, setLoading] = useState(false);

  async function switchCampaign() {
    if (active) return;
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Unable to switch campaigns");

      // Keep session and server state aligned immediately after switch.
      await update({ activeCampaignId: campaignId });

      router.refresh();
      router.push("/dashboard");
      toast.success(payload?.data?.message ?? "Campaign switched");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to switch campaigns");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={active ? "secondary" : "default"} onClick={switchCampaign} disabled={active || loading}>
      {active ? "Active" : loading ? "Switching…" : "Switch"}
    </Button>
  );
}
