"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, CheckCircle2, XCircle, PhoneOff, AlertTriangle,
  MessageSquare, Clock, Download, ChevronDown, ChevronUp,
  Radio,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState,
  FormField, Input, PageHeader, Select, Spinner, Textarea,
} from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FieldShiftType, FieldShiftStatus } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActiveShiftRow {
  id: string;
  campaignId: string;
  name: string;
  shiftType: FieldShiftType;
  status: FieldShiftStatus;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  ward: string | null;
  pollNumber: string | null;
  meetingPoint: string | null;
  meetingAddress: string | null;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { attempts: number };
  turf: { id: string; name: string } | null;
  route: { id: string; name: string } | null;
  fieldProgram: { id: string; name: string } | null;
}

interface Props {
  campaignId: string;
  campaignName: string;
  activeShifts: ActiveShiftRow[];
}

// ── Outcome definitions for mobile-friendly tap UI ────────────────────────────

const OUTCOMES = [
  { value: "supporter",   label: "Supporter",    icon: <CheckCircle2 className="h-5 w-5" />, color: "bg-[#1D9E75] text-white" },
  { value: "undecided",   label: "Undecided",    icon: <MessageSquare className="h-5 w-5" />, color: "bg-amber-500 text-white" },
  { value: "not_home",    label: "Not Home",     icon: <PhoneOff className="h-5 w-5" />, color: "bg-slate-400 text-white" },
  { value: "no_answer",   label: "No Answer",    icon: <Clock className="h-5 w-5" />, color: "bg-slate-500 text-white" },
  { value: "refused",     label: "Refused",      icon: <XCircle className="h-5 w-5" />, color: "bg-orange-500 text-white" },
  { value: "opposition",  label: "Opposition",   icon: <XCircle className="h-5 w-5" />, color: "bg-[#E24B4A] text-white" },
  { value: "inaccessible","label": "No Access",  icon: <AlertTriangle className="h-5 w-5" />, color: "bg-slate-600 text-white" },
  { value: "bad_data",    label: "Bad Data",     icon: <AlertTriangle className="h-5 w-5" />, color: "bg-purple-500 text-white" },
] as const;

type Outcome = typeof OUTCOMES[number]["value"];

// ── Main component ────────────────────────────────────────────────────────────

export default function MobileFieldClient({ campaignId, campaignName, activeShifts }: Props) {
  const [selectedShift, setSelectedShift] = useState<string>(activeShifts[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);

  const shift = activeShifts.find((s) => s.id === selectedShift);

  async function handleSubmit() {
    if (!selectedShift) { toast.error("Select a shift"); return; }
    if (!selectedOutcome) { toast.error("Tap an outcome"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/field/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          shiftId: selectedShift,
          outcome: selectedOutcome,
          outcomeNotes: [address.trim(), notes.trim()].filter(Boolean).join(" | ") || undefined,
          source: "manual",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to record");
        return;
      }
      setSubmitted((n) => n + 1);
      setAddress("");
      setSelectedOutcome(null);
      setNotes("");
      toast.success("Door recorded");
    } catch {
      toast.error("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-3 space-y-4 max-w-sm mx-auto">
      <PageHeader
        title="Field Entry"
        description={campaignName}
      />

      {/* Shift selector */}
      {activeShifts.length === 0 ? (
        <EmptyState
          icon={<Radio className="h-8 w-8" />}
          title="No active shifts today"
          description="No open or in-progress shifts scheduled for today."
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-3 space-y-3">
              <FormField label="Your Shift">
                <Select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                >
                  {activeShifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.startTime}
                      {s.ward ? ` · Ward ${s.ward}` : ""}
                    </option>
                  ))}
                </Select>
              </FormField>

              {shift && (
                <div>
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                    onClick={() => setShowInstructions((v) => !v)}
                  >
                    {showInstructions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Shift details
                  </button>
                  <AnimatePresence>
                    {showInstructions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 text-xs space-y-1 text-muted-foreground border-t pt-2">
                          {shift.meetingPoint && <p><MapPin className="inline h-3 w-3 mr-1" />{shift.meetingPoint}</p>}
                          {shift.meetingAddress && <p>{shift.meetingAddress}</p>}
                          {shift.notes && <p>{shift.notes}</p>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Door entry form */}
          <Card>
            <CardContent className="p-3 space-y-4">
              <FormField label="Address (optional)">
                <Input
                  placeholder="123 Main Street"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  inputMode="text"
                  autoComplete="street-address"
                />
              </FormField>

              {/* Big outcome buttons — designed for thumbs */}
              <div>
                <p className="text-xs font-medium mb-2 text-muted-foreground">Result</p>
                <div className="grid grid-cols-2 gap-2">
                  {OUTCOMES.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setSelectedOutcome(o.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg p-3 text-sm font-medium transition-all border-2",
                        selectedOutcome === o.value
                          ? `${o.color} border-transparent scale-95`
                          : "border-border bg-background hover:border-muted-foreground/50"
                      )}
                    >
                      {o.icon}
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <FormField label="Notes (optional)">
                <Textarea
                  placeholder="Issues raised, follow-up needed..."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FormField>

              <Button
                className="w-full h-12 text-base"
                onClick={handleSubmit}
                disabled={submitting || !selectedOutcome}
              >
                {submitting ? <Spinner className="h-5 w-5 mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                Record Door
              </Button>

              {submitted > 0 && (
                <p className="text-center text-sm text-[#1D9E75] font-medium">
                  {submitted} door{submitted !== 1 ? "s" : ""} recorded this session
                </p>
              )}
            </CardContent>
          </Card>

          {/* Paper fallback download */}
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-2">
                No signal? Download a paper sheet to fill in offline.
              </p>
              <a
                href={`/api/field/paper-export?campaignId=${campaignId}${selectedShift ? `&shiftId=${selectedShift}` : ""}`}
                download
                className="block w-full"
              >
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Paper Sheet
                </Button>
              </a>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
