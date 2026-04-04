export default function AppGroupLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="h-36 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-36 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-36 animate-pulse rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}