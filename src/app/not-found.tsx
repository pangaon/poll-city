import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-6 py-20">
      <div className="mx-auto max-w-2xl rounded-2xl border border-blue-100 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Poll City</p>
        <h1 className="mt-3 text-4xl font-extrabold text-gray-900">Page not found</h1>
        <p className="mt-4 text-gray-600">
          The page you are looking for does not exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-lg bg-[#1E3A8A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}