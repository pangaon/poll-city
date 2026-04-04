export default function RootLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-9 w-52 animate-pulse rounded bg-gray-200" />
        <div className="h-28 animate-pulse rounded-xl bg-gray-200" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-32 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-32 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-32 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </div>
    </div>
  );
}