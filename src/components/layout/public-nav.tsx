import Link from "next/link";
import Image from "next/image";

/**
 * Simple navigation bar for public-facing pages that have no sidebar.
 * Shows Poll City logo (links to /) and Dashboard button (links to /dashboard).
 */
export default function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Poll City" width={28} height={28} />
          <span className="text-lg font-bold tracking-tight" style={{ color: "#1E3A8A" }}>
            Poll City
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
