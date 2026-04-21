"use client";

import { Construction, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AtlasComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-h-screen bg-[#060E1A] text-slate-100 flex flex-col">
      <div className="px-6 py-5 border-b border-slate-800">
        <Link href="/atlas/import" className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 transition-colors w-fit">
          <ChevronLeft className="w-3.5 h-3.5" /> Atlas Command
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="max-w-md text-center space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
            <Construction className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
          <p className="text-slate-400 leading-relaxed">{description}</p>
          <p className="text-xs text-slate-600 pt-2">
            This module is in development. Boundary and electoral data is available now via Atlas Command → Data Import Pipeline.
          </p>
          <Link
            href="/atlas/import"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Go to Atlas Command
          </Link>
        </div>
      </div>
    </div>
  );
}
