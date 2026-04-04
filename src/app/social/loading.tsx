export default function SocialLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-40 animate-pulse rounded-xl bg-white" />
        <div className="h-40 animate-pulse rounded-xl bg-white" />
      </div>
    </div>
  );
}