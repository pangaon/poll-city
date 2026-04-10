"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitMerge, X, CheckCircle2, Clock, AlertTriangle, Users, ChevronRight } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, Modal, PageHeader } from "@/components/ui";
import { toast } from "sonner";
import { fullName, formatDate, cn } from "@/lib/utils";
import type { SupportLevel } from "@/types";
import { SupportLevelBadge } from "@/components/ui";
import Link from "next/link";

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

type SupportLevelStr = string;

interface ContactSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address1: string | null;
  city: string | null;
  ward: string | null;
  supportLevel: SupportLevelStr;
  createdAt: string | Date;
  _count: { interactions: number; donations: number };
}

interface DuplicateRow {
  id: string;
  confidence: string;
  signals: unknown;
  decision: string;
  contactA: ContactSummary;
  contactB: ContactSummary;
}

interface Props {
  campaignId: string;
  initialDuplicates: DuplicateRow[];
  total: number;
  isAdmin: boolean;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  exact:  "bg-red-100 text-red-800 border-red-300",
  high:   "bg-orange-100 text-orange-800 border-orange-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low:    "bg-gray-100 text-gray-600 border-gray-300",
};

export default function DuplicatesClient({ campaignId, initialDuplicates, total, isAdmin }: Props) {
  const [dupes, setDupes] = useState<DuplicateRow[]>(initialDuplicates);
  const [merging, setMerging] = useState<DuplicateRow | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);

  async function handleDecide(dupeId: string, decision: "not_duplicate" | "deferred") {
    setDeciding(dupeId);
    try {
      const res = await fetch(`/api/crm/duplicates/${dupeId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, decision }),
      });
      if (res.ok) {
        setDupes(prev => prev.filter(d => d.id !== dupeId));
        toast.success(decision === "not_duplicate" ? "Marked not a duplicate" : "Deferred");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed");
      }
    } finally { setDeciding(null); }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Duplicate Contacts"
        description={`${total} pending review`}
        actions={
          <Link href="/contacts">
            <Button variant="outline" size="sm">← Back to Contacts</Button>
          </Link>
        }
      />

      {dupes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900">All clear</p>
            <p className="text-sm text-gray-500 mt-1">No pending duplicates to review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {dupes.map((dupe) => (
              <motion.div
                key={dupe.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={SPRING}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">Possible duplicate</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium capitalize", CONFIDENCE_COLORS[dupe.confidence] ?? CONFIDENCE_COLORS.low)}>
                          {dupe.confidence} confidence
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <Button
                            size="sm"
                            onClick={() => setMerging(dupe)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <GitMerge className="w-3.5 h-3.5" />
                            Merge
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecide(dupe.id, "not_duplicate")}
                          loading={deciding === dupe.id}
                        >
                          <X className="w-3.5 h-3.5" />
                          Not a Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDecide(dupe.id, "deferred")}
                          loading={deciding === dupe.id}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Defer
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[dupe.contactA, dupe.contactB].map((c, idx) => (
                        <div key={c.id} className={cn(
                          "rounded-lg border p-3 space-y-1",
                          idx === 0 ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"
                        )}>
                          <div className="flex items-center justify-between gap-2">
                            <Link href={`/contacts/${c.id}`} className="text-sm font-semibold text-blue-700 hover:underline">
                              {fullName(c.firstName, c.lastName)}
                            </Link>
                            <SupportLevelBadge level={c.supportLevel as SupportLevel} />
                          </div>
                          {c.email && <p className="text-xs text-gray-600 truncate">{c.email}</p>}
                          {c.phone && <p className="text-xs text-gray-600">{c.phone}</p>}
                          {c.address1 && <p className="text-xs text-gray-500 truncate">{c.address1}{c.city ? `, ${c.city}` : ""}</p>}
                          <div className="flex items-center gap-3 pt-1">
                            <span className="text-xs text-gray-400">{c._count.interactions} interactions</span>
                            <span className="text-xs text-gray-400">{c._count.donations} donations</span>
                            <span className="text-xs text-gray-400">Added {formatDate(c.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Merge Preview Modal */}
      {merging && (
        <MergeModal
          dupe={merging}
          campaignId={campaignId}
          onClose={() => setMerging(null)}
          onMerged={(survivorId) => {
            setDupes(prev => prev.filter(d => d.id !== merging.id));
            setMerging(null);
            toast.success("Contacts merged successfully");
          }}
        />
      )}
    </div>
  );
}

// ─── Merge Modal ───────────────────────────────────────────────────────────────

const MERGE_FIELDS = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address1", label: "Address" },
  { key: "city", label: "City" },
  { key: "ward", label: "Ward" },
] as const;

type FieldKey = (typeof MERGE_FIELDS)[number]["key"];
type FieldDecision = Record<FieldKey, "survivor" | "absorbed">;

function MergeModal({
  dupe,
  campaignId,
  onClose,
  onMerged,
}: {
  dupe: DuplicateRow;
  campaignId: string;
  onClose: () => void;
  onMerged: (survivorId: string) => void;
}) {
  const [survivorId, setSurvivorId] = useState<string>(dupe.contactA.id);
  const [decisions, setDecisions] = useState<FieldDecision>(() => {
    const d = {} as FieldDecision;
    for (const f of MERGE_FIELDS) d[f.key] = "survivor";
    return d;
  });
  const [saving, setSaving] = useState(false);

  const survivor = survivorId === dupe.contactA.id ? dupe.contactA : dupe.contactB;
  const absorbed = survivorId === dupe.contactA.id ? dupe.contactB : dupe.contactA;

  function getPreview(key: FieldKey): string {
    const src = decisions[key] === "survivor" ? survivor : absorbed;
    const val = src[key];
    return (typeof val === "string" ? val : null) ?? "(empty)";
  }

  async function doMerge() {
    setSaving(true);
    try {
      const res = await fetch("/api/crm/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          survivorId,
          absorbedId: absorbed.id,
          fieldDecisions: decisions,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onMerged(data.data?.survivor?.id ?? survivorId);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Merge failed");
      }
    } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title="Merge Contacts" size="md">
      <div className="space-y-4">
        {/* Survivor selector */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Keep as primary record (survivor)</p>
          <div className="grid grid-cols-2 gap-2">
            {[dupe.contactA, dupe.contactB].map((c) => (
              <button
                key={c.id}
                onClick={() => setSurvivorId(c.id)}
                className={cn(
                  "text-left p-3 rounded-lg border text-sm transition-colors",
                  survivorId === c.id
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <p className="font-semibold">{fullName(c.firstName, c.lastName)}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{c.email ?? c.phone ?? "(no contact)"}</p>
                <p className="text-xs mt-1">{c._count.interactions} interactions · {c._count.donations} donations</p>
              </button>
            ))}
          </div>
        </div>

        {/* Field decisions */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Field decisions — pick the value to keep</p>
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {MERGE_FIELDS.map(({ key, label }) => {
              const aVal = survivor[key];
              const bVal = absorbed[key];
              const aStr = (typeof aVal === "string" ? aVal : null) ?? "";
              const bStr = (typeof bVal === "string" ? bVal : null) ?? "";
              const differ = aStr !== bStr;
              return (
                <div key={key} className={cn("flex items-center gap-3 px-3 py-2", !differ && "opacity-50")}>
                  <span className="text-xs font-medium text-gray-500 w-20 flex-shrink-0">{label}</span>
                  <button
                    className={cn(
                      "flex-1 text-left text-xs px-2 py-1 rounded transition-colors",
                      decisions[key] === "survivor"
                        ? "bg-blue-100 text-blue-800 font-medium"
                        : "text-gray-500 hover:bg-gray-100"
                    )}
                    onClick={() => setDecisions(d => ({ ...d, [key]: "survivor" }))}
                    disabled={!differ}
                  >
                    {aStr || "(empty)"}
                  </button>
                  <span className="text-xs text-gray-300">vs</span>
                  <button
                    className={cn(
                      "flex-1 text-left text-xs px-2 py-1 rounded transition-colors",
                      decisions[key] === "absorbed"
                        ? "bg-emerald-100 text-emerald-800 font-medium"
                        : "text-gray-500 hover:bg-gray-100"
                    )}
                    onClick={() => setDecisions(d => ({ ...d, [key]: "absorbed" }))}
                    disabled={!differ}
                  >
                    {bStr || "(empty)"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
          All interactions, tasks, donations, and signs will be moved to the survivor. The absorbed contact will be soft-deleted.
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={doMerge} loading={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            <GitMerge className="w-4 h-4" />
            Confirm Merge
          </Button>
        </div>
      </div>
    </Modal>
  );
}
