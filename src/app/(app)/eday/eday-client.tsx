"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle, AlertTriangle, ChevronRight, Loader2, MapPin, User, ClipboardList } from "lucide-react";

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface ScrutineerAssignment {
  id: string;
  pollingStation: string;
  pollingAddress: string | null;
  municipality: string;
  ward: string | null;
  province: string;
  electionDate: string;
  candidateSigned: boolean;
}

interface OcrCandidate {
  name: string;
  party: string | null;
  votes: number;
}

interface OcrResult {
  pollingStation: string | null;
  municipality: string | null;
  ward: string | null;
  province: string | null;
  office: string | null;
  percentReporting: number;
  candidates: OcrCandidate[];
  totalVotes: number | null;
  rejectedBallots: number | null;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

type Step = "ready" | "capturing" | "reviewing" | "submitting" | "done" | "error";

/* ─── Props ─────────────────────────────────────────────────────────────── */

export default function EdayClient({ campaignId }: { campaignId: string }) {
  const [assignment, setAssignment] = useState<ScrutineerAssignment | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [step, setStep] = useState<Step>("ready");
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [editableResult, setEditableResult] = useState<OcrResult | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "ok" | "mismatch" | "error">("idle");
  const [submittedCount, setSubmittedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/eday/my-assignment?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then(({ data }) => setAssignment(data ?? null))
      .catch(() => {})
      .finally(() => setLoadingAssignment(false));
  }, [campaignId]);

  /* Convert file to base64 */
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageCapture = useCallback(
    async (file: File) => {
      setStep("capturing");
      try {
        const imageBase64 = await fileToBase64(file);
        const mimeType = (file.type as "image/jpeg" | "image/png" | "image/webp") || "image/jpeg";

        const body = {
          campaignId,
          imageBase64,
          mimeType,
          ...(assignment
            ? {
                hint: {
                  pollingStation: assignment.pollingStation,
                  municipality: assignment.municipality,
                  ward: assignment.ward ?? undefined,
                  province: assignment.province,
                },
              }
            : {}),
        };

        const res = await fetch("/api/results/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error("OCR failed");
        const { data } = await res.json() as { data: OcrResult };
        setOcrResult(data);
        setEditableResult(data);
        setStep("reviewing");
      } catch {
        setStep("error");
      }
    },
    [campaignId, assignment],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageCapture(file);
      // Reset so same file can be re-selected
      e.target.value = "";
    },
    [handleImageCapture],
  );

  const updateCandidate = (idx: number, field: "name" | "votes", value: string) => {
    if (!editableResult) return;
    const updated = { ...editableResult };
    updated.candidates = [...updated.candidates];
    updated.candidates[idx] = {
      ...updated.candidates[idx],
      [field]: field === "votes" ? (value === "" ? NaN : parseInt(value, 10)) : value,
    };
    setEditableResult(updated);
  };

  const submitResults = async () => {
    if (!editableResult) return;

    // Validate: no candidate may have an empty or NaN vote count
    const invalidIdx = editableResult.candidates.findIndex(
      (c) => c.votes === null || c.votes === undefined || isNaN(c.votes),
    );
    if (invalidIdx !== -1) {
      alert(`Please enter a vote count for ${editableResult.candidates[invalidIdx].name || `candidate ${invalidIdx + 1}`}.`);
      return;
    }

    setStep("submitting");

    const entries = editableResult.candidates.map((c) => ({
      province: editableResult.province ?? assignment?.province ?? "ON",
      municipality: editableResult.municipality ?? assignment?.municipality ?? "",
      ward: editableResult.ward ?? assignment?.ward,
      office: editableResult.office ?? "Unknown Office",
      candidateName: c.name,
      party: c.party,
      votes: c.votes,
      percentReporting: editableResult.percentReporting ?? 100,
      ocrAssisted: true,
    }));

    let ok = 0;
    let mismatch = false;

    for (const entry of entries) {
      try {
        const res = await fetch("/api/results/entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
        if (res.status === 409) {
          mismatch = true;
        } else if (res.ok) {
          ok++;
        }
      } catch {
        // non-fatal per candidate
      }
    }

    setSubmittedCount(ok);
    setSubmitStatus(mismatch ? "mismatch" : ok > 0 ? "ok" : "error");
    setStep("done");
  };

  /* ─── Renders ────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 text-white" style={{ backgroundColor: NAVY }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: GREEN }}>
            E
          </div>
          <div>
            <p className="text-sm font-semibold">Election Day</p>
            <p className="text-xs text-blue-200">Results Entry</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Scrutineer assignment card */}
        {loadingAssignment ? (
          <div className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        ) : assignment ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl p-2" style={{ backgroundColor: `${GREEN}18` }}>
                <MapPin className="h-5 w-5" style={{ color: GREEN }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Assignment</p>
                <p className="font-semibold text-slate-900 mt-0.5">{assignment.pollingStation}</p>
                {assignment.pollingAddress && (
                  <p className="text-sm text-slate-500">{assignment.pollingAddress}</p>
                )}
                <p className="text-sm text-slate-500">{assignment.municipality}{assignment.ward ? ` · Ward ${assignment.ward}` : ""}</p>
                {!assignment.candidateSigned && (
                  <p className="mt-1 text-xs font-medium text-amber-600">Candidate signature pending</p>
                )}
              </div>
              {assignment.candidateSigned && (
                <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: GREEN }} />
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-dashed border-slate-300 p-4 text-center">
            <User className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No scrutineer assignment found for today.</p>
            <p className="text-xs text-slate-400 mt-1">Contact your campaign manager to be assigned a polling station.</p>
          </div>
        )}

        {/* OCR Scanner */}
        <AnimatePresence mode="wait">
          {step === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="rounded-2xl bg-white border border-slate-200 p-5 text-center"
            >
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full mb-4" style={{ backgroundColor: `${NAVY}12` }}>
                <Camera className="h-8 w-8" style={{ color: NAVY }} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Scan Results Printout</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Take a photo of the official results printout from your polling station. The numbers will be extracted automatically.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white"
                style={{ backgroundColor: NAVY, minHeight: 48 }}
              >
                <Camera className="h-4 w-4" />
                Take Photo / Upload
              </button>
              <p className="mt-3 text-xs text-slate-400">Or upload an existing photo from your device</p>
            </motion.div>
          )}

          {step === "capturing" && (
            <motion.div
              key="capturing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-white border border-slate-200 p-8 text-center"
            >
              <Loader2 className="h-10 w-10 mx-auto animate-spin mb-3" style={{ color: GREEN }} />
              <p className="text-sm font-medium text-slate-700">Reading the printout...</p>
              <p className="text-xs text-slate-400 mt-1">This usually takes 5–10 seconds</p>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="rounded-2xl bg-white border border-red-200 p-6 text-center"
            >
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
              <h3 className="text-lg font-semibold text-slate-900">Scan failed</h3>
              <p className="mt-1 text-sm text-slate-500">
                The image could not be processed. Make sure the printout is well-lit and all numbers are clearly visible, then try again.
              </p>
              <button
                type="button"
                onClick={() => setStep("ready")}
                className="mt-5 rounded-xl px-5 py-3 text-sm font-medium text-white"
                style={{ backgroundColor: NAVY, minHeight: 48 }}
              >
                Try Again
              </button>
            </motion.div>
          )}

          {step === "reviewing" && editableResult && (
            <motion.div
              key="reviewing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-3"
            >
              {/* Confidence badge */}
              <div className={`rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium ${
                editableResult.confidence === "high"
                  ? "bg-emerald-50 text-emerald-700"
                  : editableResult.confidence === "medium"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              }`}>
                {editableResult.confidence === "high" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {editableResult.confidence === "high"
                  ? "All numbers clearly read — please review before submitting"
                  : `${editableResult.confidence.toUpperCase()} confidence — review carefully`}
              </div>

              {editableResult.warnings.length > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  {editableResult.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700">{w}</p>
                  ))}
                </div>
              )}

              {/* Station info */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">POLLING STATION INFO</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Station</p>
                    <p className="font-medium text-slate-800">{editableResult.pollingStation ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Office</p>
                    <p className="font-medium text-slate-800">{editableResult.office ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Municipality</p>
                    <p className="font-medium text-slate-800">{editableResult.municipality ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Ward</p>
                    <p className="font-medium text-slate-800">{editableResult.ward ?? "—"}</p>
                  </div>
                </div>
              </div>

              {/* Candidate results — editable */}
              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500">RESULTS — TAP TO CORRECT</p>
                </div>
                {editableResult.candidates.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-amber-700 bg-amber-50">
                    <p className="font-medium">No candidates extracted.</p>
                    <p className="text-xs mt-1">The image may be unclear. Retake a clearer photo, or go back and enter results manually.</p>
                  </div>
                ) : null}
                {editableResult.candidates.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={c.name}
                        aria-label={`Candidate ${idx + 1} name`}
                        onChange={(e) => updateCandidate(idx, "name", e.target.value)}
                        className="w-full text-sm font-medium text-slate-800 bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none py-0.5"
                      />
                      {c.party && <p className="text-xs text-slate-400">{c.party}</p>}
                    </div>
                    <input
                      type="number"
                      value={isNaN(c.votes) ? "" : c.votes}
                      aria-label={`Votes for ${c.name || `candidate ${idx + 1}`}`}
                      onChange={(e) => updateCandidate(idx, "votes", e.target.value)}
                      className={`w-28 text-right text-lg font-semibold text-slate-900 bg-slate-50 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 ${isNaN(c.votes) ? "ring-2 ring-red-400" : ""}`}
                      style={{ "--tw-ring-color": GREEN } as React.CSSProperties}
                      min={0}
                    />
                  </div>
                ))}
                {editableResult.totalVotes != null && (
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                    <p className="text-xs text-slate-500">Total ballots cast</p>
                    <p className="text-sm font-semibold text-slate-700">{editableResult.totalVotes.toLocaleString()}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep("ready"); setOcrResult(null); setEditableResult(null); }}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600"
                  style={{ minHeight: 48 }}
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={submitResults}
                  className="flex-1 rounded-xl text-white px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
                  style={{ backgroundColor: NAVY, minHeight: 48 }}
                >
                  Submit Results
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "submitting" && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-white border border-slate-200 p-8 text-center"
            >
              <Loader2 className="h-10 w-10 mx-auto animate-spin mb-3" style={{ color: GREEN }} />
              <p className="text-sm font-medium text-slate-700">Submitting results...</p>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="rounded-2xl bg-white border border-slate-200 p-6 text-center"
            >
              {submitStatus === "ok" && (
                <>
                  <CheckCircle className="h-12 w-12 mx-auto mb-3" style={{ color: GREEN }} />
                  <h3 className="text-lg font-semibold text-slate-900">Results submitted</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {submittedCount} candidate result{submittedCount !== 1 ? "s" : ""} entered. Your entry is not final until confirmed by a second team member.
                  </p>
                </>
              )}
              {submitStatus === "mismatch" && (
                <>
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3" style={{ color: AMBER }} />
                  <h3 className="text-lg font-semibold text-slate-900">Vote count mismatch</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    One or more counts don't match a previous entry. Your campaign manager has been flagged to review.
                  </p>
                </>
              )}
              {submitStatus === "error" && (
                <>
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
                  <h3 className="text-lg font-semibold text-slate-900">Submission failed</h3>
                  <p className="mt-1 text-sm text-slate-500">Please try again or enter results manually.</p>
                </>
              )}
              <button
                type="button"
                onClick={() => { setStep("ready"); setOcrResult(null); setEditableResult(null); setSubmitStatus("idle"); }}
                className="mt-5 rounded-xl px-5 py-3 text-sm font-medium text-white"
                style={{ backgroundColor: NAVY, minHeight: 48 }}
              >
                Scan Another Printout
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        {(step === "ready" || step === "error") && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <ClipboardList className="h-5 w-5 mt-0.5 shrink-0 text-slate-400" />
              <div className="text-sm text-slate-500 space-y-1">
                <p className="font-medium text-slate-700">How it works</p>
                <p>1. Get the official results printout from the DRO at the close of polls.</p>
                <p>2. Photograph it clearly — numbers must be legible.</p>
                <p>3. Review the extracted numbers. Tap any number to correct it.</p>
                <p>4. Submit. A second team member confirms to finalize.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
