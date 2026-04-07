"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MockBanner,
  PriorityStrikeList,
  SummaryTiles,
  WarRoomHero,
} from "./war-room-sections";
import {
  MOCK_PRIORITY,
  MOCK_SUMMARY,
  PriorityContact,
  PriorityListResponse,
  SummaryResponse,
  buildPrecinctSnapshots,
} from "./war-room-types";
import { WarRoomMapPanel } from "./war-room-map";

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export default function GotvWarRoom({ campaignId }: { campaignId: string }) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [priorityList, setPriorityList] = useState<PriorityContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [mockReasons, setMockReasons] = useState<string[]>([]);
  const [busyContactId, setBusyContactId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const reasons: string[] = [];
    let usedMock = false;

    const summaryPromise = readJson<SummaryResponse>(`/api/gotv/summary?campaignId=${campaignId}`);
    const priorityPromise = readJson<PriorityListResponse>(`/api/gotv/priority-list?campaignId=${campaignId}`);

    const [summaryResult, priorityResult] = await Promise.allSettled([summaryPromise, priorityPromise]);

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value);
    } else {
      setSummary(MOCK_SUMMARY);
      usedMock = true;
      reasons.push("GET /api/gotv/summary unavailable");
    }

    if (priorityResult.status === "fulfilled" && Array.isArray(priorityResult.value.data)) {
      setPriorityList(priorityResult.value.data);
    } else {
      setPriorityList(MOCK_PRIORITY);
      usedMock = true;
      reasons.push("GET /api/gotv/priority-list unavailable");
    }

    setMockMode(usedMock);
    setMockReasons(reasons);
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      try {
        await loadDashboard();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    const timer = setInterval(() => {
      loadDashboard().catch(() => {
        // Silent refresh failure keeps current snapshot visible.
      });
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [loadDashboard]);

  const manualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
      toast.success("GOTV board refreshed");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboard]);

  const optimisticStrike = useCallback((contactId: string) => {
    setPriorityList((current) => current.filter((contact) => contact.id !== contactId));
    setSummary((current) => {
      if (!current) return current;
      return {
        ...current,
        supportersVoted: current.supportersVoted + 1,
        gap: Math.max(0, current.gap - 1),
        p1Count: Math.max(0, current.p1Count - 1),
      };
    });
  }, []);

  const postMarkVoted = useCallback(async (contactId: string) => {
    setBusyContactId(contactId);

    try {
      const markRes = await fetch("/api/gotv/mark-voted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, contactId }),
      });

      if (markRes.ok) {
        optimisticStrike(contactId);
        toast.success("Marked as voted");
        return;
      }

      const strikeRes = await fetch("/api/gotv/strike-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, contactId }),
      });

      if (strikeRes.ok) {
        optimisticStrike(contactId);
        toast.success("Struck off as voted");
        return;
      }

      if (mockMode) {
        optimisticStrike(contactId);
        toast.success("Mock strike-off applied");
      } else {
        toast.error("Unable to mark voter");
      }
    } catch {
      if (mockMode) {
        optimisticStrike(contactId);
        toast.success("Mock strike-off applied");
      } else {
        toast.error("Unable to mark voter");
      }
    } finally {
      setBusyContactId(null);
    }
  }, [campaignId, mockMode, optimisticStrike]);

  const postStrikeOff = useCallback(async (contactId: string) => {
    setBusyContactId(contactId);

    try {
      const response = await fetch("/api/gotv/strike-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, contactId }),
      });

      if (response.ok || mockMode) {
        optimisticStrike(contactId);
        toast.success(response.ok ? "Struck off" : "Mock strike-off applied");
      } else {
        toast.error("Strike-off failed");
      }
    } catch {
      if (mockMode) {
        optimisticStrike(contactId);
        toast.success("Mock strike-off applied");
      } else {
        toast.error("Strike-off failed");
      }
    } finally {
      setBusyContactId(null);
    }
  }, [campaignId, mockMode, optimisticStrike]);

  const progress = useMemo(() => {
    if (!summary || summary.confirmedSupporters === 0) return 0;
    return Math.round((summary.supportersVoted / summary.confirmedSupporters) * 100);
  }, [summary]);

  const precincts = useMemo(
    () => buildPrecinctSnapshots(summary, priorityList),
    [summary, priorityList],
  );

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <div className="h-36 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <WarRoomHero
        summary={summary}
        progress={progress}
        refreshing={refreshing}
        onRefresh={manualRefresh}
      />

      {mockMode && (
        <MockBanner mockReasons={mockReasons} />
      )}

      <SummaryTiles summary={summary} />

      <WarRoomMapPanel precincts={precincts} />

      <PriorityStrikeList
        contacts={priorityList}
        busyContactId={busyContactId}
        onMarkVoted={postMarkVoted}
        onStrikeOff={postStrikeOff}
      />
    </div>
  );
}
