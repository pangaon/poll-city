"use client";
import { useState } from "react";
import { Sparkles, Send, RefreshCw, FileText, Users, MessageSquare } from "lucide-react";
import { Button, Card, CardHeader, CardContent, PageHeader } from "@/components/ui";
import { toast } from "sonner";

interface Props { campaignId: string; isMock: boolean; }

const QUICK_PROMPTS = [
  { icon: Users, label: "Summarize undecided voters", prompt: "Give me a brief summary of the undecided voters in my campaign and suggest the top 3 follow-up actions." },
  { icon: MessageSquare, label: "Generate door-knock script", prompt: "Write a 60-second door-knock script for a ward 12 municipal campaign focused on transit and housing affordability." },
  { icon: FileText, label: "Priority follow-up list", prompt: "Based on typical campaign data, what criteria should I use to prioritize follow-up calls this week?" },
  { icon: Sparkles, label: "Volunteer recruitment message", prompt: "Write a short, friendly message to send to contacts who expressed volunteer interest but haven't been contacted yet." },
];

export default function AIAssistClient({ campaignId, isMock }: Props) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; isMock?: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  async function send(text?: string) {
    const content = text ?? prompt;
    if (!content.trim()) return;
    const userMsg = { role: "user" as const, content };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", campaignId, prompt: content }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.data?.text ?? "No response.", isMock: data.data?.isMock }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to connect to AI Assist. Please try again.", isMock: true }]);
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <PageHeader
        title="AI Assist"
        description="Your campaign intelligence assistant"
      />

      {isMock && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Running in demo mode</p>
            <p className="text-xs text-amber-700 mt-0.5">Add <code className="bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> or <code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY</code> to your <code className="bg-amber-100 px-1 rounded">.env.local</code> to enable live AI responses.</p>
          </div>
        </div>
      )}

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_PROMPTS.map(({ icon: Icon, label, prompt: p }) => (
              <button key={label} onClick={() => send(p)} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl text-left hover:border-blue-300 hover:bg-blue-50/30 transition-colors group">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation */}
      {messages.length > 0 && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-50">
              {messages.map((m, i) => (
                <div key={i} className={`p-5 ${m.role === "user" ? "bg-gray-50" : "bg-white"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${m.role === "user" ? "bg-blue-600 text-white" : "bg-gradient-to-br from-purple-500 to-blue-600 text-white"}`}>
                      {m.role === "user" ? "Y" : "AI"}
                    </div>
                    <div className="flex-1 min-w-0">
                      {m.isMock && <span className="text-xs text-amber-600 font-medium mb-1 block">Demo response</span>}
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="p-5 bg-white flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">AI</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input */}
      <Card className="p-4">
        <div className="flex gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything about your campaign… (Enter to send)"
            className="flex-1 resize-none text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] max-h-32"
            rows={1}
          />
          <div className="flex flex-col gap-1.5">
            <Button onClick={() => send()} disabled={!prompt.trim() || loading} size="sm">
              <Send className="w-3.5 h-3.5" />
            </Button>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setMessages([])} title="Clear chat">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
