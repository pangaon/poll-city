import { POST as uploadPost } from "../upload/route";

/**
 * Backwards-compatible alias for clients that still call /api/gotv/upload-voted.
 * Canonical handler remains /api/gotv/upload.
 */
export const POST = uploadPost;