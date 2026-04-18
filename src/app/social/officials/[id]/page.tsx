import { redirect } from "next/navigation";

/**
 * Redirect legacy /social/officials/[id] to the unified politician profile.
 * Preserves backward compatibility for any existing links.
 */
export default function Page({ params }: { params: { id: string } }) {
  redirect(`/social/politicians/${params.id}`);
}
