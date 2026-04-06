"use client";

type Props = {
  open: boolean;
  title: string;
  duration: string;
  script: string;
  voiceNotes: string | null;
  onClose: () => void;
  onDoneRecording: () => void;
};

type Section = { timestamp: string; title: string; screen: string; say: string };

function parseScriptSections(script: string): Section[] {
  return script
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return null;
      const first = lines[0].match(/^\[(.*?)\]\s*(.*)$/);
      const timestamp = first?.[1] || "00:00";
      const title = first?.[2] || "Section";
      const screen = lines.find((line) => line.startsWith("SCREEN:"))?.replace("SCREEN:", "").trim() || "";
      const say = lines.find((line) => line.startsWith("SAY:"))?.replace("SAY:", "").trim() || "";
      return { timestamp, title, screen, say };
    })
    .filter(Boolean) as Section[];
}

export function ScriptViewer({ open, title, duration, script, voiceNotes, onClose, onDoneRecording }: Props) {
  if (!open) return null;
  const sections = parseScriptSections(script);

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 mt-1">🎬 Target: {duration}</p>

        {voiceNotes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-6 italic">
            <strong>Voice notes:</strong> {voiceNotes}
          </div>
        )}

        {sections.map((section, index) => (
          <div key={`${section.timestamp}-${index}`} className="border-l-4 border-slate-200 pl-4 mb-6">
            <div className="text-blue-600 font-mono font-bold text-sm">{section.timestamp}</div>
            <div className="font-bold text-slate-900 mb-2">{section.title}</div>
            {section.screen && <div className="text-slate-500 text-sm mb-2 italic">📱 {section.screen}</div>}
            {section.say && <div className="text-green-800 text-[20px] leading-relaxed font-medium">{section.say}</div>}
          </div>
        ))}

        <div className="sticky bottom-0 bg-white border-t pt-4 flex gap-3">
          <button type="button" onClick={onClose} className="px-3 py-2 border rounded-lg text-sm">Close</button>
          <button type="button" onClick={onDoneRecording} className="px-3 py-2 rounded-lg text-sm bg-emerald-600 text-white">I finished recording →</button>
        </div>
      </div>
    </div>
  );
}
