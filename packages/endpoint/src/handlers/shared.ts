import { MerriamWebsterError } from "@merriam-webster/lib";
import type { Env, RateLimitStatus, APIErrorResponse } from "../types.js";

const RATE_LIMITER_ID = "global";

/**
 * Check rate limit and increment counter.
 * Call this for cache misses only.
 */
export async function checkRateLimit(env: Env): Promise<RateLimitStatus> {
  const id = env.RATE_LIMITER.idFromName(RATE_LIMITER_ID);
  const stub = env.RATE_LIMITER.get(id);
  const response = await stub.fetch(new Request("http://do/check"));
  return response.json();
}

/**
 * Get current rate limit status without incrementing.
 * Safe to call for cache hits.
 */
export async function getRateLimitStatus(env: Env): Promise<RateLimitStatus> {
  const id = env.RATE_LIMITER.idFromName(RATE_LIMITER_ID);
  const stub = env.RATE_LIMITER.get(id);
  const response = await stub.fetch(new Request("http://do/status"));
  return response.json();
}

/**
 * Build 429 response for rate-limited requests.
 */
export function rateLimitedResponse(rateLimit: RateLimitStatus): Response {
  const retryAfter = Math.ceil(
    (new Date(rateLimit.resetsAt).getTime() - Date.now()) / 1000
  );

  return Response.json(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Daily API limit exceeded. Try again tomorrow.",
      },
      rateLimit: {
        remaining: 0,
        limit: rateLimit.limit,
        resetsAt: rateLimit.resetsAt,
      },
    } satisfies APIErrorResponse,
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": rateLimit.resetsAt,
      },
    }
  );
}

/**
 * Handle errors from MW API calls.
 */
export function handleMWError(
  error: unknown,
  rateLimit: RateLimitStatus
): Response {
  if (error instanceof MerriamWebsterError) {
    const status = error.name === "InvalidKeyError" ? 503 : 502;
    return Response.json(
      {
        success: false,
        error: {
          code: "UPSTREAM_ERROR",
          message: "Dictionary service temporarily unavailable",
        },
        rateLimit: {
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          resetsAt: rateLimit.resetsAt,
        },
      } satisfies APIErrorResponse,
      { status }
    );
  }

  throw error; // Let outer handler catch unexpected errors
}

/**
 * Validate word input from URL.
 * Returns error response if invalid, null if valid.
 */
export function validateWord(word: string): Response | null {
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
  return null; // Valid
}
