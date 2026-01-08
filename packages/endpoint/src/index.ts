/**
 * Merriam-Webster API Cloudflare Worker
 *
 * This worker provides a rate-limited, cached proxy to the MW Dictionary
 * and Thesaurus APIs.
 *
 * Endpoints:
 * - GET /define/:word - Dictionary lookup
 * - GET /synonyms/:word - Thesaurus lookup
 * - GET /health - Health check
 * - GET /rate-limit/status - Current rate limit status
 * - DELETE /cache/:type/:word - Cache invalidation (admin only)
 */

import { handleRequest } from "./worker.js";
import { RateLimiter } from "./rate-limiter.js";
import type { Env } from "./types.js";

// Export Durable Object class for wrangler
export { RateLimiter };

// Export default fetch handler
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return handleRequest(request, env, ctx);
  },
};
