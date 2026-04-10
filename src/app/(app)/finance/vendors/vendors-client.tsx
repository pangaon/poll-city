"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Building2, Search, Star, X } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  vendorType: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  isPreferred: boolean;
  isActive: boolean;
  _count?: { expenses: number; purchaseOrders: number };
}

const VENDOR_TYPES = ["print_shop", "sign_company", "advertising_agency", "digital_vendor", "event_vendor", "staffing_agency", "legal", "software", "courier", "other"];

export default function VendorsClient({ campaignId }: { campaignId: string }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", vendorType: "other", contactName: "", email: "", phone: "", isPreferred: false });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ campaignId });
    if (search) params.set("q", search);
    const res = await fetch(`/api/finance/vendors?${params}`).then((r) => r.json());
    if (res.data) setVendors(res.data);
    setLoading(false);
  }, [campaignId, search]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    const res = await fetch("/api/finance/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, ...form, email: form.email || undefined, isPreferred: form.isPreferred }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.data) {
      toast.success("Vendor added");
      setShowAdd(false);
      setForm({ name: "", vendorType: "other", contactName: "", email: "", phone: "", isPreferred: false });
      load();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Vendors</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90"
        >
          <Plus className="w-3.5 h-3.5" /> Add Vendor
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors..."
          className="w-full pl-8 pr-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="h-28 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)
        ) : vendors.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No vendors yet. Add your first vendor.</p>
          </div>
        ) : vendors.map((v) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{v.name}</span>
                  {v.isPreferred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                </div>
                <span className="text-xs text-gray-400 capitalize">{v.vendorType.replace(/_/g, " ")}</span>
              </div>
              <div className="text-xs text-gray-400 text-right shrink-0">
                {v._count?.expenses ?? 0} expense{v._count?.expenses !== 1 ? "s" : ""}
              </div>
            </div>
            {(v.contactName || v.email || v.phone) && (
              <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                {v.contactName && <p>{v.contactName}</p>}
                {v.email && <p className="truncate">{v.email}</p>}
                {v.phone && <p>{v.phone}</p>}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">Add Vendor</h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                {[
                  { key: "name", label: "Vendor Name *", placeholder: "Acme Print Shop" },
                  { key: "contactName", label: "Contact Name", placeholder: "Jane Smith" },
                  { key: "email", label: "Email", placeholder: "vendor@example.com" },
                  { key: "phone", label: "Phone", placeholder: "416-555-0100" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-400">{label}</label>
                    <input
                      value={form[key as keyof typeof form] as string}
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPreferred}
                    onChange={(e) => setForm((p) => ({ ...p, isPreferred: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600 dark:text-slate-400">Preferred vendor</span>
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300">Cancel</button>
                <button onClick={create} disabled={saving} className="flex-1 px-3 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? "Adding..." : "Add Vendor"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
