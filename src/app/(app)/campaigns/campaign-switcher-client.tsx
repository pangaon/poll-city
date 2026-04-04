"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface Props {
  campaignId: string;
  active: boolean;
}

export default function CampaignSwitcherClient({ campaignId, active }: Props) {
  const router = useRouter();
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
      if (!res.ok) throw new Error("Unable to switch campaigns");
      router.refresh();
      router.push("/");
    } catch (error) {
      console.error(error);
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
