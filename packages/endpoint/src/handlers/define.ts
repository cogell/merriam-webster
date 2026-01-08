import { MerriamWebster } from "@merriam-webster/lib";
import type { Env, APISuccessResponse } from "../types.js";
import { getCached, setCache } from "../cache.js";
import {
  checkRateLimit,
  getRateLimitStatus,
  rateLimitedResponse,
  handleMWError,
  validateWord,
} from "./shared.js";

/**
 * Handle GET /define/:word
 *
 * Flow:
 * 1. Parse word from URL
 * 2. Validate input
 * 3. Check KV cache → return if hit
 * 4. Check rate limit → return 429 if exceeded
 * 5. Call MW Dictionary API
 * 6. Cache response (with appropriate TTL)
 * 7. Return response
 */
export async function handleDefine(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const word = decodeURIComponent(url.pathname.replace("/define/", ""));

  // Validate input
  const invalid = validateWord(word);
  if (invalid) return invalid;

  // Check cache first (no rate limit cost)
  const cached = await getCached(env.CACHE, "define", word);
  if (cached) {
    const rateLimit = await getRateLimitStatus(env);
    return Response.json(
      {
        success: true,
        data: cached.data,
        cached: true,
        rateLimit: {
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          resetsAt: rateLimit.resetsAt,
        },
      } satisfies APISuccessResponse<unknown>,
      {
        status: 200,
        headers: { "X-Cache": "HIT" },
      }
    );
  }

  // Check rate limit (only on cache miss)
  const rateLimit = await checkRateLimit(env);
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit);
  }

  // Call MW Dictionary API
  try {
    const mw = new MerriamWebster({
      dictionaryKey: env.MW_DICTIONARY_KEY,
    });

    const result = await mw.define(word);

    // Cache in background
    ctx.waitUntil(setCache(env.CACHE, "define", word, result, result.found));

    return Response.json(
      {
        success: true,
        data: result,
        cached: false,
        rateLimit: {
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          resetsAt: rateLimit.resetsAt,
        },
      } satisfies APISuccessResponse<typeof result>,
      {
        status: 200,
        headers: { "X-Cache": "MISS" },
      }
    );
  } catch (error) {
    return handleMWError(error, rateLimit);
  }
}
