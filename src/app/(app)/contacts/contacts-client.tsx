"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Download, Upload, Filter, Phone, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Input, Select, Card, PageHeader, EmptyState, SupportLevelBadge, Modal, FormField, Textarea, Checkbox, Badge } from "@/components/ui";
import { fullName, formatDate, formatPhone, cn } from "@/lib/utils";
import { SUPPORT_LEVEL_LABELS, COMMON_ISSUES, SupportLevel } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createContactSchema, CreateContactInput } from "@/lib/validators";
import { toast } from "sonner";
import Link from "next/link";
import { Tag } from "@prisma/client";

interface ContactRow {
  id: string; firstName: string; lastName: string; email: string | null;
  phone: string | null; supportLevel: SupportLevel; followUpNeeded: boolean;
  volunteerInterest: boolean; signRequested: boolean; ward: string | null;
  lastContactedAt: string | null;
  tags: { tag: { id: string; name: string; color: string } }[];
  _count: { interactions: number };
}

interface Props {
  campaignId: string; campaignName: string;
  tags: Tag[]; teamMembers: { id: string; name: string | null; email: string | null }[];
  userRole: string;
}

export default function ContactsClient({ campaignId, tags, userRole }: Props) {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [supportFilter, setSupportFilter] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [volunteerOnly, setVolunteerOnly] = useState(false);
  const [signOnly, setSignOnly] = useState(false);

  const pageSize = 25;

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (supportFilter) params.set("supportLevel", supportFilter);
      if (followUp) params.set("followUpNeeded", "true");
      if (volunteerOnly) params.set("volunteerInterest", "true");
      if (signOnly) params.set("signRequested", "true");
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      setContacts(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch { toast.error("Failed to load contacts"); }
    finally { setLoading(false); }
  }, [campaignId, page, search, supportFilter, followUp, volunteerOnly, signOnly]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // Debounce search
  useEffect(() => { setPage(1); }, [search, supportFilter, followUp, volunteerOnly, signOnly]);

  const totalPages = Math.ceil(total / pageSize);

  async function exportCSV() {
    const url = `/api/import-export?campaignId=${campaignId}&type=contacts`;
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `contacts-${Date.now()}.csv`; a.click();
    toast.success("Export downloaded");
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Contacts"
        description={`${total.toLocaleString()} total contacts`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-3.5 h-3.5" />Export</Button>
            <Link href="/import-export"><Button variant="outline" size="sm"><Upload className="w-3.5 h-3.5" />Import</Button></Link>
            {["ADMIN", "CAMPAIGN_MANAGER"].includes(userRole) && (
              <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" />Add Contact</Button>
            )}
          </div>
        }
      />

      {/* Search + filters bar */}
      <Card className="p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone, address…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Select value={supportFilter} onChange={(e) => setSupportFilter(e.target.value)} className="w-44">
            <option value="">All support levels</option>
            {Object.entries(SUPPORT_LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-3.5 h-3.5" />Filters{(followUp || volunteerOnly || signOnly) && <span className="ml-1 w-1.5 h-1.5 bg-white rounded-full inline-block" />}
          </Button>
        </div>
        {showFilters && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <Checkbox label="Follow-up needed" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
            <Checkbox label="Volunteer interest" checked={volunteerOnly} onChange={(e) => setVolunteerOnly(e.target.checked)} />
            <Checkbox label="Sign requested" checked={signOnly} onChange={(e) => setSignOnly(e.target.checked)} />
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Support</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Ward</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Tags</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Last Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden xl:table-cell">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : contacts.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">No contacts found</td></tr>
              ) : contacts.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/contacts/${c.id}`)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{fullName(c.firstName, c.lastName)}</div>
                    {c._count.interactions > 0 && <div className="text-xs text-gray-400">{c._count.interactions} interaction{c._count.interactions !== 1 ? "s" : ""}</div>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="space-y-0.5">
                      {c.phone && <div className="flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3" />{formatPhone(c.phone)}</div>}
                      {c.email && <div className="flex items-center gap-1 text-gray-500 text-xs truncate max-w-[160px]"><Mail className="w-3 h-3" />{c.email}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><SupportLevelBadge level={c.supportLevel} /></td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{c.ward ?? "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {c.tags.slice(0, 2).map(({ tag }) => (
                        <span key={tag.id} className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                      ))}
                      {c.tags.length > 2 && <span className="text-xs text-gray-400">+{c.tags.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{formatDate(c.lastContactedAt)}</td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <div className="flex gap-1">
                      {c.followUpNeeded && <span className="w-2 h-2 bg-amber-500 rounded-full" title="Follow-up needed" />}
                      {c.volunteerInterest && <span className="w-2 h-2 bg-blue-500 rounded-full" title="Volunteer interest" />}
                      {c.signRequested && <span className="w-2 h-2 bg-orange-500 rounded-full" title="Sign requested" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Contact Modal */}
      <AddContactModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        campaignId={campaignId}
        onCreated={() => { setShowAdd(false); loadContacts(); }}
      />
    </div>
  );
}

function AddContactModal({ open, onClose, campaignId, onCreated }: { open: boolean; onClose: () => void; campaignId: string; onCreated: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateContactInput>({
    resolver: zodResolver(createContactSchema),
    defaultValues: { campaignId, supportLevel: SupportLevel.unknown, preferredLanguage: "en", issues: [] },
  });

  async function onSubmit(data: CreateContactInput) {
    const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { toast.success("Contact added"); reset(); onCreated(); }
    else { const err = await res.json(); toast.error(err.error ?? "Failed to add contact"); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Contact" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("campaignId")} />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" error={errors.firstName?.message} required>
            <Input {...register("firstName")} placeholder="Jane" />
          </FormField>
          <FormField label="Last Name" error={errors.lastName?.message} required>
            <Input {...register("lastName")} placeholder="Smith" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} placeholder="416-555-0100" type="tel" />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <Input {...register("email")} placeholder="jane@email.com" type="email" />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Street #" required>
            <Input {...register("streetNumber")} placeholder="302" />
          </FormField>
          <div className="col-span-2">
            <FormField label="Street Name">
              <Input {...register("address1")} placeholder="Maple Avenue" />
            </FormField>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="City"><Input {...register("city")} placeholder="Toronto" /></FormField>
          <FormField label="Province"><Input {...register("province")} placeholder="ON" /></FormField>
          <FormField label="Postal Code"><Input {...register("postalCode")} placeholder="M4C 1A1" /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Ward"><Input {...register("ward")} placeholder="Ward 12" /></FormField>
          <FormField label="Support Level">
            <Select {...register("supportLevel")}>
              {Object.entries(SUPPORT_LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Notes"><Textarea {...register("notes")} placeholder="Any notes about this contact…" rows={3} /></FormField>
        <div className="flex gap-3">
          <Checkbox label="Follow-up needed" {...register("followUpNeeded")} />
          <Checkbox label="Sign requested" {...register("signRequested")} />
          <Checkbox label="Volunteer interest" {...register("volunteerInterest")} />
        </div>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Add Contact</Button>
        </div>
      </form>
    </Modal>
  );
}
