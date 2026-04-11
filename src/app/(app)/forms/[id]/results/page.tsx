"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, BarChart3 } from "lucide-react";

type Submission = { id: string; data: Record<string, unknown>; completedAt: string; contactId: string | null };

export default function FormResultsPage() {
  const params = useParams();
  const formId = (params?.id ?? "") as string;
  const [form, setForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/forms/${formId}`).then((r) => r.json()),
      fetch(`/api/forms/${formId}/submissions`).then((r) => r.json()),
    ]).then(([formData, subData]) => {
      setForm(formData);
      setSubmissions(subData.submissions ?? subData.data ?? []);
    }).finally(() => setLoading(false));
  }, [formId]);

  if (loading) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  const fields = form?.fields ?? [];
  const fieldLabels: Record<string, string> = {};
  for (const f of fields) fieldLabels[f.id] = f.label;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/forms" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{form?.name ?? "Form"} — Results</h1>
            <p className="text-sm text-gray-500">{submissions.length} submission{submissions.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <a href={`/api/forms/${formId}/submissions/export`} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase">Submissions</p>
          <p className="text-2xl font-bold text-gray-900">{form?.submissionCount ?? submissions.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase">Views</p>
          <p className="text-2xl font-bold text-gray-900">{form?.viewCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase">Conversion</p>
          <p className="text-2xl font-bold text-gray-900">
            {form?.viewCount > 0 ? Math.round(((form?.submissionCount ?? 0) / form.viewCount) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Responses table */}
      {submissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No submissions yet. Share your form to start collecting responses.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">#</th>
                {fields.slice(0, 5).map((f: any) => (
                  <th key={f.id} className="px-4 py-3">{f.label}</th>
                ))}
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((sub, i) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  {fields.slice(0, 5).map((f: any) => {
                    const val = sub.data[f.id];
                    const display = Array.isArray(val) ? val.join(", ") : val === true ? "Yes" : val === false ? "No" : String(val ?? "—");
                    return <td key={f.id} className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{display}</td>;
                  })}
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(sub.completedAt).toLocaleString("en-CA")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
