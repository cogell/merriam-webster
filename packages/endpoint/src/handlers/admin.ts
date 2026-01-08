import type { Env, APIErrorResponse } from "../types.js";
import { deleteCache, hasCache, getCacheKey } from "../cache.js";

/**
 * Handle DELETE /cache/:type/:word
 *
 * Invalidates a specific cached entry.
 * Requires ADMIN_API_KEY authentication (checked in worker.ts).
 *
 * @example
 * curl -X DELETE \
 *   -H "Authorization: Bearer $ADMIN_API_KEY" \
 *   https://api.example.com/cache/define/hello
 */
export async function handleCacheDelete(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  // Path: /cache/:type/:word
  const match = url.pathname.match(/^\/cache\/(define|synonyms)\/(.+)$/);

  if (!match) {
    return Response.json(
      {
        success: false,
        error: {
          code: "INVALID_PATH",
          message: "Path must be /cache/{define|synonyms}/{word}",
        },
      } satisfies APIErrorResponse,
      { status: 400 }
    );
  }

  const type = match[1] as "define" | "synonyms";
  const word = decodeURIComponent(match[2]);

  // Validate word
  if (!word || word.length > 100) {
    return Response.json(
      {
        success: false,
        error: {
          code: "INVALID_WORD",
          message: "Word must be 1-100 characters",
        },
      } satisfies APIErrorResponse,
      { status: 400 }
    );
  }

  // Check if entry exists
  const exists = await hasCache(env.CACHE, type, word);

  if (!exists) {
    return Response.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `No cached entry for ${type}:${word}`,
        },
      } satisfies APIErrorResponse,
      { status: 404 }
    );
  }

  // Delete the entry
  await deleteCache(env.CACHE, type, word);

  return Response.json(
    {
      success: true as const,
      data: {
        deleted: true,
        type,
        word,
        key: getCacheKey(type, word),
      },
    },
    { status: 200 }
  );
}
