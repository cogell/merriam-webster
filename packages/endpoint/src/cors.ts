import type { Env } from "./types.js";

/**
 * Standard CORS headers for API responses.
 */
export function corsHeaders(
  env: Env,
  origin?: string | null
): HeadersInit {
  const allowedOrigins = env.ALLOWED_ORIGINS || "*";

  // If specific origins configured, validate the request origin
  let allowOrigin = "*";
  if (allowedOrigins !== "*" && origin) {
    const origins = allowedOrigins.split(",").map((o) => o.trim());
    if (origins.includes(origin)) {
      allowOrigin = origin;
    } else {
      // Origin not in allowed list - still set header but to first allowed
      // This will cause browser to reject the response
      allowOrigin = origins[0];
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
  };
}

/**
 * Handle CORS preflight (OPTIONS) request.
 *
 * Browsers send this before actual requests with custom headers.
 */
export function handlePreflight(request: Request, env: Env): Response {
  const origin = request.headers.get("Origin");

  return new Response(null, {
    status: 204,
    headers: corsHeaders(env, origin),
  });
}

/**
 * Add CORS headers to an existing response.
 *
 * Use this to wrap handler responses.
 */
export function withCors(
  response: Response,
  env: Env,
  origin?: string | null
): Response {
  const newHeaders = new Headers(response.headers);

  for (const [key, value] of Object.entries(corsHeaders(env, origin))) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
