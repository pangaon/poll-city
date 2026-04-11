import Link from "next/link";

export default function Custom500() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-20">
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1E3A8A]">Poll City</p>
        <h1 className="mt-3 text-3xl font-extrabold text-gray-900">Server error</h1>
        <p className="mt-4 text-gray-600">
          We hit an unexpected issue. Please try again or return to the home page.
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
