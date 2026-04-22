"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type NoteType = "broken" | "wrong" | "adjust" | "missing" | "idea" | "good";
type Priority = "high" | "medium" | "low";

type PendingNote = {
  url: string;
  pagePath: string;
  elementSelector?: string;
  elementText?: string;
  xPercent?: number;
  yPercent?: number;
};

type DebugNote = {
  id: string;
  type: NoteType;
  text: string;
  pagePath: string;
  xPercent: number | null;
  yPercent: number | null;
  resolved: boolean;
};

interface SpeechRecognitionResultLike {
  transcript: string;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
}

interface SpeechRecognitionLike {
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    html2canvas?: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const NOTE_TYPES: Array<{ type: NoteType; emoji: string; label: string; activeClass: string }> = [
  { type: "broken", emoji: "R", label: "Broken", activeClass: "bg-red-100 border-red-300 text-red-700" },
  { type: "missing", emoji: "O", label: "Missing", activeClass: "bg-orange-100 border-orange-300 text-orange-700" },
  { type: "wrong", emoji: "Y", label: "Wrong", activeClass: "bg-yellow-100 border-yellow-300 text-yellow-700" },
  { type: "adjust", emoji: "B", label: "Adjust", activeClass: "bg-blue-100 border-blue-300 text-blue-700" },
  { type: "idea", emoji: "I", label: "Idea", activeClass: "bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700" },
  { type: "good", emoji: "G", label: "Good", activeClass: "bg-green-100 border-green-300 text-green-700" },
];

function getSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  const testId = el.getAttribute("data-testid");
  if (testId) return `[data-testid=\"${testId}\"]`;
  const classes = Array.from(el.classList).slice(0, 2).join(".");
  if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
  return el.tagName.toLowerCase();
}

function useHtml2CanvasReady() {
  useEffect(() => {
    if (window.html2canvas) return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);
}

export function DebugToolbar() {
  useHtml2CanvasReady();

  const [isOpen, setIsOpen] = useState(false);
  const [clickMode, setClickMode] = useState(false);
  const [showNoteDrawer, setShowNoteDrawer] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [report, setReport] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [noteCount, setNoteCount] = useState(0);
  const [allNotes, setAllNotes] = useState<DebugNote[]>([]);
  const [pendingNote, setPendingNote] = useState<PendingNote | null>(null);
  const [noteType, setNoteType] = useState<NoteType>("broken");
  const [noteText, setNoteText] = useState("");
  const [notePriority, setNotePriority] = useState<Priority>("medium");
  const [pendingScreenshot, setPendingScreenshot] = useState<string | null>(null);
  const [pendingVideo, setPendingVideo] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [localPins, setLocalPins] = useState<Array<{ x: number; y: number }>>([]);

  const recorderRef = useRef<MediaRecorder | null>(null);

  const unresolvedCount = useMemo(() => allNotes.filter((note) => !note.resolved).length, [allNotes]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInput = Boolean(target?.closest("input, textarea, [contenteditable='true']"));

      if (event.key.toLowerCase() === "d" && !event.metaKey && !event.ctrlKey && !isInput) {
        setIsOpen((prev) => !prev);
      }

      if (!isOpen) return;

      if (event.key.toLowerCase() === "c") setClickMode((prev) => !prev);
      if (event.key.toLowerCase() === "n") {
        setShowNotesPanel((prev) => !prev);
        void loadNotes();
      }
      if (event.key.toLowerCase() === "r") {
        void generateReport();
      }
      if (event.key === "Escape") {
        setClickMode(false);
        setShowNoteDrawer(false);
        setShowNotesPanel(false);
        setShowReportModal(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;

    const response = await fetch("/api/debug/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Session ${new Date().toLocaleDateString()}` }),
    });

    if (!response.ok) throw new Error("Could not create session");
    const payload = (await response.json()) as { data?: { id: string }; id?: string };
    const id = payload.data?.id ?? payload.id;
    if (!id) throw new Error("Invalid session response");
    setSessionId(id);
    return id;
  }, [sessionId]);

  const captureScreenshot = useCallback(async (clientX?: number, clientY?: number) => {
    if (!window.html2canvas) return;

    const canvas = await window.html2canvas(document.body, {
      scale: 0.6,
      useCORS: true,
    });

    if (typeof clientX === "number" && typeof clientY === "number") {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const scaleX = canvas.width / window.innerWidth;
        const scaleY = canvas.height / window.innerHeight;
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(clientX * scaleX, clientY * scaleY, 24, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    setPendingScreenshot(canvas.toDataURL("image/jpeg", 0.8));
  }, []);

  useEffect(() => {
    if (!clickMode) {
      document.body.style.cursor = "";
      return;
    }

    document.body.style.cursor = "crosshair";

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-debug-toolbar]")) return;

      event.preventDefault();
      event.stopPropagation();

      const xPercent = (event.clientX / window.innerWidth) * 100;
      const yPercent = (event.clientY / window.innerHeight) * 100;

      setPendingNote({
        elementSelector: getSelector(target),
        elementText: target.innerText?.slice(0, 160) || "",
        xPercent,
        yPercent,
        url: window.location.href,
        pagePath: window.location.pathname,
      });

      void captureScreenshot(event.clientX, event.clientY);
      setClickMode(false);
      setShowNoteDrawer(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [clickMode, captureScreenshot]);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 15 },
      audio: false,
    });

    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setPendingVideo(blob);
      setPendingNote({
        url: window.location.href,
        pagePath: window.location.pathname,
        elementText: "Screen recording",
      });
      setShowNoteDrawer(true);
      stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    };

    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);

    setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 120000);
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const loadNotes = useCallback(async () => {
    if (!sessionId) return;
    const response = await fetch(`/api/debug/sessions/${sessionId}`);
    if (!response.ok) return;
    const payload = (await response.json()) as { notes?: DebugNote[]; data?: { notes?: DebugNote[] } };
    const notes = payload.notes ?? payload.data?.notes ?? [];
    setAllNotes(notes);
    setNoteCount(notes.filter((note) => !note.resolved).length);
    setLocalPins(
      notes
        .filter((note) => typeof note.xPercent === "number" && typeof note.yPercent === "number" && !note.resolved)
        .map((note) => ({ x: note.xPercent as number, y: note.yPercent as number })),
    );
  }, [sessionId]);

  const generateReport = useCallback(async () => {
    if (!sessionId) return;
    const response = await fetch(`/api/debug/sessions/${sessionId}/report`);
    if (!response.ok) return;
    const payload = (await response.json()) as { report?: string };
    setReport(payload.report ?? "");
    setShowReportModal(true);
  }, [sessionId]);

  const saveNote = useCallback(async () => {
    if (!noteText.trim()) return;

    const sid = await ensureSession();

    let screenshotUrl: string | null = null;
    if (pendingScreenshot) {
      const screenshotResponse = await fetch("/api/debug/media/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: pendingScreenshot }),
      });
      if (screenshotResponse.ok) {
        const payload = (await screenshotResponse.json()) as { url?: string };
        screenshotUrl = payload.url ?? null;
      }
    }

    let videoUrl: string | null = null;
    if (pendingVideo) {
      const formData = new FormData();
      formData.append("video", pendingVideo, "recording.webm");
      const videoResponse = await fetch("/api/debug/media/video", {
        method: "POST",
        body: formData,
      });
      if (videoResponse.ok) {
        const payload = (await videoResponse.json()) as { url?: string };
        videoUrl = payload.url ?? null;
      }
    }

    const basePayload: PendingNote = pendingNote ?? {
      url: window.location.href,
      pagePath: window.location.pathname,
    };

    const response = await fetch(`/api/debug/sessions/${sid}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...basePayload,
        type: noteType,
        text: noteText.trim(),
        priority: notePriority,
        screenshotUrl,
        videoUrl,
      }),
    });

    if (response.ok) {
      setShowNoteDrawer(false);
      setPendingNote(null);
      setPendingScreenshot(null);
      setPendingVideo(null);
      setNoteText("");
      await loadNotes();
    }
  }, [ensureSession, loadNotes, notePriority, noteText, noteType, pendingNote, pendingScreenshot, pendingVideo]);

  return (
    <div data-debug-toolbar style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
      {localPins.map((pin, index) => (
        <div
          key={`${pin.x}-${pin.y}-${index}`}
          className="pointer-events-none fixed h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow"
          style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%, -50%)" }}
          title="Debug marker"
        />
      ))}

      {showNoteDrawer && (
        <div className="border-t-2 border-gray-200 bg-white p-4 shadow-2xl">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex flex-wrap gap-2">
              {NOTE_TYPES.map((item) => (
                <button
                  key={item.type}
                  onClick={() => setNoteType(item.type)}
                  className={`rounded-full border px-3 py-1 text-sm ${noteType === item.type ? item.activeClass : "border-gray-200 bg-gray-100 text-gray-600"}`}
                >
                  {item.emoji} {item.label}
                </button>
              ))}
            </div>

            {pendingNote?.elementText && (
              <div className="mb-2 rounded bg-gray-50 px-2 py-1 text-xs text-gray-600">
                Flagged: &ldquo;{pendingNote.elementText.slice(0, 120)}&rdquo;
              </div>
            )}

            {pendingScreenshot && (
              <AnnotationCanvas imageData={pendingScreenshot} onSave={setPendingScreenshot} />
            )}

            {pendingVideo && (
              <div className="mb-2 rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">
                Video attached ({Math.round(pendingVideo.size / 1024)}KB)
              </div>
            )}

            <textarea
              autoFocus
              className="w-full resize-none rounded border p-3 text-sm"
              rows={4}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="What is wrong and what should happen instead?"
              onKeyDown={(event) => {
                if (event.key === "Escape") setShowNoteDrawer(false);
                if (event.key === "Enter" && event.metaKey) {
                  event.preventDefault();
                  void saveNote();
                }
              }}
            />

            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-2">
                {(["high", "medium", "low"] as const).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => setNotePriority(priority)}
                    className={`rounded px-2 py-1 text-xs ${notePriority === priority ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm text-gray-500" onClick={() => setShowNoteDrawer(false)}>
                  Cancel
                </button>
                <button className="rounded bg-blue-700 px-4 py-1 text-sm text-white" onClick={() => void saveNote()}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNotesPanel && (
        <div className="max-h-72 overflow-y-auto border-t-2 border-gray-200 bg-white shadow-2xl">
          <div className="mx-auto max-w-3xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Session Notes ({unresolvedCount})</h3>
              <button className="text-xs text-blue-700" onClick={() => void generateReport()}>
                Generate Report
              </button>
            </div>

            {allNotes.length === 0 ? (
              <p className="text-xs text-gray-400">No notes yet.</p>
            ) : (
              allNotes.map((note) => (
                <div key={note.id} className="flex items-start gap-3 border-b border-gray-100 py-2">
                  <span className="text-xs font-semibold text-gray-500">{note.type.toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">{note.pagePath}</p>
                    <p className="truncate text-sm">{note.text}</p>
                  </div>
                  {!note.resolved && (
                    <button
                      className="text-xs text-green-700"
                      onClick={async () => {
                        await fetch(`/api/debug/notes/${note.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ resolved: true }),
                        });
                        await loadNotes();
                      }}
                    >
                      Done
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-screen w-full max-w-4xl flex-col overflow-hidden rounded bg-white">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">Debug Report</h2>
              <div className="flex gap-2">
                <button
                  className="rounded bg-blue-700 px-3 py-1 text-sm text-white"
                  onClick={() => navigator.clipboard.writeText(report)}
                >
                  Copy Report
                </button>
                <button
                  className="rounded bg-gray-100 px-3 py-1 text-sm"
                  onClick={() => {
                    const blob = new Blob([report], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = `debug-report-${new Date().toISOString().slice(0, 10)}.md`;
                    anchor.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download
                </button>
                <button className="text-gray-500" onClick={() => setShowReportModal(false)}>
                  X
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-y-auto p-4 text-xs whitespace-pre-wrap">{report}</pre>
          </div>
        </div>
      )}

      <div className="bg-gray-900 text-white">
        <div className="mx-auto flex max-w-screen-xl items-center gap-1 px-3 py-2">
          <button className="p-1 text-lg" onClick={() => setIsOpen((prev) => !prev)} title="Debug mode (D)">
            BUG
          </button>

          {isOpen && (
            <>
              <button
                className={`rounded px-3 py-1 text-xs ${clickMode ? "animate-pulse bg-yellow-500 font-semibold text-black" : "bg-gray-700 hover:bg-gray-600"}`}
                onClick={() => setClickMode((prev) => !prev)}
                title="Click to flag (C)"
              >
                {clickMode ? "Click mode..." : "Flag"}
              </button>

              <button
                className="rounded bg-gray-700 px-3 py-1 text-xs hover:bg-gray-600"
                onClick={() => {
                  setPendingNote({ url: window.location.href, pagePath: window.location.pathname });
                  setShowNoteDrawer(true);
                  void captureScreenshot();
                }}
              >
                Screenshot
              </button>

              <button
                className={`rounded px-3 py-1 text-xs ${isRecording ? "animate-pulse bg-red-600" : "bg-gray-700 hover:bg-gray-600"}`}
                onClick={() => {
                  if (isRecording) stopRecording();
                  else void startRecording();
                }}
              >
                {isRecording ? "Stop" : "Record"}
              </button>

              <button
                className="rounded bg-gray-700 px-3 py-1 text-xs hover:bg-gray-600"
                onClick={() => {
                  setPendingNote({ url: window.location.href, pagePath: window.location.pathname });
                  setShowNoteDrawer(true);
                  const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
                  if (!SpeechCtor) return;
                  const recognition = new SpeechCtor();
                  recognition.onresult = (event) => {
                    setNoteText(event.results[0][0].transcript || "");
                  };
                  recognition.start();
                }}
              >
                Voice
              </button>

              <button
                className="rounded bg-gray-700 px-3 py-1 text-xs hover:bg-gray-600"
                onClick={() => {
                  setShowNotesPanel((prev) => !prev);
                  void loadNotes();
                }}
              >
                Notes {noteCount > 0 ? <span className="ml-1 rounded-full bg-red-500 px-1">{noteCount}</span> : null}
              </button>

              <button className="rounded bg-blue-700 px-3 py-1 text-xs hover:bg-blue-600" onClick={() => void generateReport()}>
                Report
              </button>

              <button
                className="ml-auto rounded bg-green-700 px-3 py-1 text-xs hover:bg-green-600"
                onClick={async () => {
                  if (sessionId) {
                    await fetch(`/api/debug/sessions/${sessionId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "complete" }),
                    });
                  }
                  setIsOpen(false);
                  setShowNotesPanel(false);
                  setShowNoteDrawer(false);
                  setSessionId(null);
                  setAllNotes([]);
                  setLocalPins([]);
                  setNoteCount(0);
                }}
              >
                Done
              </button>

              <span className="ml-2 hidden text-xs text-gray-500 lg:block">D toggle, C click, N notes, R report, Esc close</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AnnotationCanvas({ imageData, onSave }: { imageData: string; onSave: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<"circle" | "arrow" | "highlight">("circle");
  const [color, setColor] = useState("#dc2626");
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const image = new Image();
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);
    };
    image.src = imageData;
  }, [imageData]);

  const onMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    startRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const start = startRef.current;
    const canvas = canvasRef.current;
    if (!start || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const end = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;

    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 3;

    if (tool === "circle") {
      const centerX = ((start.x + end.x) / 2) * sx;
      const centerY = ((start.y + end.y) / 2) * sy;
      const radiusX = Math.abs(end.x - start.x) * 0.5 * sx;
      const radiusY = Math.abs(end.y - start.y) * 0.5 * sy;
      context.beginPath();
      context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      context.stroke();
    }

    if (tool === "arrow") {
      const fromX = start.x * sx;
      const fromY = start.y * sy;
      const toX = end.x * sx;
      const toY = end.y * sy;
      context.beginPath();
      context.moveTo(fromX, fromY);
      context.lineTo(toX, toY);
      context.stroke();

      const angle = Math.atan2(toY - fromY, toX - fromX);
      const head = 16;
      context.beginPath();
      context.moveTo(toX, toY);
      context.lineTo(toX - head * Math.cos(angle - Math.PI / 6), toY - head * Math.sin(angle - Math.PI / 6));
      context.lineTo(toX - head * Math.cos(angle + Math.PI / 6), toY - head * Math.sin(angle + Math.PI / 6));
      context.closePath();
      context.fill();
    }

    if (tool === "highlight") {
      context.save();
      context.globalAlpha = 0.25;
      context.fillRect(
        Math.min(start.x, end.x) * sx,
        Math.min(start.y, end.y) * sy,
        Math.abs(end.x - start.x) * sx,
        Math.abs(end.y - start.y) * sy,
      );
      context.restore();
    }

    startRef.current = null;
  };

  return (
    <div className="mb-3 rounded border border-gray-200 p-2">
      <div className="mb-2 flex flex-wrap gap-2">
        {(["circle", "arrow", "highlight"] as const).map((item) => (
          <button
            key={item}
            className={`rounded px-2 py-1 text-xs ${tool === item ? "bg-red-600 text-white" : "bg-gray-100"}`}
            onClick={() => setTool(item)}
          >
            {item}
          </button>
        ))}
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-7 w-9" />
      </div>

      <canvas
        ref={canvasRef}
        className="max-h-72 w-full cursor-crosshair rounded border"
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      />

      <button className="mt-2 w-full rounded bg-blue-700 py-2 text-sm text-white" onClick={() => onSave(canvasRef.current?.toDataURL("image/jpeg", 0.85) ?? imageData)}>
        Save Annotation
      </button>
    </div>
  );
}
