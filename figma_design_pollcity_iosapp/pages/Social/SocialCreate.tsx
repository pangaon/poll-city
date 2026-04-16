import React, { useState } from "react";
import { X, Image as ImageIcon, Zap, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";
import { motion, AnimatePresence } from "motion/react";

const BACKGROUNDS = [
  { id: "cyan", gradient: "bg-gradient-to-br from-[#00E5FF] to-[#2979FF]", name: "Cyber Blue" },
  { id: "purple", gradient: "bg-gradient-to-br from-[#2979FF] to-[#800080]", name: "Deep Purple" },
  { id: "fire", gradient: "bg-gradient-to-br from-[#FFD600] to-[#FF3B30]", name: "Fire" },
  { id: "green", gradient: "bg-gradient-to-br from-[#00E676] to-[#00C853]", name: "Electric Green" },
  { id: "red", gradient: "bg-gradient-to-br from-[#FF3B30] to-[#D50000]", name: "Alert Red" },
  { id: "dark", gradient: "bg-gradient-to-br from-[#0B0B0F] to-[#1A1A24]", name: "Void" },
];

const CATEGORIES = ["Local", "State", "National", "Economy", "Environment", "Education", "Healthcare", "Tech", "Safety"];

export function SocialCreate() {
  const [question, setQuestion] = useState("");
  const [background, setBackground] = useState("cyan");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      // Reset form
      setQuestion("");
      setSelectedCategories([]);
      setBackground("cyan");
    }, 2000);
  };

  const selectedBg = BACKGROUNDS.find(b => b.id === background);
  const canPublish = question.length >= 10 && selectedCategories.length > 0;

  return (
    <div className="h-full w-full bg-[#0B0B0F] overflow-y-auto pt-14 pb-6">
      
      {/* Header */}
      <header className="px-6 mb-6 sticky top-14 bg-[#0B0B0F]/95 backdrop-blur-xl z-20 pb-4 pt-2 border-b border-[#FFFFFF]/5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-[#FFFFFF] tracking-tighter uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] flex items-center gap-2">
            <Sparkles size={24} className="text-[#00E5FF] drop-shadow-[0_0_15px_#00E5FF]" />
            Create Signal
          </h1>
          <button className="text-[#B0B3C0] hover:text-[#FFFFFF] transition-colors">
            <X size={24} />
          </button>
        </div>
      </header>

      <div className="px-6 space-y-6">
        
        {/* Live Preview Card */}
        <div className="relative">
          <div className="text-[10px] font-black uppercase tracking-widest text-[#6C6F7F] mb-3 flex items-center gap-2">
            <Zap size={10} className="text-[#FFD600]" /> Live Preview
          </div>
          <div className="aspect-[4/5] rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)] border border-[#FFFFFF]/10 relative">
            <div className={cn("w-full h-full relative flex flex-col p-6 text-[#FFFFFF] justify-between", selectedBg?.gradient)}>
              
              {/* Overlay Gradients */}
              <div className="absolute inset-0 bg-[#0B0B0F]/40 pointer-events-none mix-blend-multiply"></div>
              <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/80 to-transparent pointer-events-none"></div>

              {/* Top Content */}
              <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-3 bg-[#0B0B0F]/60 backdrop-blur-xl px-4 py-2 rounded-full border border-[#FFFFFF]/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#2979FF] flex items-center justify-center text-sm font-black shadow-[0_0_15px_rgba(0,229,255,0.5)]">
                    You
                  </div>
                  <div>
                    <div className="text-[14px] font-black leading-tight tracking-wide">Your Poll</div>
                    <div className="text-[11px] text-[#B0B3C0] font-mono uppercase tracking-widest leading-tight">@voter</div>
                  </div>
                </div>
              </div>

              {/* Question Content */}
              <div className="relative z-10 mt-auto mb-16">
                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedCategories.map((cat, i) => (
                      <span key={i} className="text-[10px] font-black uppercase tracking-[0.2em] bg-[#FFFFFF]/10 backdrop-blur-xl px-3 py-1.5 rounded border border-[#FFFFFF]/20">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
                
                <h2 className="text-4xl font-black leading-[1.1] tracking-tighter text-balance drop-shadow-[0_5px_20px_rgba(0,0,0,1)] min-h-[88px]">
                  {question || "Your question will appear here..."}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* Question Input */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[#AAB2FF] mb-3 block">
            Poll Question
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something powerful..."
            maxLength={180}
            className="w-full bg-[#141419] border border-[#FFFFFF]/20 text-[#FFFFFF] text-[16px] font-bold rounded-xl px-4 py-4 focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all placeholder:text-[#6C6F7F] resize-none h-32 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          />
          <div className="flex justify-between items-center mt-2 text-[10px] font-bold uppercase tracking-widest">
            <span className="text-[#6C6F7F]">Min 10 characters</span>
            <span className={cn(
              question.length >= 10 ? "text-[#00E676]" : "text-[#6C6F7F]"
            )}>
              {question.length} / 180
            </span>
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[#AAB2FF] mb-3 block">
            Categories (Select 1-3)
          </label>
          <button
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            className="w-full bg-[#141419] border border-[#FFFFFF]/20 text-[#FFFFFF] text-[13px] font-bold rounded-xl px-4 py-3 hover:border-[#00E5FF]/50 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-between"
          >
            <span>
              {selectedCategories.length > 0 
                ? selectedCategories.join(", ") 
                : "Select categories..."}
            </span>
            <ChevronDown size={16} className={cn("transition-transform", showCategoryPicker && "rotate-180")} />
          </button>
          
          <AnimatePresence>
            {showCategoryPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="bg-[#141419] border border-[#FFFFFF]/20 rounded-xl p-3 flex flex-wrap gap-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      disabled={!selectedCategories.includes(cat) && selectedCategories.length >= 3}
                      className={cn(
                        "px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                        selectedCategories.includes(cat)
                          ? "bg-[#00E5FF] text-[#0B0B0F] shadow-[0_0_15px_rgba(0,229,255,0.5)]"
                          : "bg-[#0B0B0F] text-[#B0B3C0] border border-[#FFFFFF]/10 hover:border-[#00E5FF]/50",
                        !selectedCategories.includes(cat) && selectedCategories.length >= 3 && "opacity-30 cursor-not-allowed"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Background Theme */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[#AAB2FF] mb-3 block">
            Visual Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setBackground(bg.id)}
                className={cn(
                  "aspect-[3/2] rounded-xl border-2 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden",
                  background === bg.id
                    ? "border-[#00E5FF] shadow-[0_0_25px_rgba(0,229,255,0.6)] scale-105"
                    : "border-[#FFFFFF]/10 hover:border-[#FFFFFF]/30"
                )}
              >
                <div className={cn("w-full h-full", bg.gradient)} />
                {background === bg.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0B0B0F]/40 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-full bg-[#00E5FF] flex items-center justify-center shadow-[0_0_20px_#00E5FF]">
                      <Zap size={16} className="text-[#0B0B0F] fill-[#0B0B0F]" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Publish Button */}
        <button
          onClick={handlePublish}
          disabled={!canPublish || isPublishing}
          className={cn(
            "w-full py-5 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden",
            canPublish && !isPublishing
              ? "bg-gradient-to-r from-[#00E5FF] to-[#2979FF] text-[#0B0B0F] hover:shadow-[0_0_40px_rgba(0,229,255,0.8)] hover:scale-[1.02] active:scale-95"
              : "bg-[#141419] text-[#6C6F7F] border border-[#FFFFFF]/10 cursor-not-allowed"
          )}
        >
          {isPublishing ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Zap size={16} className="fill-current" />
              </motion.div>
              Publishing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Sparkles size={16} /> Deploy Signal
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
