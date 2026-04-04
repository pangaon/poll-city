"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Pencil, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, CardContent, FormField, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

interface PollRow {
  id: string;
  question: string;
  description: string | null;
  type: string;
  visibility: string;
  targetRegion: string | null;
  totalResponses: number;
  createdAt: string;
  endsAt: string | null;
  tags: string[];
  options: { id: string; text: string }[];
}

interface Props { campaignId: string; }

const pageSize = 25;
const optionTypes = new Set(["multiple_choice", "ranked", "priority_rank"]);

export default function PollsClient({ campaignId }: Props) {
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedPoll, setSelectedPoll] = useState<PollRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    question: "",
    description: "",
    type: "binary",
    visibility: "campaign_only",
    targetRegion: "",
    targetPostalPrefixes: "",
    tags: "",
    endsAt: "",
    options: "",
  });

  const loadPolls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/polls?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load polls");
      setPolls(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      toast.error((error as Error).message || "Unable to load polls");
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, search]);

  useEffect(() => { loadPolls(); }, [loadPolls]);
  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function openCreate() {
    setSelectedPoll(null);
    setForm({ question: "", description: "", type: "binary", visibility: "campaign_only", targetRegion: "", targetPostalPrefixes: "", tags: "", endsAt: "", options: "" });
    setModalOpen(true);
  }

  function openEdit(poll: PollRow) {
    setSelectedPoll(poll);
    setForm({
      question: poll.question,
      description: poll.description ?? "",
      type: poll.type,
      visibility: poll.visibility,
      targetRegion: poll.targetRegion ?? "",
      targetPostalPrefixes: "",
      tags: poll.tags?.join(", ") ?? "",
      endsAt: poll.endsAt ? new Date(poll.endsAt).toISOString().slice(0, 16) : "",
      options: poll.options.map((option) => option.text).join(", "),
    });
    setModalOpen(true);
  }

  async function savePoll() {
    const payload = {
      question: form.question,
      description: form.description,
      type: form.type,
      visibility: form.visibility,
      targetRegion: form.targetRegion || null,
      targetPostalPrefixes: form.targetPostalPrefixes.split(",").map((item) => item.trim()).filter(Boolean),
      tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean),
      endsAt: form.endsAt || null,
      options: optionTypes.has(form.type)
        ? form.options.split(",").map((item) => item.trim()).filter(Boolean)
        : undefined,
      campaignId,
    };

    try {
      const url = selectedPoll ? `/api/polls?id=${selectedPoll.id}` : "/api/polls";
      const method = selectedPoll ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save poll");
      toast.success(`Poll ${selectedPoll ? "updated" : "created"}`);
      setModalOpen(false);
      loadPolls();
    } catch (error) {
      toast.error((error as Error).message || "Save failed");
    }
  }

  const showOptionsField = optionTypes.has(form.type);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Polls"
        description="Create, edit, and review campaign polls and their response volume."
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" />New poll</Button>}
      />

      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search question or region" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Question</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Visibility</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden xl:table-cell">Responses</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>{Array.from({ length: 6 }).map((cell, idx) => <td key={idx} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : polls.length === 0 ? (
                <tr><td colSpan={6} className="py-14 text-center text-sm text-gray-500">No campaign polls yet.</td></tr>
              ) : polls.map((poll) => (
                <tr key={poll.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3"><div className="font-medium text-gray-900">{poll.question}</div><div className="text-xs text-gray-500">{poll.targetRegion ?? "No target region"}</div></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><Badge variant="info">{poll.type}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={poll.visibility === "public" ? "success" : poll.visibility === "campaign_only" ? "default" : "warning"}>{poll.visibility}</Badge></td>
                  <td className="px-4 py-3 hidden xl:table-cell">{poll.totalResponses}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(poll.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => openEdit(poll)}><Pencil className="w-3.5 h-3.5" />Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-500">Showing {total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={selectedPoll ? "Edit poll" : "Create poll"} size="xl">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Question"><Input value={form.question} onChange={(event) => setForm((state) => ({ ...state, question: event.target.value }))} /></FormField>
            <FormField label="Type">
              <Select value={form.type} onChange={(event) => setForm((state) => ({ ...state, type: event.target.value }))}>
                <option value="binary">Binary</option>
                <option value="multiple_choice">Multiple choice</option>
                <option value="ranked">Ranked</option>
                <option value="slider">Slider</option>
                <option value="swipe">Swipe</option>
                <option value="image_swipe">Image swipe</option>
                <option value="emoji_react">Emoji react</option>
                <option value="priority_rank">Priority rank</option>
              </Select>
            </FormField>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Visibility">
              <Select value={form.visibility} onChange={(event) => setForm((state) => ({ ...state, visibility: event.target.value }))}>
                <option value="campaign_only">Campaign only</option>
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
              </Select>
            </FormField>
            <FormField label="Target region"><Input value={form.targetRegion} onChange={(event) => setForm((state) => ({ ...state, targetRegion: event.target.value }))} /></FormField>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Postal prefixes"><Input value={form.targetPostalPrefixes} onChange={(event) => setForm((state) => ({ ...state, targetPostalPrefixes: event.target.value }))} placeholder="Comma separated" /></FormField>
            <FormField label="Tags"><Input value={form.tags} onChange={(event) => setForm((state) => ({ ...state, tags: event.target.value }))} placeholder="Comma separated" /></FormField>
          </div>
          {showOptionsField && <FormField label="Options"><Textarea value={form.options} onChange={(event) => setForm((state) => ({ ...state, options: event.target.value }))} placeholder="Enter options separated by commas" /></FormField>}
          <FormField label="Description"><Textarea value={form.description} onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))} /></FormField>
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label="Ends at"><Input type="datetime-local" value={form.endsAt} onChange={(event) => setForm((state) => ({ ...state, endsAt: event.target.value }))} /></FormField>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={savePoll}><CheckCircle2 className="w-4 h-4" />Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
