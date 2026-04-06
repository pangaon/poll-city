import TvModeClient from "./tv-mode-client";

export const dynamic = "force-dynamic";

export default function TvModePage({ params }: { params: { slug: string } }) {
  return <TvModeClient slug={params.slug} />;
}
