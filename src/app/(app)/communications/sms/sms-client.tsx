"use client";
import { useEffect, useState } from "react";
import { MessageSquare, Send, Users, Check, Loader2 } from "lucide-react";

interface Props {
  campaignId: string;
  tags: Array<{ id: string; name: string; color: string }>;
  wards: string[];
}

const SUPPORT_LEVELS = [
  { value: "strong_support", label: "Strong Support" },
  { value: "leaning_support", label: "Leaning Support" },
  { value: "undecided", label: "Undecided" },
];

const TEMPLATES = [
  { slug: "gotv", body: "Hi {{firstName}}, tomorrow is election day. Polls are open 10-8. Find your polling station at elections.on.ca. Let's finish this together!" },
  { slug: "reminder", body: "Hi {{firstName}}, quick reminder: knock doors with us this Sat 10am in {{ward}}. Reply YES to join." },
  { slug: "thanks", body: "{{firstName}}, thank you for your support. It means the world. — {{candidateName}}" },
  { slug: "event", body: "Hi {{firstName}}, coffee meetup Thursday 7pm. Hope you'll come. Reply for details." },
];

export default function SmsClient({ campaignId, tags, wards }: Props) {
  const [body, setBody] = useState("");
  const [supportLevels, setSupportLevels] = useState<string[]>([]);
  const [wardFilter, setWardFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [audience, setAudience] = useState<{ count: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent?: number; failed?: number; twilioConfigured?: boolean; error?: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/communications/audience", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            campaignId,
            channel: "sms",
            supportLevels,
            wards: wardFilter,
            tagIds: tagFilter,
            excludeDnc: true,
          }),
        });
        if (res.ok) setAudience(await res.json());
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [campaignId, supportLevels, wardFilter, tagFilter]);

  function toggle(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function send(testOnly: boolean) {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/communications/sms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          body,
          supportLevels,
          wards: wardFilter,
          tagIds: tagFilter,
          excludeDnc: true,
          testOnly,
        }),
      });
      const data = await res.json();
      setResult(res.ok ? data : { error: data.error ?? "Send failed" });
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setSending(false);
    }
  }

  const charCount = body.length;
  const segments = Math.max(1, Math.ceil((charCount + 40) / 160)); // +40 for CASL suffix

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 pb-[env(safe-area-inset-bottom)]">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-blue-700" /> SMS Campaign
        </h1>
        <p className="text-sm text-slate-600 mt-1">"Reply STOP to opt out" + campaign name added automatically (CASL).</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wide mb-3">Quick templates</h2>
            <div className="flex gap-2 overflow-x-auto scrollbar-thin -mx-4 px-4 md:mx-0 md:px-0 pb-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => setBody(t.body)}
                  className="shrink-0 h-10 px-3 rounded-full text-xs font-semibold bg-slate-100 hover:bg-blue-100 border border-slate-200 hover:border-blue-300 text-slate-700 capitalize"
                >
                  {t.slug}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Message</span>
              <textarea
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hi {{firstName}}, ..."
                className="mt-1.5 w-full px-3 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                maxLength={1000}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">Merge: <code className="bg-slate-100 px-1 rounded">{"{{firstName}}"}</code> <code className="bg-slate-100 px-1 rounded">{"{{ward}}"}</code> <code className="bg-slate-100 px-1 rounded">{"{{candidateName}}"}</code></p>
                <p className={`text-xs font-semibold tabular-nums ${segments > 2 ? "text-red-700" : segments > 1 ? "text-amber-700" : "text-emerald-700"}`}>
                  {charCount}/160 · {segments} segment{segments === 1 ? "" : "s"}
                </p>
              </div>
            </label>
          </section>

          {result && (
            <div className={`rounded-xl p-4 text-sm ${result.error ? "bg-red-50 border border-red-200 text-red-900" : "bg-emerald-50 border border-emerald-200 text-emerald-900"}`}>
              {result.error ? result.error : (
                <div>
                  <p className="font-bold">✓ {result.sent?.toLocaleString()} sent · {result.failed?.toLocaleString()} failed</p>
                  {!result.twilioConfigured && <p className="text-xs mt-1">Twilio not configured — logged to console only.</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <aside>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 lg:sticky lg:top-4">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Audience
            </h2>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-4">
              <p className="text-xs font-semibold text-blue-900">{audience?.count.toLocaleString() ?? 0} recipients</p>
              <p className="text-[11px] text-blue-800 mt-0.5">With phone · excluding Do Not Contact</p>
            </div>

            <p className="text-xs font-semibold text-slate-600 mb-1.5">Support level</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SUPPORT_LEVELS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => toggle(supportLevels, s.value, setSupportLevels)}
                  className={`h-8 px-2.5 text-[11px] font-semibold rounded-full border ${
                    supportLevels.includes(s.value)
                      ? "bg-blue-700 text-white border-blue-700"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {wards.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-600 mb-1.5">Ward</p>
                <div className="max-h-28 overflow-y-auto scrollbar-thin space-y-1 mb-3">
                  {wards.slice(0, 15).map((w) => (
                    <label key={w} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={wardFilter.includes(w)} onChange={() => toggle(wardFilter, w, setWardFilter)} />
                      <span className="truncate">{w}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {tags.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-600 mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggle(tagFilter, t.id, setTagFilter)}
                      className={`h-7 px-2 text-[10px] font-semibold rounded-full border ${tagFilter.includes(t.id) ? "text-white" : "text-slate-600 bg-white"}`}
                      style={{ background: tagFilter.includes(t.id) ? t.color : undefined, borderColor: t.color }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="border-t border-slate-200 mt-4 pt-4 space-y-2">
              <button
                onClick={() => send(true)}
                disabled={sending || !body}
                className="w-full h-11 rounded-lg border-2 border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Test send
              </button>
              <button
                onClick={() => send(false)}
                disabled={sending || !body || !audience?.count}
                className="w-full h-12 rounded-lg bg-blue-700 text-white font-bold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send to {audience?.count.toLocaleString() ?? 0}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
