import type { Env, APIErrorResponse, RateLimitStatus } from "./types.js";
import { validateUserAuth, validateAdminAuth } from "./auth.js";
import { handlePreflight, withCors } from "./cors.js";
import { handleDefine } from "./handlers/define.js";
import { handleSynonyms } from "./handlers/synonyms.js";
import { handleCacheDelete } from "./handlers/admin.js";

const RATE_LIMITER_ID = "global";

/**
 * Main request handler for the worker.
 *
 * Flow:
 * 1. CORS preflight → immediate response
 * 2. Route matching
 * 3. Auth check (per-route requirements)
 * 4. Delegate to handler
 * 5. Return with CORS headers
 */
export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const origin = request.headers.get("Origin");

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return handlePreflight(request, env);
  }

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Health check (no auth)
    if (path === "/health") {
      return withCors(handleHealth(), env, origin);
    }

    // Rate limit status (user auth)
    if (path === "/rate-limit/status") {
      if (!validateUserAuth(request, env)) {
        return withCors(unauthorizedResponse(), env, origin);
      }
      return withCors(await handleRateLimitStatus(env), env, origin);
    }

    // Dictionary lookup (user auth)
    if (path.startsWith("/define/")) {
      if (!validateUserAuth(request, env)) {
        return withCors(unauthorizedResponse(), env, origin);
      }
      return withCors(await handleDefine(request, env, ctx), env, origin);
    }

    // Thesaurus lookup (user auth)
    if (path.startsWith("/synonyms/")) {
      if (!validateUserAuth(request, env)) {
        return withCors(unauthorizedResponse(), env, origin);
      }
      return withCors(await handleSynonyms(request, env, ctx), env, origin);
    }

    // Cache invalidation (admin auth)
    if (path.startsWith("/cache/") && request.method === "DELETE") {
      if (!validateAdminAuth(request, env)) {
        return withCors(forbiddenResponse(), env, origin);
      }
      return withCors(await handleCacheDelete(request, env), env, origin);
    }

    // Not found
    return withCors(notFoundResponse(), env, origin);
  } catch (error) {
    console.error("Unhandled error:", error);
    return withCors(internalErrorResponse(), env, origin);
  }
}

/**
 * Health check handler.
 */
function handleHealth(): Response {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Rate limit status handler.
 */
async function handleRateLimitStatus(env: Env): Promise<Response> {
  const id = env.RATE_LIMITER.idFromName(RATE_LIMITER_ID);
  const stub = env.RATE_LIMITER.get(id);
  const response = await stub.fetch(new Request("http://do/status"));
  const status: RateLimitStatus = await response.json();

  return Response.json({
    success: true,
    data: status,
  });
}

/**
 * 401 Unauthorized response.
 */
function unauthorizedResponse(): Response {
  return Response.json(
    {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or missing API key",
      },
    } satisfies APIErrorResponse,
    { status: 401 }
  );
}

/**
 * 403 Forbidden response.
 */
function forbiddenResponse(): Response {
  return Response.json(
    {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Admin access required",
      },
    } satisfies APIErrorResponse,
    { status: 403 }
  );
}

/**
 * 404 Not Found response.
 */
function notFoundResponse(): Response {
  return Response.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Endpoint not found",
      },
    } satisfies APIErrorResponse,
    { status: 404 }
  );
}

/**
 * 500 Internal Error response.
 */
function internalErrorResponse(): Response {
  return Response.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    } satisfies APIErrorResponse,
    { status: 500 }
  );
}
