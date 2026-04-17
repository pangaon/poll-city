"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Building2, Search, Star, X, Check } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  vendorType: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  paymentTerms: string | null;
  taxNumber: string | null;
  notes: string | null;
  isPreferred: boolean;
  isActive: boolean;
  _count?: { expenses: number; purchaseOrders: number };
}

const VENDOR_TYPES = [
  "print_shop", "sign_company", "advertising_agency", "digital_vendor",
  "event_vendor", "staffing_agency", "legal", "software", "courier", "other",
];

interface VendorForm {
  name: string;
  vendorType: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  paymentTerms: string;
  taxNumber: string;
  notes: string;
  isPreferred: boolean;
}

const EMPTY_FORM: VendorForm = {
  name: "", vendorType: "other", contactName: "", email: "", phone: "",
  address: "", website: "", paymentTerms: "", taxNumber: "", notes: "",
  isPreferred: false,
};

const VENDOR_FIELDS: Array<{ key: Exclude<keyof VendorForm, "isPreferred" | "vendorType">; label: string; placeholder: string }> = [
  { key: "name", label: "Vendor Name *", placeholder: "Acme Print Shop" },
  { key: "contactName", label: "Contact Name", placeholder: "Jane Smith" },
  { key: "email", label: "Email", placeholder: "vendor@example.com" },
  { key: "phone", label: "Phone", placeholder: "416-555-0100" },
  { key: "address", label: "Address", placeholder: "123 Main St, Toronto" },
  { key: "website", label: "Website", placeholder: "acmeprint.ca" },
  { key: "paymentTerms", label: "Payment Terms", placeholder: "Net 30" },
  { key: "taxNumber", label: "Tax / GST / HST Number", placeholder: "123456789 RT0001" },
];

function vendorToForm(v: Vendor): VendorForm {
  return {
    name: v.name,
    vendorType: v.vendorType,
    contactName: v.contactName ?? "",
    email: v.email ?? "",
    phone: v.phone ?? "",
    address: v.address ?? "",
    website: v.website ?? "",
    paymentTerms: v.paymentTerms ?? "",
    taxNumber: v.taxNumber ?? "",
    notes: v.notes ?? "",
    isPreferred: v.isPreferred,
  };
}

export default function VendorsClient({ campaignId }: { campaignId: string }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [preferredOnly, setPreferredOnly] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<VendorForm>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ campaignId });
    if (search) params.set("q", search);
    if (typeFilter) params.set("vendorType", typeFilter);
    const res = await fetch(`/api/finance/vendors?${params}`).then((r) => r.json());
    if (res.data) setVendors(res.data);
    setLoading(false);
  }, [campaignId, search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingVendor(null);
    setShowAdd(true);
  }

  function openEdit(v: Vendor) {
    setForm(vendorToForm(v));
    setEditingVendor(v);
    setShowAdd(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);

    if (editingVendor) {
      const res = await fetch(`/api/finance/vendors/${editingVendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          vendorType: form.vendorType,
          contactName: form.contactName || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          website: form.website || undefined,
          paymentTerms: form.paymentTerms || undefined,
          taxNumber: form.taxNumber || undefined,
          notes: form.notes || undefined,
          isPreferred: form.isPreferred,
        }),
      }).then((r) => r.json());
      setSaving(false);
      if (res.data) {
        toast.success("Vendor updated");
        setShowAdd(false);
        setEditingVendor(null);
        load();
      } else {
        toast.error(res.error ?? "Failed");
      }
    } else {
      const res = await fetch("/api/finance/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: form.name,
          vendorType: form.vendorType,
          contactName: form.contactName || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          website: form.website || undefined,
          paymentTerms: form.paymentTerms || undefined,
          taxNumber: form.taxNumber || undefined,
          notes: form.notes || undefined,
          isPreferred: form.isPreferred,
        }),
      }).then((r) => r.json());
      setSaving(false);
      if (res.data) {
        toast.success("Vendor added");
        setShowAdd(false);
        setForm(EMPTY_FORM);
        load();
      } else {
        toast.error(res.error ?? "Failed");
      }
    }
  }

  async function deactivate(v: Vendor) {
    const res = await fetch(`/api/finance/vendors/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    }).then((r) => r.json());
    if (res.data) {
      toast.success("Vendor deactivated");
      load();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  const displayed = preferredOnly ? vendors.filter((v) => v.isPreferred) : vendors;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Vendors</h1>
          <p className="text-sm text-gray-500">{vendors.length} vendor{vendors.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90"
        >
          <Plus className="w-3.5 h-3.5" /> Add Vendor
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 focus:outline-none"
        >
          <option value="">All types</option>
          {VENDOR_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button
          onClick={() => setPreferredOnly((p) => !p)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            preferredOnly
              ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-600 dark:text-amber-400"
              : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${preferredOnly ? "fill-amber-400 text-amber-400" : ""}`} />
          Preferred
        </button>
      </div>

      {/* Vendor grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))
        ) : displayed.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {preferredOnly ? "No preferred vendors." : "No vendors yet. Add your first vendor."}
            </p>
          </div>
        ) : (
          displayed.map((v) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{v.name}</span>
                    {v.isPreferred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                    {v.taxNumber && (
                      <span className="text-xs px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded font-medium shrink-0">
                        W-9
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{v.vendorType.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(v)}
                    className="p-1 text-gray-400 hover:text-[#0A2342] transition-colors"
                    title="Edit vendor"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>

              {(v.contactName || v.email || v.phone) && (
                <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                  {v.contactName && <p>{v.contactName}</p>}
                  {v.email && <p className="truncate">{v.email}</p>}
                  {v.phone && <p>{v.phone}</p>}
                </div>
              )}

              {v.address && (
                <p className="mt-1 text-xs text-gray-400 truncate">{v.address}</p>
              )}

              {v.paymentTerms && (
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Terms: {v.paymentTerms}</p>
              )}

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {v._count?.expenses ?? 0} expense{v._count?.expenses !== 1 ? "s" : ""}
                  {(v._count?.purchaseOrders ?? 0) > 0 && ` · ${v._count?.purchaseOrders} PO${v._count?.purchaseOrders !== 1 ? "s" : ""}`}
                </span>
                {v.website && (
                  <a
                    href={v.website.startsWith("http") ? v.website : `https://${v.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 truncate max-w-[120px]"
                  >
                    {v.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>

              <button
                onClick={() => deactivate(v)}
                className="mt-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Deactivate
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Add / Edit modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setEditingVendor(null); } }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl max-h-[90dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {editingVendor ? "Edit Vendor" : "Add Vendor"}
                </h2>
                <button onClick={() => { setShowAdd(false); setEditingVendor(null); }} className="text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {VENDOR_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-400">{label}</label>
                    <input
                      value={form[key] as string}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Vendor Type</label>
                  <select
                    value={form.vendorType}
                    onChange={(e) => setForm((p) => ({ ...p, vendorType: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none"
                  >
                    {VENDOR_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342] resize-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setForm((p) => ({ ...p, isPreferred: !p.isPreferred }))}
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                      form.isPreferred ? "bg-amber-400 border-amber-400" : "border-gray-300 dark:border-slate-600"
                    }`}
                  >
                    {form.isPreferred && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-slate-400">Preferred vendor</span>
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setShowAdd(false); setEditingVendor(null); }}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 px-3 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingVendor ? "Save Changes" : "Add Vendor"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
