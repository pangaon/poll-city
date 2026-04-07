"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { Expand, GripVertical, MonitorUp, Shrink, Maximize2, Minimize2 } from "lucide-react";

const LiveInsightMap = dynamic(() => import("./live-insight-map"), { ssr: false });

type WidgetLayout = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  fullScreen: boolean;
  poppedOut: boolean;
  pinned: boolean;
};

type DashboardLayout = {
  widgets: WidgetLayout[];
  columns: number;
  theme: "light" | "dark" | "auto";
  density: "compact" | "comfortable" | "spacious";
};

type DashboardStudioProps = {
  campaignId: string;
  campaignName: string;
  popoutWidgetId?: string | null;
};

type DataState = {
  healthScore: number;
  grade: string;
  gap: number;
  supportersVoted: number;
  confirmedSupporters: number;
  winProbability: number;
};

const FALLBACK_DATA: DataState = {
  healthScore: 64,
  grade: "B",
  gap: 312,
  supportersVoted: 2334,
  confirmedSupporters: 4280,
  winProbability: 58,
};

function milestone(value: number) {
  if (value >= 1000) return 1000;
  if (value >= 500) return 500;
  if (value >= 200) return 200;
  if (value >= 100) return 100;
  return 0;
}

export default function DashboardStudio({ campaignId, campaignName, popoutWidgetId }: DashboardStudioProps) {
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [data, setData] = useState<DataState>(FALLBACK_DATA);
  const [fullScreenWidget, setFullScreenWidget] = useState<string | null>(null);
  const [milestoneValue, setMilestoneValue] = useState(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    const channel = new BroadcastChannel(`dashboard-live-${campaignId}`);
    channel.onmessage = (event) => {
      if (event.data?.type === "live:update") {
        setData(event.data.payload as DataState);
      }
    };
    return () => channel.close();
  }, [campaignId]);

  useEffect(() => {
    async function loadLayout() {
      const response = await fetch(`/api/dashboard/layout?campaignId=${campaignId}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      setLayout(payload.layout as DashboardLayout);
    }
    loadLayout();
  }, [campaignId]);

  useEffect(() => {
    async function pullData() {
      const [health, gotv, election] = await Promise.all([
        fetch(`/api/briefing/health-score?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
        fetch(`/api/gotv/summary?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
        fetch(`/api/election-night/live?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
      ]);

      const next = {
        healthScore: health?.healthScore ?? FALLBACK_DATA.healthScore,
        grade: health?.grade ?? FALLBACK_DATA.grade,
        gap: gotv?.gap ?? election?.gap ?? FALLBACK_DATA.gap,
        supportersVoted: gotv?.supportersVoted ?? election?.supportersVoted ?? FALLBACK_DATA.supportersVoted,
        confirmedSupporters: gotv?.confirmedSupporters ?? election?.confirmedSupporters ?? FALLBACK_DATA.confirmedSupporters,
        winProbability: election?.winProbability ?? FALLBACK_DATA.winProbability,
      };

      setData(next);
      const channel = new BroadcastChannel(`dashboard-live-${campaignId}`);
      channel.postMessage({ type: "live:update", payload: next });
      channel.close();
    }

    pullData();
    const timer = setInterval(pullData, 10000);
    return () => clearInterval(timer);
  }, [campaignId]);

  useEffect(() => {
    const m = milestone(data.supportersVoted);
    if (m > milestoneValue) setMilestoneValue(m);
  }, [data.supportersVoted, milestoneValue]);

  useEffect(() => {
    if (!layout) return;
    const timer = setTimeout(async () => {
      await fetch(`/api/dashboard/layout?campaignId=${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, layout }),
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [layout, campaignId]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !layout || active.id === over.id) return;
    const from = layout.widgets.findIndex((w) => w.id === active.id);
    const to = layout.widgets.findIndex((w) => w.id === over.id);
    if (from < 0 || to < 0) return;
    setLayout((current) => current ? { ...current, widgets: arrayMove(current.widgets, from, to) } : current);
  }

  function setWidgetWidth(id: string, delta: number) {
    setLayout((current) => {
      if (!current) return current;
      return {
        ...current,
        widgets: current.widgets.map((w) => w.id === id ? { ...w, w: Math.max(2, Math.min(12, w.w + delta)) } : w),
      };
    });
  }

  function popOutWidget(id: string) {
    const url = `/dashboard/widget?campaignId=${encodeURIComponent(campaignId)}&widget=${encodeURIComponent(id)}`;
    window.open(url, `_widget_${id}`, "width=900,height=700,resizable=yes");
    setLayout((current) => {
      if (!current) return current;
      return { ...current, widgets: current.widgets.map((w) => w.id === id ? { ...w, poppedOut: true } : w) };
    });
  }

  const orderedWidgets = useMemo(() => layout?.widgets.filter((w) => w.visible) ?? [], [layout]);
  const displayWidgets = useMemo(() => {
    if (!popoutWidgetId) return orderedWidgets;
    return orderedWidgets.filter((w) => w.id === popoutWidgetId);
  }, [orderedWidgets, popoutWidgetId]);

  if (!layout) {
    return <div className="h-80 animate-pulse rounded-xl bg-slate-200" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">{campaignName} Dashboard Studio</h1>
        <p className="text-sm text-slate-500">Drag, resize, fullscreen, and pop-out widgets for multi-screen war room setup.</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-12 gap-3">
            {displayWidgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                fullScreenWidget={fullScreenWidget}
                onFullScreen={(id) => setFullScreenWidget((current) => current === id ? null : id)}
                onPopOut={popOutWidget}
                onResize={setWidgetWidth}
              >
                <WidgetBody id={widget.id} campaignId={campaignId} data={data} milestoneValue={milestoneValue} />
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AnimatePresence>
        {fullScreenWidget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] overflow-auto bg-slate-950 p-6"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Widget Full Screen: {fullScreenWidget}</h2>
              <button
                type="button"
                onClick={() => setFullScreenWidget(null)}
                className="rounded-md border border-slate-500 px-3 py-1.5 text-xs font-semibold text-slate-100"
              >
                Exit Full Screen
              </button>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <WidgetBody id={fullScreenWidget} campaignId={campaignId} data={data} milestoneValue={milestoneValue} fullscreen />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableWidget({
  widget,
  children,
  onResize,
  onPopOut,
  onFullScreen,
  fullScreenWidget,
}: {
  widget: WidgetLayout;
  children: React.ReactNode;
  onResize: (id: string, delta: number) => void;
  onPopOut: (id: string) => void;
  onFullScreen: (id: string) => void;
  fullScreenWidget: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: widget.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${Math.max(2, Math.min(12, widget.w))}`,
  } as React.CSSProperties;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex items-center justify-between border-b border-slate-100 px-2 py-1.5">
        <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
          <button type="button" className="rounded p-1 hover:bg-slate-100" {...attributes} {...listeners}>
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          {widget.id}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="rounded p-1 hover:bg-slate-100" onClick={() => onResize(widget.id, -1)}><Minimize2 className="h-3.5 w-3.5" /></button>
          <button type="button" className="rounded p-1 hover:bg-slate-100" onClick={() => onResize(widget.id, +1)}><Maximize2 className="h-3.5 w-3.5" /></button>
          <button type="button" className="rounded p-1 hover:bg-slate-100" onClick={() => onPopOut(widget.id)}><MonitorUp className="h-3.5 w-3.5" /></button>
          <button type="button" className="rounded p-1 hover:bg-slate-100" onClick={() => onFullScreen(widget.id)}>
            {fullScreenWidget === widget.id ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>
      <div className="p-3">{children}</div>
    </motion.div>
  );
}

function WidgetBody({ id, campaignId, data, milestoneValue, fullscreen }: { id: string; campaignId: string; data: DataState; milestoneValue: number; fullscreen?: boolean }) {
  if (id === "map") return <LiveInsightMap campaignId={campaignId} />;
  if (id === "the-gap") {
    return (
      <motion.div
        key={`${id}-${data.gap}`}
        initial={{ y: -4, opacity: 0.9 }}
        animate={{ y: data.gap < 0 ? 8 : 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="space-y-1"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">The Gap</p>
        <motion.p
          className={fullscreen ? "text-[200px] font-black leading-none text-slate-900" : "text-6xl font-black leading-none text-slate-900"}
          animate={milestoneValue > 0 ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          {data.gap.toLocaleString()}
        </motion.p>
      </motion.div>
    );
  }
  if (id === "supporters" || id === "supporters-voted") {
    return (
      <motion.div
        key={`${id}-${data.supportersVoted}`}
        animate={milestoneValue > 0 ? { y: [0, -6, 0], boxShadow: ["0 0 0 rgba(34,197,94,0)", "0 0 25px rgba(34,197,94,0.35)", "0 0 0 rgba(34,197,94,0)"] } : { y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="rounded-lg bg-slate-50 p-3"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supporters Voted</p>
        <p className="text-4xl font-black text-slate-900">{data.supportersVoted.toLocaleString()}</p>
      </motion.div>
    );
  }
  if (id === "health-score") {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Health Score</p>
        <p className="text-4xl font-black text-slate-900">{data.healthScore}</p>
        <p className="text-sm font-semibold text-slate-600">Grade {data.grade}</p>
      </div>
    );
  }
  if (id === "quick-actions") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Call P1", href: "/gotv" },
          { label: "Smart Plan", href: `/api/canvassing/smart-plan?campaignId=${campaignId}&volunteers=4` },
          { label: "Election Night", href: "/election-night" },
          { label: "Briefing", href: "/briefing" },
        ].map((btn) => (
          <a key={btn.label} href={btn.href} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700 transition hover:scale-[1.02] hover:bg-slate-100">
            {btn.label}
          </a>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
      <p className="font-semibold">{id}</p>
      <p className="text-xs text-slate-500">Widget active. Drag, resize, fullscreen, or pop out.</p>
    </div>
  );
}
