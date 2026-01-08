import type { Env } from "./types.js";

/**
 * Authentication result with the type of auth that succeeded.
 */
export type AuthResult =
  | { valid: true; type: "user" | "admin" }
  | { valid: false };

/**
 * Extract Bearer token from Authorization header.
 */
function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

/**
 * Validate request has valid user API key.
 *
 * @example
 * if (!validateUserAuth(request, env)) {
 *   return unauthorizedResponse();
 * }
 */
export function validateUserAuth(request: Request, env: Env): boolean {
  const token = extractBearerToken(request);
  return token === env.WORKER_API_KEY;
}

/**
 * Validate request has valid admin API key.
 *
 * Admin key is required for destructive operations like cache invalidation.
 */
export function validateAdminAuth(request: Request, env: Env): boolean {
  const token = extractBearerToken(request);
  return token === env.ADMIN_API_KEY;
}

/**
 * Validate request has either user or admin auth.
 * Returns which type of auth succeeded.
 *
 * Useful when an endpoint allows both but wants to know which.
 */
export function validateAuth(request: Request, env: Env): AuthResult {
  const token = extractBearerToken(request);

  if (token === env.ADMIN_API_KEY) {
    return { valid: true, type: "admin" };
  }

  if (token === env.WORKER_API_KEY) {
    return { valid: true, type: "user" };
  }

  return { valid: false };
}
