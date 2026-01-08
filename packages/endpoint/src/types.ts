/**
 * Cloudflare Worker environment bindings.
 *
 * These are configured in wrangler.toml and injected at runtime.
 * Secrets are set via: wrangler secret put <NAME>
 */
export interface Env {
  // KV namespace for caching MW API responses
  CACHE: KVNamespace;

  // Durable Object namespace for rate limiting
  RATE_LIMITER: DurableObjectNamespace;

  // MW API credentials (secrets)
  MW_DICTIONARY_KEY: string;
  MW_THESAURUS_KEY: string;

  // Worker API authentication (secrets)
  WORKER_API_KEY: string; // For regular API consumers
  ADMIN_API_KEY: string; // For cache invalidation

  // Configuration (vars in wrangler.toml)
  DAILY_REQUEST_LIMIT?: string; // Default: "1000"
  ALLOWED_ORIGINS?: string; // Comma-separated, default: "*"
}

/**
 * Cached response stored in KV.
 */
export interface CachedResponse {
  /** The MW API response data */
  data: unknown;
  /** ISO timestamp when cached */
  cachedAt: string;
  /** Whether the word was found (affects TTL) */
  found: boolean;
}

/**
 * Rate limit check result from Durable Object.
 */
export interface RateLimitStatus {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests today */
  remaining: number;
  /** Daily limit */
  limit: number;
  /** ISO timestamp of next reset (midnight UTC) */
  resetsAt: string;
}

/**
 * Standardized API success response.
 */
export interface APISuccessResponse<T> {
  success: true;
  data: T;
  cached: boolean;
  rateLimit: {
    remaining: number;
    limit: number;
    resetsAt: string;
  };
}

/**
 * Standardized API error response.
 */
export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  rateLimit?: {
    remaining: number;
    limit: number;
    resetsAt: string;
  };
}

export type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse;
