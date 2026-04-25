"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import CaptureClient from "./capture-client";

interface CaptureEvent {
  id: string;
  name: string;
  eventType: "advance_vote" | "election_day" | "custom";
  office: string;
  ward: string | null;
  municipality: string;
  requireDoubleEntry: boolean;
  allowPartialSubmit: boolean;
  candidates: { id: string; name: string; party: string | null; ballotOrder: number }[];
  locationCount: number;
}

export default function CaptureTabWrapper({ campaignId }: { campaignId: string }) {
  const { data: session } = useSession();
  const [events, setEvents] = useState<CaptureEvent[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/eday/capture-events?campaignId=${encodeURIComponent(campaignId)}`)
      .then((r) => (r.ok ? r.json() : { events: [], isManager: false }))
      .then((d: { events: CaptureEvent[]; isManager: boolean }) => {
        setEvents(d.events ?? []);
        setIsManager(d.isManager ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading || !session?.user) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm animate-pulse">
        Loading capture events…
      </div>
    );
  }

  return (
    <CaptureClient
      campaignId={campaignId}
      userId={session.user.id}
      initialEventId={null}
      initialEvents={events}
      isManager={isManager}
    />
  );
}
