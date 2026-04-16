"use client";
import React from "react";
import { PlaySquare, Image as ImageIcon, Video, Folder, Plus, Upload } from "lucide-react";

const MEDIA = [
  { type: "video", name: "Campaign Launch Ad", size: "124 MB", date: "Apr 8" },
  { type: "image", name: "Headshot — Official 2030", size: "4.2 MB", date: "Mar 22" },
  { type: "video", name: "Debate Prep Reel", size: "89 MB", date: "Apr 10" },
  { type: "image", name: "Town Hall Photos (12)", size: "38 MB", date: "Apr 5" },
  { type: "video", name: "GOTV Reminder Ad", size: "67 MB", date: "Apr 12" },
  { type: "image", name: "Mailer Visual — Economy", size: "8.1 MB", date: "Apr 1" },
  { type: "image", name: "Ward Map Graphic", size: "2.8 MB", date: "Mar 29" },
  { type: "video", name: "Canvasser Training", size: "210 MB", date: "Feb 14" },
];

export function Media() {
  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[#F5F7FF] tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center gap-3"><PlaySquare className="text-[#00E5FF]" size={28} /> Media Assets</h1>
          <p className="text-[#AAB2FF] mt-2 font-medium tracking-wide">Campaign collateral, video assets, and print-ready files.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 border border-[#2979FF]/40 text-[#AAB2FF] px-6 py-2.5 rounded font-black uppercase tracking-[0.2em] hover:text-[#F5F7FF] hover:border-[#2979FF]/60 transition-all"><Upload size={16} /> Upload</button>
          <button className="bg-[#2979FF] text-white px-6 py-2.5 rounded font-black uppercase tracking-[0.2em] hover:bg-[#00E5FF] transition-all shadow-[0_0_20px_rgba(41,121,255,0.4)] flex items-center gap-2"><Plus size={16} /> New Folder</button>
        </div>
      </header>
      <div className="flex-1 bg-[#0F1440]/60 backdrop-blur-xl border border-[#2979FF]/30 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col">
        <div className="p-4 border-b border-[#2979FF]/20 flex items-center gap-4 bg-[#050A1F]/50">
          <div className="flex gap-2">
            {[{ icon: Folder, label: "All" }, { icon: Video, label: "Video" }, { icon: ImageIcon, label: "Image" }].map((f, i) => (
              <button key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-widest transition-all ${i === 0 ? "bg-[#2979FF]/20 text-[#00E5FF] border border-[#00E5FF]/40" : "text-[#AAB2FF] border border-transparent hover:border-[#2979FF]/30"}`}><f.icon size={12} />{f.label}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 gap-4">
            {MEDIA.map((item, i) => (
              <div key={i} className="bg-[#050A1F] border border-[#2979FF]/20 rounded-xl overflow-hidden hover:border-[#00E5FF]/40 transition-all cursor-pointer group shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                <div className="aspect-video bg-[#0F1440] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2979FF]/10 to-[#00E5FF]/5" />
                  {item.type === "video"
                    ? <Video size={32} className="text-[#2979FF] group-hover:text-[#00E5FF] transition-colors drop-shadow-[0_0_10px_rgba(41,121,255,0.6)]" />
                    : <ImageIcon size={32} className="text-[#2979FF] group-hover:text-[#00E5FF] transition-colors drop-shadow-[0_0_10px_rgba(41,121,255,0.6)]" />}
                  {item.type === "video" && <div className="absolute bottom-2 right-2 bg-[#FF3B30] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">VIDEO</div>}
                </div>
                <div className="p-3">
                  <div className="font-bold text-[#F5F7FF] text-xs mb-1 truncate group-hover:text-[#00E5FF] transition-colors">{item.name}</div>
                  <div className="flex justify-between text-[10px] text-[#6B72A0]"><span>{item.size}</span><span>{item.date}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
