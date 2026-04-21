import Link from "next/link";
import { Smartphone, Star, ArrowLeft } from "lucide-react";

export const metadata = { title: "Get the Poll City App" };

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-[#080D14] flex flex-col items-center justify-center px-6 py-12 text-center">
      <Link
        href="/social"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to feed
      </Link>

      {/* Logo */}
      <div className="w-20 h-20 rounded-3xl bg-[#00D4C8] flex items-center justify-center mb-6 shadow-lg shadow-[#00D4C8]/20">
        <Smartphone className="w-10 h-10 text-[#080D14]" />
      </div>

      <h1 className="text-3xl font-black text-white tracking-tight mb-2">
        Poll City
      </h1>
      <p className="text-white/50 text-sm mb-1">Your civic voice, on your phone.</p>

      <div className="flex items-center justify-center gap-1 mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className="w-4 h-4 fill-[#EF9F27] text-[#EF9F27]" />
        ))}
        <span className="text-white/40 text-xs ml-1">Canadian democracy, built different</span>
      </div>

      {/* Feature list */}
      <div className="w-full max-w-xs space-y-3 mb-10 text-left">
        {[
          "Vote on local civic polls",
          "Follow your elected officials",
          "Push notifications when they post",
          "Track Ontario Municipal Elections",
          "Your civic passport + achievements",
        ].map((f) => (
          <div key={f} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-[#00D4C8]/20 flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-[#00D4C8]" />
            </div>
            <p className="text-sm text-white/80">{f}</p>
          </div>
        ))}
      </div>

      {/* App store buttons — placeholders until stores go live */}
      <div className="w-full max-w-xs space-y-3">
        <div className="w-full py-4 rounded-2xl bg-white text-[#080D14] font-black text-sm flex items-center justify-center gap-2 opacity-60 cursor-not-allowed">
          App Store — Coming Soon
        </div>
        <div className="w-full py-4 rounded-2xl bg-white/10 text-white font-black text-sm flex items-center justify-center gap-2 opacity-60 cursor-not-allowed">
          Google Play — Coming Soon
        </div>
      </div>

      <p className="mt-6 text-xs text-white/30">
        In the meantime, use the{" "}
        <Link href="/social" className="text-[#00D4C8] hover:underline">
          web app
        </Link>{" "}
        — it works great on mobile too.
      </p>
    </div>
  );
}
