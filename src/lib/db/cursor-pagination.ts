// Generic cursor pagination helpers for Prisma.
//
// Usage:
//   const { items, nextCursor, hasMore } = await paginateCursor({
//     cursor: req.nextUrl.searchParams.get("cursor"),
//     pageSize: 50,
//     fetch: (args) => prisma.contact.findMany({ ...args, where: { campaignId } }),
//     getCursor: (row) => row.id,
//     orderBy: { id: "asc" },
//   });

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CursorArgs<T, O> {
  cursor: string | null | undefined;
  pageSize: number;
  fetch: (args: {
    take: number;
    cursor?: { id: string };
    skip?: number;
    orderBy: O;
  }) => Promise<T[]>;
  getCursor: (row: T) => string;
  orderBy: O;
}

export async function paginateCursor<T, O>({
  cursor,
  pageSize,
  fetch,
  getCursor,
  orderBy,
}: CursorArgs<T, O>): Promise<CursorPage<T>> {
  const size = Math.max(1, Math.min(200, pageSize || 50));
  const fetchArgs: {
    take: number;
    cursor?: { id: string };
    skip?: number;
    orderBy: O;
  } = {
    take: size + 1,
    orderBy,
  };
  if (cursor) {
    fetchArgs.cursor = { id: cursor };
    fetchArgs.skip = 1;
  }
  const rows = await fetch(fetchArgs);
  const hasMore = rows.length > size;
  const items = hasMore ? rows.slice(0, -1) : rows;
  const nextCursor = hasMore ? getCursor(items[items.length - 1]) : null;
  return { items, nextCursor, hasMore };
}

export function parseCursorParams(searchParams: URLSearchParams): {
  cursor: string | null;
  pageSize: number;
} {
  const cursor = searchParams.get("cursor");
  const rawSize = searchParams.get("pageSize") ?? searchParams.get("limit");
  const pageSize = rawSize ? Number.parseInt(rawSize, 10) : 50;
  return {
    cursor: cursor && cursor.length > 0 ? cursor : null,
    pageSize: Number.isFinite(pageSize) ? pageSize : 50,
  };
}
