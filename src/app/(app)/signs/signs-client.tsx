"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Search, Filter, ChevronLeft, ChevronRight, Camera, Check, RotateCcw } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, Checkbox, FormField, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { toast } from "sonner";
import { formatRelative } from "@/lib/utils";
import dynamic from "next/dynamic";

const CampaignMap = dynamic(() => import("@/components/maps/campaign-map"), { ssr: false });

interface SignRow {
  id: string;
  address1: string;
  city: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  signType: string;
  status: string;
  assignedTeam: string | null;
  notes: string | null;
  requestedAt: string;
  installedAt: string | null;
  removedAt: string | null;
  photoUrl: string | null;
  contact: { id: string; firstName: string; lastName: string; phone: string | null } | null;
}

interface Props { campaignId: string; }

const pageSize = 25;

export default function SignsClient({ campaignId }: Props) {
  const [signs, setSigns] = useState<SignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedSign, setSelectedSign] = useState<SignRow | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ status: "requested", assignedTeam: "", notes: "", photoUrl: "" });

  const loadSigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(pageSize) });
      if (status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      const res = await fetch(`/api/signs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sign requests");
      setSigns(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      toast.error((error as Error).message || "Unable to load signs");
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, search, status]);

  useEffect(() => { loadSigns(); }, [loadSigns]);
  useEffect(() => { setPage(1); }, [search, status]);

  const statusCounts = useMemo(() => {
    return signs.reduce((acc, sign) => {
      acc[sign.status] = (acc[sign.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [signs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function openEditModal(sign: SignRow) {
    setSelectedSign(sign);
    setForm({
      status: sign.status,
      assignedTeam: sign.assignedTeam ?? "",
      notes: sign.notes ?? "",
      photoUrl: sign.photoUrl ?? "",
    });
    setPhotoPreview(sign.photoUrl ?? null);
    setOpenEdit(true);
  }

  async function handleSave() {
    if (!selectedSign) return;
    try {
      const res = await fetch(`/api/signs?id=${selectedSign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to update sign");
      toast.success("Sign request updated");
      setOpenEdit(false);
      loadSigns();
    } catch (error) {
      toast.error((error as Error).message || "Save failed");
    }
  }

  function handlePhotoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setForm((state) => ({ ...state, photoUrl: result }));
      setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Signs"
        description="Track sign requests, assign teams, and manage installed or removed signs."
      />

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="space-y-4">
          <CardHeader><h2 className="text-sm font-semibold text-gray-900">Status overview</h2></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries({ requested: statusCounts.requested ?? 0, scheduled: statusCounts.scheduled ?? 0, installed: statusCounts.installed ?? 0, removed: statusCounts.removed ?? 0 }).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-700">{key.replace(/_/g, " ")}</div>
                <Badge variant={key === "installed" ? "success" : key === "removed" ? "danger" : "default"}>{value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search address, team, or contact" />
              </div>
              <Select value={status} onChange={(event) => setStatus(event.target.value)} className="max-w-[180px]">
                <option value="all">All statuses</option>
                <option value="requested">Requested</option>
                <option value="scheduled">Scheduled</option>
                <option value="installed">Installed</option>
                <option value="removed">Removed</option>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-sm text-gray-500">Total signs</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{total}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-sm text-gray-500">Vehicles available</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{signs.filter((sign) => sign.assignedTeam).length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="border-r border-gray-100 xl:border-r">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Sign locations</p>
                <p className="text-xs text-gray-500">Interactive sign marker map.</p>
              </div>
            </div>
            <div className="p-4">
              <CampaignMap mode="signs" height={420} showControls />
            </div>
          </div>
          <div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Address</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Team</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Requested</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index}>{Array.from({ length: 6 }).map((col, idx) => <td key={idx} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
                  ))
                ) : signs.length === 0 ? (
                  <tr><td colSpan={6} className="py-14 text-center text-sm text-gray-500">No sign requests found.</td></tr>
                ) : signs.map((sign) => (
                  <tr key={sign.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{sign.address1}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{sign.contact ? `${sign.contact.firstName} ${sign.contact.lastName}` : "—"}</td>
                    <td className="px-4 py-3"><Badge variant={sign.status === "installed" ? "success" : sign.status === "removed" ? "danger" : "default"}>{sign.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-600">{sign.assignedTeam ?? "Unassigned"}</td>
                    <td className="px-4 py-3 text-gray-500">{formatRelative(sign.requestedAt)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(sign)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title={selectedSign ? "Edit sign request" : "Update sign"} size="lg">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Status">
              <Select value={form.status} onChange={(event) => setForm((state) => ({ ...state, status: event.target.value }))}>
                <option value="requested">Requested</option>
                <option value="scheduled">Scheduled</option>
                <option value="installed">Installed</option>
                <option value="removed">Removed</option>
              </Select>
            </FormField>
            <FormField label="Assigned team">
              <Input value={form.assignedTeam} onChange={(event) => setForm((state) => ({ ...state, assignedTeam: event.target.value }))} placeholder="Team name or route" />
            </FormField>
          </div>
          <FormField label="Notes"><Textarea value={form.notes} onChange={(event) => setForm((state) => ({ ...state, notes: event.target.value }))} /></FormField>
          <FormField label="Photo upload">
            <input type="file" accept="image/*" onChange={handlePhotoFile} />
            {photoPreview && <img src={photoPreview} alt="Sign photo preview" className="mt-3 h-36 rounded-xl object-cover border border-gray-200" />}
          </FormField>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setOpenEdit(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
