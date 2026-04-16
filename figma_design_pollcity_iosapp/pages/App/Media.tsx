import React from "react";
import { PlaySquare, Image as ImageIcon, Video, Folder } from "lucide-react";

export function Media() {
  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[#F5F7FF] tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center gap-3">
            <PlaySquare className="text-[#00E5FF]" size={28} /> Media Assets
          </h1>
          <p className="text-[#AAB2FF] mt-2 font-medium tracking-wide">High-res collateral and digital warfare content library.</p>
        </div>
        <button className="bg-[#00E5FF] text-[#050A1F] px-6 py-2.5 rounded font-black uppercase tracking-[0.2em] hover:bg-[#F5F7FF] transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)]">
          Upload Core
        </button>
      </header>

      <div className="flex-1 grid grid-cols-4 gap-6">
        <div className="col-span-1 flex flex-col gap-4">
          <div className="bg-[#0F1440]/60 backdrop-blur-xl rounded-xl border border-[#2979FF]/30 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <h3 className="text-[#AAB2FF] font-black uppercase tracking-[0.2em] text-[10px] mb-4">Directories</h3>
            <ul className="space-y-2">
              {['Campaign Ads', 'Social Stills', 'B-Roll', 'Branding Kits'].map(dir => (
                <li key={dir} className="flex items-center gap-3 bg-[#050A1F] p-3 rounded border border-[#2979FF]/20 group hover:border-[#00E5FF]/40 transition-all cursor-pointer">
                  <Folder size={16} className="text-[#2979FF] group-hover:text-[#00E5FF]" />
                  <span className="font-bold text-[#F5F7FF] text-sm group-hover:text-[#00E5FF] transition-colors">{dir}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-span-3 bg-[#0F1440]/60 backdrop-blur-xl border border-[#2979FF]/30 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-6">
          <div className="grid grid-cols-3 gap-6 h-full overflow-y-auto custom-scrollbar pr-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-[#050A1F] rounded-lg border border-[#2979FF]/20 overflow-hidden group hover:border-[#00E5FF]/60 transition-all shadow-[0_5px_15px_rgba(0,0,0,0.5)] flex flex-col h-48 cursor-pointer relative">
                <div className="absolute inset-0 bg-[#00E5FF]/5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"></div>
                <div className="flex-1 bg-[#0B0F2A] relative flex items-center justify-center overflow-hidden border-b border-[#2979FF]/20 group-hover:border-[#00E5FF]/40 transition-colors">
                  {i % 2 === 0 ? (
                    <Video size={40} className="text-[#2979FF]/50 group-hover:text-[#00E5FF] transition-colors drop-shadow-[0_0_10px_rgba(0,229,255,0.4)]" />
                  ) : (
                    <ImageIcon size={40} className="text-[#2979FF]/50 group-hover:text-[#00E5FF] transition-colors drop-shadow-[0_0_10px_rgba(0,229,255,0.4)]" />
                  )}
                  {/* Grid overlay for aesthetic */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(41,121,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(41,121,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                </div>
                <div className="p-3 bg-[#0F1440] relative z-20">
                  <div className="text-[10px] text-[#AAB2FF] uppercase tracking-widest font-mono mb-1 truncate group-hover:text-[#F5F7FF] transition-colors">ASSET_00{i}.{i % 2 === 0 ? 'mp4' : 'png'}</div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#6B72A0]">
                    <span>{(Math.random() * 10 + 1).toFixed(1)} MB</span>
                    <span className="text-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.2)]">CLEARED</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}