export default function OfficialsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-10 w-56 animate-pulse rounded bg-gray-200" />
        <div className="h-16 animate-pulse rounded-lg bg-white" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-xl bg-white" />
          <div className="h-44 animate-pulse rounded-xl bg-white" />
        </div>
      </div>
    </div>
  );
}