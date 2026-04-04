"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, DollarSign, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, FormField, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { toast } from "sonner";
import { formatDateTime, fullName } from "@/lib/utils";

interface DonationRow {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  notes: string | null;
  createdAt: string;
  contact: { id: string; firstName: string; lastName: string } | null;
  recordedBy: { id: string; name: string | null };
}

interface Props { campaignId: string; }

const pageSize = 25;

export default function DonationsClient({ campaignId }: Props) {
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [stats, setStats] = useState<Record<string, number>>({});
  const [selectedDonation, setSelectedDonation] = useState<DonationRow | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [form, setForm] = useState({ status: "pledged", method: "cash", notes: "" });

  const loadDonations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(pageSize) });
      if (status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      const res = await fetch(`/api/donations?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load donations");
      setDonations(data.data ?? []);
      setTotal(data.total ?? 0);
      const totals: Record<string, number> = {};
      (data.totalsByStatus ?? []).forEach((item: any) => {
        totals[item.status] = item._count.amount;
      });
      setStats(totals);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load donations");
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, search, status]);

  useEffect(() => { loadDonations(); }, [loadDonations]);
  useEffect(() => { setPage(1); }, [search, status]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function openEditModal(donation: DonationRow) {
    setSelectedDonation(donation);
    setForm({ status: donation.status, method: donation.method ?? "cash", notes: donation.notes ?? "" });
    setOpenEdit(true);
  }

  async function saveDonation() {
    if (!selectedDonation) return;
    try {
      const res = await fetch(`/api/donations?id=${selectedDonation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to update donation");
      toast.success("Donation updated");
      setOpenEdit(false);
      loadDonations();
    } catch (error) {
      toast.error((error as Error).message || "Save failed");
    }
  }

  const summary = useMemo(() => ["pledged", "processed", "cancelled", "refunded"].map((key) => ({ label: key, count: stats[key] ?? 0 })), [stats]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Donations" description="Review pledges and processed gifts for your campaign." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {summary.map((item) => (
          <Card key={item.label} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">{item.label.charAt(0).toUpperCase() + item.label.slice(1)}</p>
                <p className="text-3xl font-semibold text-gray-900">{item.count}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contact, method, or notes" className="pl-9" />
            </div>
            <Select value={status} onChange={(event) => setStatus(event.target.value)} className="max-w-[200px]">
              <option value="all">All statuses</option>
              <option value="pledged">Pledged</option>
              <option value="processed">Processed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Contact</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Method</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Recorded by</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Recorded at</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>{Array.from({ length: 7 }).map((cell, idx) => <td key={idx} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : donations.length === 0 ? (
                <tr><td colSpan={7} className="py-14 text-center text-sm text-gray-500">No donations found.</td></tr>
              ) : donations.map((donation) => (
                <tr key={donation.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3">{donation.contact ? fullName(donation.contact.firstName, donation.contact.lastName) : "Unknown"}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">${donation.amount.toFixed(2)}</td>
                  <td className="px-4 py-3"><Badge variant={donation.status === "processed" ? "success" : donation.status === "cancelled" || donation.status === "refunded" ? "danger" : "default"}>{donation.status}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{donation.method ?? "Cash"}</td>
                  <td className="px-4 py-3 text-gray-600">{donation.recordedBy?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(donation.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(donation)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Update donation" size="md">
        <div className="space-y-4">
          <FormField label="Status">
            <Select value={form.status} onChange={(event) => setForm((state) => ({ ...state, status: event.target.value }))}>
              <option value="pledged">Pledged</option>
              <option value="processed">Processed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </Select>
          </FormField>
          <FormField label="Method"><Input value={form.method} onChange={(event) => setForm((state) => ({ ...state, method: event.target.value }))} /></FormField>
          <FormField label="Notes"><Textarea value={form.notes} onChange={(event) => setForm((state) => ({ ...state, notes: event.target.value }))} /></FormField>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setOpenEdit(false)}>Cancel</Button>
            <Button onClick={saveDonation}><CheckCircle2 className="w-4 h-4" />Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
