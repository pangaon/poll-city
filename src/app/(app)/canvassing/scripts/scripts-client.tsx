"use client";

import { useEffect, useState } from "react";

export default function ScriptsClient({ campaignId }: { campaignId: string }) {
  const [scripts, setScripts] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    scriptType: "general",
    openingLine: "",
    keyMessages: "",
    issueResponses: "",
    closingAsk: "",
    literature: "",
  });

  async function load() {
    const res = await fetch(`/api/canvassing/scripts?campaignId=${campaignId}`);
    const data = await res.json();
    setScripts(data.data ?? []);
  }

  useEffect(() => {
    load();
  }, [campaignId]);

  async function createScript() {
    await fetch("/api/canvassing/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        name: form.name,
        scriptType: form.scriptType,
        openingLine: form.openingLine,
        keyMessages: form.keyMessages.split("\n").filter(Boolean),
        issueResponses: form.issueResponses
          ? Object.fromEntries(form.issueResponses.split("\n").map((line) => {
              const [k, ...rest] = line.split(":");
              return [k?.trim() || "Issue", rest.join(":").trim()];
            }))
          : {},
        closingAsk: form.closingAsk,
        literature: form.literature,
      }),
    });
    setForm({ name: "", scriptType: "general", openingLine: "", keyMessages: "", issueResponses: "", closingAsk: "", literature: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Canvassing Script Builder</h1>
        <p className="text-sm text-gray-500">Create supporter, persuadable, and opposition scripts with issue response branches.</p>
      </div>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Script name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <select className="w-full border rounded-lg px-3 py-2" value={form.scriptType} onChange={(e) => setForm((s) => ({ ...s, scriptType: e.target.value }))}>
          <option value="general">General</option>
          <option value="supporter">Supporter</option>
          <option value="persuadable">Persuadable</option>
          <option value="opposition">Opposition</option>
        </select>
        <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Opening line" value={form.openingLine} onChange={(e) => setForm((s) => ({ ...s, openingLine: e.target.value }))} />
        <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Key messages (one per line)" value={form.keyMessages} onChange={(e) => setForm((s) => ({ ...s, keyMessages: e.target.value }))} />
        <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Issue responses format: issue:response (one per line)" value={form.issueResponses} onChange={(e) => setForm((s) => ({ ...s, issueResponses: e.target.value }))} />
        <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Closing ask" value={form.closingAsk} onChange={(e) => setForm((s) => ({ ...s, closingAsk: e.target.value }))} />
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Leave-behind literature" value={form.literature} onChange={(e) => setForm((s) => ({ ...s, literature: e.target.value }))} />
        <button onClick={createScript} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">Save Script</button>
      </section>

      <section className="space-y-3">
        {scripts.map((script) => (
          <div key={script.id} className="bg-white border rounded-xl p-4">
            <p className="font-semibold text-gray-900">{script.name}</p>
            <p className="text-xs text-gray-500 capitalize">Type: {script.scriptType}</p>
            <p className="text-sm text-gray-700 mt-2">{script.openingLine}</p>
            <ul className="list-disc pl-5 text-sm text-gray-600 mt-2">
              {(script.keyMessages ?? []).map((m: string) => <li key={m}>{m}</li>)}
            </ul>
            <p className="text-sm text-gray-700 mt-2">Closing ask: {script.closingAsk}</p>
          </div>
        ))}
        {scripts.length === 0 && <p className="text-sm text-gray-500">No scripts created yet.</p>}
      </section>
    </div>
  );
}
