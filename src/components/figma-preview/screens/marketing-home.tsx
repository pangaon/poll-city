"use client";
import React from "react";
import Link from "next/link";
import { Smartphone, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { AppSwitcher } from "@/components/figma-preview/app-switcher";

export function MarketingHome() {
  return (
    <div className="min-h-screen bg-[#050A1F] text-[#F5F7FF] font-sans flex flex-col relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[800px] pointer-events-none opacity-40 z-0">
        <div className="absolute -top-[20%] right-[10%] w-[800px] h-[800px] bg-[#2979FF]/20 rounded-full blur-[150px]" />
        <div className="absolute top-[20%] left-[10%] w-[600px] h-[600px] bg-[#00E5FF]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[0%] right-[30%] w-[500px] h-[500px] bg-[#FF3B30]/10 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="border-b border-[#2979FF]/20 sticky top-0 bg-[#0F1440]/80 backdrop-blur-xl z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/design-preview" className="text-2xl font-black tracking-tighter text-[#F5F7FF] flex items-center gap-3 drop-shadow-[0_0_10px_rgba(41,121,255,0.8)] uppercase">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Poll City Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_20px_rgba(0,229,255,0.8)] hover:-translate-y-1 transition-transform" />
            Poll City Ecosystem
          </Link>
          <div className="flex items-center gap-6">
            <AppSwitcher />
          </div>
        </div>
      </nav>

      <main className="flex-1 relative z-10 w-full pt-16 pb-24">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto mb-20"
          >
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-[#00E5FF]/30 shadow-[0_0_15px_rgba(0,229,255,0.2)] animate-pulse">
              <span className="flex h-2 w-2 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" />
              FULL ECOSYSTEM PREVIEW
            </div>
            <h1 className="text-5xl md:text-[72px] font-black tracking-tighter text-[#F5F7FF] leading-[0.9] mb-6 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] uppercase">
              Choose Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#2979FF] drop-shadow-[0_0_20px_rgba(0,229,255,0.4)]">Application.</span>
            </h1>
            <p className="text-xl text-[#AAB2FF] max-w-2xl mx-auto font-medium">
              Launch the Enterprise SaaS Command Center or preview the Public Mobile Social App experience.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-10 max-w-6xl mx-auto">
            {/* Command Center Card */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#2979FF]/20 to-[#00E5FF]/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <Link
                href="/design-preview/social/command"
                className="block bg-[#0F1440]/60 backdrop-blur-xl border border-[#2979FF]/30 rounded-2xl p-10 hover:border-[#00E5FF] transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(0,229,255,0.2)] relative z-10 h-full flex flex-col hover:-translate-y-2"
              >
                <div className="w-16 h-16 bg-[#050A1F] border border-[#2979FF]/40 rounded-xl flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(41,121,255,0.3)] group-hover:border-[#00E5FF] transition-colors">
                  <Smartphone className="text-[#00E5FF]" size={32} />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-[#F5F7FF] mb-4 group-hover:text-[#00E5FF] transition-colors">
                  Poll City<br />Command Center
                </h2>
                <p className="text-[#AAB2FF] leading-relaxed mb-10 flex-1">
                  The high-density mobile War Room app for political operatives. iOS application featuring live turf radar, sentiment telemetry, and campaign execution grids.
                </p>
                <div className="flex items-center text-[#00E5FF] font-black uppercase tracking-[0.2em] text-sm group-hover:gap-4 transition-all gap-2">
                  Preview iOS App <ArrowRight size={16} />
                </div>
              </Link>
            </motion.div>

            {/* Social App Card */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF3B30]/20 to-[#FFD600]/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <Link
                href="/design-preview/social/feed"
                className="block bg-[#0B0B0F]/80 backdrop-blur-xl border border-[#FF3B30]/30 rounded-2xl p-10 hover:border-[#FF3B30] transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(255,59,48,0.2)] relative z-10 h-full flex flex-col hover:-translate-y-2"
              >
                <div className="w-16 h-16 bg-[#141419] border border-[#FF3B30]/40 rounded-xl flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(255,59,48,0.3)] group-hover:border-[#FF3B30] transition-colors">
                  <Smartphone className="text-[#FF3B30]" size={32} />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-[#FFFFFF] mb-4 group-hover:text-[#FF3B30] transition-colors">
                  Poll City<br />Social App
                </h2>
                <p className="text-[#B0B3C0] leading-relaxed mb-10 flex-1">
                  The public-facing mobile polling application. Swipe-based UI with gamified voting, live trending sentiment, and a decentralised feed.
                </p>
                <div className="flex items-center text-[#FF3B30] font-black uppercase tracking-[0.2em] text-sm group-hover:gap-4 transition-all gap-2">
                  Preview Mobile App <ArrowRight size={16} />
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </main>

      <footer className="bg-[#050A1F] border-t border-[#2979FF]/20 py-8 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 text-center text-[10px] font-mono text-[#6B72A0] uppercase tracking-widest">
          © 2030 Poll City Ecosystem. The definitive campaign warfare system.
        </div>
      </footer>
    </div>
  );
}
