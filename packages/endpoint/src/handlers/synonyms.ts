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
 * Handle GET /synonyms/:word
 *
 * Flow mirrors define.ts but uses thesaurus API.
 */
export async function handleSynonyms(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const word = decodeURIComponent(url.pathname.replace("/synonyms/", ""));

  // Validate input
  const invalid = validateWord(word);
  if (invalid) return invalid;

  // Check cache first (no rate limit cost)
  const cached = await getCached(env.CACHE, "synonyms", word);
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

  // Call MW Thesaurus API
  try {
    const mw = new MerriamWebster({
      thesaurusKey: env.MW_THESAURUS_KEY,
    });

    const result = await mw.synonyms(word);

    // Cache in background
    ctx.waitUntil(setCache(env.CACHE, "synonyms", word, result, result.found));

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
