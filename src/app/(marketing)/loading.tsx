export default function MarketingLoading() {
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-12 w-44 animate-pulse rounded bg-blue-100" />
        <div className="h-72 animate-pulse rounded-2xl bg-blue-50" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-44 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-44 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-44 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}