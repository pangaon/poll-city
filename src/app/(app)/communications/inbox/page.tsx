import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import { Inbox, Mail, MessageSquare, Globe } from "lucide-react";

export const metadata = { title: "Inbox — Poll City" };
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { campaignId } = await resolveActiveCampaign();

  // Pull recent notification logs + public questions as "inbox items"
  const [logs, questions] = await Promise.all([
    prisma.notificationLog.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, body: true, status: true, sentAt: true, totalSubscribers: true, deliveredCount: true, failedCount: true, createdAt: true },
    }),
    prisma.question.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, name: true, email: true, question: true, createdAt: true },
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 pb-[env(safe-area-inset-bottom)]">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Inbox className="w-7 h-7 text-blue-700" /> Unified Inbox
        </h1>
        <p className="text-sm text-slate-600 mt-1">Sent emails, SMS blasts, and incoming questions in one view.</p>
      </header>

      <div className="space-y-3">
        {/* Sent campaigns */}
        {logs.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">Sent campaigns</h2>
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{log.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {log.deliveredCount.toLocaleString()} delivered · {log.failedCount.toLocaleString()} failed · {log.totalSubscribers.toLocaleString()} audience
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{log.sentAt ? new Date(log.sentAt).toLocaleString() : new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{log.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Incoming questions */}
        {questions.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">Incoming questions</h2>
            <ul className="space-y-2">
              {questions.map((q) => (
                <li key={q.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-violet-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{q.name ?? "Anonymous"}</p>
                    <p className="text-sm text-slate-700 mt-0.5 line-clamp-2">{q.question}</p>
                    <p className="text-xs text-slate-400 mt-1">{q.email ?? ""} · {new Date(q.createdAt).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {logs.length === 0 && questions.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Globe className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-lg font-bold">Nothing here yet</p>
            <p className="text-sm mt-1">Sent emails and incoming questions will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
