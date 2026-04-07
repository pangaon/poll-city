"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, animate, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Expand,
  Filter,
  GripVertical,
  ListTodo,
  Maximize2,
  Minimize2,
  MonitorUp,
  Shrink,
  Sparkles,
  Trophy,
} from "lucide-react";
import AnimatedNumber from "./animated-number";

const LiveInsightMap = dynamic(() => import("./live-insight-map"), { ssr: false });

const CHANNEL = "poll-city";
const BRAND_NAVY = "#0A2342";
const MILESTONES = [100, 200, 500, 1000, 2000];

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
  isPopout?: boolean;
};

type DataState = {
  healthScore: number;
  grade: string;
  gap: number;
  supportersVoted: number;
  confirmedSupporters: number;
  winProbability: number;
  supporterTurnout: number;
  doorsWoWChange: number;
  volunteerTopPerformer: string;
  volunteerTopScore: number;
};

type VolunteerRow = {
  userId: string;
  name: string;
  doorsTotal: number;
  doorsThisWeek: number;
  conversionRate: number;
};

type PriorityItem = {
  action: string;
  why: string;
  link: string;
};

type UpcomingEventItem = {
  id: string;
  name: string;
  date: string;
  location: string | null;
};

type WidgetDataState = {
  leaderboard: VolunteerRow[];
  priorities: PriorityItem[];
  upcomingEvents: UpcomingEventItem[];
  overdueTasks: number;
  doorsThisWeek: number;
  doorsLastWeek: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  p4Count: number;
};

const FALLBACK_DATA: DataState = {
  healthScore: 64,
  grade: "B",
  gap: 312,
  supportersVoted: 2334,
  confirmedSupporters: 4280,
  winProbability: 58,
  supporterTurnout: 55,
  doorsWoWChange: 8,
  volunteerTopPerformer: "Campaign Team",
  volunteerTopScore: 73,
};

export default function DashboardStudio({ campaignId, campaignName, popoutWidgetId, isPopout }: DashboardStudioProps) {
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [data, setData] = useState<DataState>(FALLBACK_DATA);
  const [fullScreenWidget, setFullScreenWidget] = useState<string | null>(null);
  const [projectionDark, setProjectionDark] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [latestMilestone, setLatestMilestone] = useState<number | null>(null);
  const [widgetData, setWidgetData] = useState<WidgetDataState>({
    leaderboard: [],
    priorities: [],
    upcomingEvents: [],
    overdueTasks: 0,
    doorsThisWeek: 0,
    doorsLastWeek: 0,
    p1Count: 0,
    p2Count: 0,
    p3Count: 0,
    p4Count: 0,
  });
  const previousSupporters = useRef(FALLBACK_DATA.supportersVoted);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.type === "live:update" && event.data?.campaignId === campaignId) {
        setData(event.data.payload as DataState);
      }
      if (event.data?.type === "layout:update" && event.data?.campaignId === campaignId) {
        setLayout(event.data.layout as DashboardLayout);
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
      const [health, gotv, election, morning, volunteers] = await Promise.all([
        fetch(`/api/briefing/health-score?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
        fetch(`/api/gotv/summary?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
        fetch(`/api/election-night/live?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
        fetch(`/api/briefing/morning?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
        fetch(`/api/volunteers/performance?campaignId=${campaignId}`).then((r) => r.ok ? r.json() : null),
      ]);

      const volunteerRows = (volunteers?.leaderboard ?? volunteers?.data ?? []) as VolunteerRow[];
      const topVolunteer = volunteerRows[0];
      const next: DataState = {
        healthScore: health?.healthScore ?? FALLBACK_DATA.healthScore,
        grade: health?.grade ?? FALLBACK_DATA.grade,
        gap: gotv?.gap ?? election?.gap ?? FALLBACK_DATA.gap,
        supportersVoted: gotv?.supportersVoted ?? election?.supportersVoted ?? FALLBACK_DATA.supportersVoted,
        confirmedSupporters: gotv?.confirmedSupporters ?? election?.confirmedSupporters ?? FALLBACK_DATA.confirmedSupporters,
        winProbability: election?.winProbability ?? FALLBACK_DATA.winProbability,
        supporterTurnout: gotv?.percentComplete ?? election?.supporterTurnout ?? FALLBACK_DATA.supporterTurnout,
        doorsWoWChange: morning?.trends?.doorsWoWChange ?? FALLBACK_DATA.doorsWoWChange,
        volunteerTopPerformer: topVolunteer?.name ?? FALLBACK_DATA.volunteerTopPerformer,
        volunteerTopScore: topVolunteer?.doorsTotal ?? FALLBACK_DATA.volunteerTopScore,
      };

      const hitMilestone = MILESTONES.find(
        (m) => previousSupporters.current < m && next.supportersVoted >= m,
      );
      if (hitMilestone) {
        setLatestMilestone(hitMilestone);
        setCelebrating(true);
        window.setTimeout(() => setCelebrating(false), 1200);
      }
      previousSupporters.current = next.supportersVoted;

      setData(next);
      setWidgetData({
        leaderboard: volunteerRows.slice(0, 5),
        priorities: (morning?.priorities ?? []).slice(0, 3),
        upcomingEvents: (morning?.upcomingEvents ?? []).slice(0, 3),
        overdueTasks: Number(morning?.overdueTasks ?? 0),
        doorsThisWeek: Number(morning?.trends?.doorsThisWeek ?? 0),
        doorsLastWeek: Number(morning?.trends?.doorsLastWeek ?? 0),
        p1Count: Number(gotv?.p1Count ?? 0),
        p2Count: Number(gotv?.p2Count ?? 0),
        p3Count: Number(gotv?.p3Count ?? 0),
        p4Count: Number(gotv?.p4Count ?? 0),
      });
      const channel = new BroadcastChannel(CHANNEL);
      channel.postMessage({ type: "live:update", campaignId, payload: next });
      channel.close();
    }

    pullData();
    const timer = setInterval(pullData, 10000);
    return () => clearInterval(timer);
  }, [campaignId]);

  useEffect(() => {
    if (!layout) return;
    const timer = setTimeout(async () => {
      await fetch(`/api/dashboard/layout?campaignId=${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, layout }),
      });
      const channel = new BroadcastChannel(CHANNEL);
      channel.postMessage({ type: "layout:update", campaignId, layout });
      channel.close();
    }, 220);
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
        widgets: current.widgets.map((w) =>
          w.id === id ? { ...w, w: Math.max(2, Math.min(12, w.w + delta)) } : w,
        ),
      };
    });
  }

  function popOutWidget(id: string) {
    const url = `/widgets/${encodeURIComponent(id)}?campaignId=${encodeURIComponent(campaignId)}`;
    window.open(url, id, "width=860,height=640,resizable=yes");
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ type: "init", campaignId, state: data, layout });
    channel.close();
    setLayout((current) => {
      if (!current) return current;
      return {
        ...current,
        widgets: current.widgets.map((w) =>
          w.id === id ? { ...w, poppedOut: true } : w,
        ),
      };
    });
  }

  const orderedWidgets = useMemo(() => layout?.widgets.filter((w) => w.visible) ?? [], [layout]);
  const displayWidgets = useMemo(() => {
    if (!popoutWidgetId) return orderedWidgets;
    return orderedWidgets.filter((w) => w.id === popoutWidgetId);
  }, [orderedWidgets, popoutWidgetId]);

  if (!layout) {
    return (
      <div className="space-y-3">
        <Skeleton height={76} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Skeleton height={92} />
          <Skeleton height={92} />
          <Skeleton height={92} />
          <Skeleton height={92} />
        </div>
        <Skeleton height={320} />
      </div>
    );
  }

  if (displayWidgets.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <Sparkles className="mx-auto h-10 w-10 text-slate-400" />
        </motion.div>
        <h2 className="mt-3 text-xl font-black text-slate-900">Your dashboard is empty</h2>
        <p className="mt-1 text-sm text-slate-500">Bring widgets back and shape this board for your campaign style.</p>
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          type="button"
          onClick={() => setLayout((current) => current ? { ...current, widgets: current.widgets.map((w) => ({ ...w, visible: true })) } : current)}
          className="mt-4 rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700"
        >
          Restore Widgets
        </motion.button>
        <p className="mt-2 text-xs text-slate-400">Ask Adoni for a layout suggestion.</p>
      </div>
    );
  }

  return (
    <div className={projectionDark ? "space-y-4 bg-slate-950 p-3 text-slate-100" : "space-y-4"}>
      {!isPopout && (
        <div className={projectionDark ? "rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-sm" : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm"}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className={projectionDark ? "text-2xl font-black text-white" : "text-2xl font-black text-slate-900"}>{campaignName} Dashboard Studio</h1>
              <p className={projectionDark ? "text-sm text-slate-300" : "text-sm text-slate-500"}>Drag, resize, fullscreen, pop-out, and project across multiple screens.</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              type="button"
              onClick={() => setProjectionDark((v) => !v)}
              className={projectionDark ? "rounded-md border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-xs font-bold text-cyan-100" : "rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"}
            >
              {projectionDark ? "Projection Dark: ON" : "Projection Dark: OFF"}
            </motion.button>
          </div>
        </div>
      )}

      <motion.div
        animate={celebrating ? { y: [0, -12, -8, -10, 0] } : { y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={projectionDark ? "grid grid-cols-2 gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 md:grid-cols-4" : "grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-4"}
      >
        <MomentumBox title="The Gap" value={data.gap} dark={projectionDark} />
        <MomentumBox title="Supporters Voted" value={data.supportersVoted} dark={projectionDark} />
        <MomentumBox title="Turnout" value={data.supporterTurnout} dark={projectionDark} suffix="%" />
        <MomentumBox title="Win Probability" value={data.winProbability} dark={projectionDark} suffix="%" />
      </motion.div>

      {latestMilestone && celebrating && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          Milestone hit: {latestMilestone.toLocaleString()} supporters voted.
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-12 gap-3">
            {displayWidgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                fullScreenWidget={fullScreenWidget}
                onFullScreen={(id) => setFullScreenWidget((current) => (current === id ? null : id))}
                onPopOut={popOutWidget}
                onResize={setWidgetWidth}
                dark={projectionDark}
              >
                <WidgetBody
                  id={widget.id}
                  campaignId={campaignId}
                  data={data}
                  widgetData={widgetData}
                  fullscreen={fullScreenWidget === widget.id}
                />
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
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                type="button"
                onClick={() => setFullScreenWidget(null)}
                className="rounded-md border border-slate-500 px-3 py-1.5 text-xs font-semibold text-slate-100"
              >
                Exit Full Screen
              </motion.button>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <WidgetBody id={fullScreenWidget} campaignId={campaignId} data={data} widgetData={widgetData} fullscreen />
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
  dark,
}: {
  widget: WidgetLayout;
  children: React.ReactNode;
  onResize: (id: string, delta: number) => void;
  onPopOut: (id: string) => void;
  onFullScreen: (id: string) => void;
  fullScreenWidget: string | null;
  dark: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: widget.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${Math.max(2, Math.min(12, widget.w))}`,
  } as React.CSSProperties;

  function beginResize(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startW = widget.w;

    function onMove(moveEvent: MouseEvent) {
      const deltaPx = moveEvent.clientX - startX;
      const nextW = Math.max(2, Math.min(12, Math.round(startW + deltaPx / 120)));
      onResize(widget.id, nextW - widget.w);
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className={dark ? "relative rounded-xl border border-slate-700 bg-slate-900 shadow-sm" : "relative rounded-xl border border-slate-200 bg-white shadow-sm"}
    >
      <header className={dark ? "flex items-center justify-between border-b border-slate-700 px-2 py-1.5" : "flex items-center justify-between border-b border-slate-100 px-2 py-1.5"}>
        <div className={dark ? "flex items-center gap-1 text-xs font-semibold text-slate-300" : "flex items-center gap-1 text-xs font-semibold text-slate-600"}>
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} type="button" className={dark ? "rounded p-1 hover:bg-slate-800" : "rounded p-1 hover:bg-slate-100"} {...attributes} {...listeners}>
            <GripVertical className="h-3.5 w-3.5" />
          </motion.button>
          {widget.id}
        </div>
        <div className="flex items-center gap-1">
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} type="button" className={dark ? "rounded p-1 hover:bg-slate-800" : "rounded p-1 hover:bg-slate-100"} onClick={() => onResize(widget.id, -1)}><Minimize2 className="h-3.5 w-3.5" /></motion.button>
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} type="button" className={dark ? "rounded p-1 hover:bg-slate-800" : "rounded p-1 hover:bg-slate-100"} onClick={() => onResize(widget.id, +1)}><Maximize2 className="h-3.5 w-3.5" /></motion.button>
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} type="button" className={dark ? "rounded p-1 hover:bg-slate-800" : "rounded p-1 hover:bg-slate-100"} onClick={() => onPopOut(widget.id)}><MonitorUp className="h-3.5 w-3.5" /></motion.button>
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} type="button" className={dark ? "rounded p-1 hover:bg-slate-800" : "rounded p-1 hover:bg-slate-100"} onClick={() => onFullScreen(widget.id)}>
            {fullScreenWidget === widget.id ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
          </motion.button>
        </div>
      </header>
      <div className="p-3">{children}</div>
      <div role="button" aria-label="Resize widget" onMouseDown={beginResize} className="absolute bottom-1 right-1 h-3.5 w-3.5 cursor-ew-resize rounded-sm border border-slate-300 bg-slate-100" />
    </motion.div>
  );
}

function WidgetBody({
  id,
  campaignId,
  data,
  widgetData,
  fullscreen,
}: {
  id: string;
  campaignId: string;
  data: DataState;
  widgetData: WidgetDataState;
  fullscreen?: boolean;
}) {
  if (id === "map") return <LiveInsightMap campaignId={campaignId} />;

  if (id === "the-gap") {
    const valueColor = data.gap > 500 ? "#E24B4A" : data.gap >= 100 ? "#EF9F27" : "#1D9E75";
    return (
      <div className="relative overflow-hidden rounded-xl p-4 text-white" style={{ background: data.gap === 0 ? "#1D9E75" : BRAND_NAVY }}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">The Gap</p>
        <motion.div
          key={data.gap}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="mt-2"
        >
          <AnimatedNumber
            value={data.gap}
            className={fullscreen ? "text-[200px] font-black leading-none" : "text-[72px] font-black leading-none"}
            format={(v) => v.toLocaleString()}
          />
        </motion.div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
          <motion.div
            className="h-full"
            style={{ backgroundColor: valueColor }}
            initial={false}
            animate={{ width: `${Math.max(0, Math.min(100, (data.supportersVoted / Math.max(1, data.confirmedSupporters)) * 100))}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          />
        </div>
        {data.gap === 0 && <ConfettiInline />}
      </div>
    );
  }

  if (id === "supporters" || id === "supporters-voted") {
    return (
      <div className="rounded-lg bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supporters Voted</p>
        <AnimatedNumber value={data.supportersVoted} className="text-4xl font-black text-slate-900" />
      </div>
    );
  }

  if (id === "health-score") {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Health Score</p>
        <AnimatedNumber value={data.healthScore} className="text-4xl font-black text-slate-900" />
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
          <motion.a
            key={btn.label}
            href={btn.href}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700"
          >
            {btn.label}
          </motion.a>
        ))}
      </div>
    );
  }

  if (id === "win-probability") {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Win Probability</p>
        <AnimatedNumber value={data.winProbability} className="text-4xl font-black text-slate-900" format={(v) => `${v}%`} />
      </div>
    );
  }

  if (id === "support-rate") {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supporter Turnout</p>
        <AnimatedNumber value={data.supporterTurnout} className="text-4xl font-black text-slate-900" format={(v) => `${v}%`} />
      </div>
    );
  }

  if (id === "canvassing-pace") {
    const weekGoal = 250;
    const lastWeekGoal = 250;
    const weekPct = Math.max(0, Math.min(100, Math.round((widgetData.doorsThisWeek / Math.max(1, weekGoal)) * 100)));
    const lastWeekPct = Math.max(0, Math.min(100, Math.round((widgetData.doorsLastWeek / Math.max(1, lastWeekGoal)) * 100)));

    if (widgetData.doorsThisWeek <= 0 && widgetData.doorsLastWeek <= 0) {
      return <WidgetEmptyState icon={BarChart3} title="No canvassing pace yet" actionLabel="Open Canvassing" actionHref="/canvassing" />;
    }

    return (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Canvassing Pace</p>
          <p className="text-sm font-semibold text-slate-700">Weekly progress toward door targets</p>
        </div>
        <ProgressRow label="This Week" current={widgetData.doorsThisWeek} goal={weekGoal} percent={weekPct} tone="emerald" />
        <ProgressRow label="Last Week" current={widgetData.doorsLastWeek} goal={lastWeekGoal} percent={lastWeekPct} tone="sky" />
      </div>
    );
  }

  if (id === "leaderboard") {
    if (widgetData.leaderboard.length === 0) {
      return <WidgetEmptyState icon={Trophy} title="No volunteer leaderboard yet" actionLabel="Invite Volunteers" actionHref="/volunteers" />;
    }

    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top 5 Volunteers</p>
        {widgetData.leaderboard.map((row, index) => (
          <div key={row.userId} className="grid grid-cols-[18px_1fr_auto_auto] items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs">
            <span className="font-black text-slate-400">{index + 1}</span>
            <span className="truncate font-semibold text-slate-800">{row.name}</span>
            <span className="font-semibold text-slate-600">{row.doorsTotal} doors</span>
            <span className="font-semibold text-emerald-700">{row.conversionRate}%</span>
          </div>
        ))}
      </div>
    );
  }

  if (id === "support-funnel") {
    const funnelRows = [
      { label: "P1 Strong", value: widgetData.p1Count, tone: "bg-emerald-500" },
      { label: "P2 Leaning", value: widgetData.p2Count, tone: "bg-sky-500" },
      { label: "P3 Undecided", value: widgetData.p3Count, tone: "bg-amber-500" },
      { label: "P4 Against", value: widgetData.p4Count, tone: "bg-rose-500" },
    ];
    const total = funnelRows.reduce((sum, row) => sum + row.value, 0);

    if (total === 0) {
      return <WidgetEmptyState icon={Filter} title="No support funnel data yet" actionLabel="Open GOTV" actionHref="/gotv" />;
    }

    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supporter Count Breakdown</p>
        {funnelRows.map((row) => {
          const widthPct = Math.max(6, Math.round((row.value / Math.max(1, total)) * 100));
          return (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{row.label}</span>
                <span className="font-semibold text-slate-500">{row.value.toLocaleString()}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${row.tone}`} style={{ width: `${widthPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (id === "priorities") {
    if (widgetData.priorities.length === 0) {
      return <WidgetEmptyState icon={ListTodo} title="No priorities for today" actionLabel="Open Briefing" actionHref="/briefing" />;
    }

    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today's Top 3 Actions</p>
        {widgetData.priorities.slice(0, 3).map((item, idx) => (
          <a key={`${item.action}-${idx}`} href={item.link || "/briefing"} className="block rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
            <p className="text-xs font-black text-slate-900">{idx + 1}. {item.action}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">{item.why}</p>
          </a>
        ))}
      </div>
    );
  }

  if (id === "upcoming-events") {
    if (widgetData.upcomingEvents.length === 0) {
      return <WidgetEmptyState icon={CalendarClock} title="No upcoming events" actionLabel="Create Event" actionHref="/events" />;
    }

    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next 3 Events</p>
        {widgetData.upcomingEvents.slice(0, 3).map((event) => (
          <div key={event.id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
            <p className="truncate text-xs font-black text-slate-900">{event.name}</p>
            <p className="text-[11px] text-slate-600">{new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
          </div>
        ))}
      </div>
    );
  }

  if (id === "overdue-tasks") {
    if (widgetData.overdueTasks <= 0) {
      return <WidgetEmptyState icon={AlertTriangle} title="No overdue tasks" actionLabel="Open Tasks" actionHref="/tasks" />;
    }

    return (
      <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Overdue Tasks</p>
        <AnimatedNumber value={widgetData.overdueTasks} className="text-4xl font-black text-amber-800" />
        <a href="/tasks" className="inline-flex rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-800">Review past due tasks</a>
      </div>
    );
  }

  return <WidgetEmptyState icon={Sparkles} title={`${id} has no content yet`} actionLabel="Open Briefing" actionHref="/briefing" />;
}

function ProgressRow({
  label,
  current,
  goal,
  percent,
  tone,
}: {
  label: string;
  current: number;
  goal: number;
  percent: number;
  tone: "emerald" | "sky";
}) {
  const barTone = tone === "emerald" ? "bg-emerald-500" : "bg-sky-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-semibold text-slate-600">{current.toLocaleString()} / {goal.toLocaleString()}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${barTone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function WidgetEmptyState({
  icon: Icon,
  title,
  actionLabel,
  actionHref,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
      <Icon className="mx-auto h-5 w-5 text-slate-400" />
      <h3 className="mt-1 text-sm font-bold text-slate-800">{title}</h3>
      <a href={actionHref} className="mt-2 inline-flex rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
        {actionLabel}
      </a>
    </div>
  );
}

function MomentumBox({ title, value, dark, suffix }: { title: string; value: number; dark: boolean; suffix?: string }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const prev = useRef(value);

  useEffect(() => {
    const hit = MILESTONES.some((m) => prev.current < m && value >= m);
    if (hit && boxRef.current) {
      const controls = animate(boxRef.current, { y: [0, -12, -8, -10, 0] }, { duration: 0.7, ease: "easeOut" });
      return () => controls.stop();
    }
    prev.current = value;
    return undefined;
  }, [value]);

  return (
    <motion.div
      ref={boxRef}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={dark ? "rounded-lg border border-slate-700 bg-slate-800 p-3" : "rounded-lg border border-slate-200 bg-slate-50 p-3"}
    >
      <p className={dark ? "text-[11px] font-semibold uppercase tracking-wide text-slate-300" : "text-[11px] font-semibold uppercase tracking-wide text-slate-500"}>{title}</p>
      <AnimatedNumber value={value} className={dark ? "mt-1 text-3xl font-black text-white" : "mt-1 text-3xl font-black text-slate-900"} format={(v) => `${v.toLocaleString()}${suffix ?? ""}`} />
    </motion.div>
  );
}

function Skeleton({ height }: { height: number }) {
  return (
    <div
      style={{ height }}
      className="w-full rounded-lg bg-[linear-gradient(90deg,#f1f5f9_25%,#e2e8f0_50%,#f1f5f9_75%)] bg-[length:200%_100%] animate-[shimmer_1.5s_linear_infinite]"
    />
  );
}

function ConfettiInline() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-white/80"
          style={{
            left: `${(i * 7) % 100}%`,
            top: "-8px",
            animation: `confettiDrop ${0.9 + (i % 5) * 0.25}s ease-in forwards`,
            animationDelay: `${(i % 6) * 0.06}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
        @keyframes confettiDrop {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(140px) scale(0.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
