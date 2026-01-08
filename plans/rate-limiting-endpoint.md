# Rate-Limiting Cloudflare Worker for Merriam-Webster API

## Overview

CF Worker endpoint that proxies MW API with:
- **API key auth** (single shared key via `Authorization: Bearer`)
- **Smart KV caching**:
  - Found responses: cached forever
  - Not-found responses: cached 24h TTL (allows MW to add new words)
- **Daily rate limit** (1000 req/day, hard reset at midnight UTC)
- **Durable Objects** for consistent rate limiting state
- **CORS support** for browser clients
- **Admin endpoint** to invalidate cache (separate ADMIN_API_KEY)

## Architecture

```
Request
  ↓
┌─────────────────────────────────────┐
│ 1. Auth Check                       │ → 401 if invalid
│    (Authorization: Bearer header)   │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 2. KV Cache Check                   │ → Return cached (no rate limit hit)
│    key: "define|word" / "synonyms|word"
└─────────────────────────────────────┘
  ↓ (cache miss)
┌─────────────────────────────────────┐
│ 3. Rate Limit Check (Durable Obj)   │ → 429 if limit exceeded
│    Daily counter, reset at 00:00 UTC│
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 4. Call MW API via lib              │
│    MerriamWebster.define/synonyms   │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ 5. Cache response in KV (forever)   │
└─────────────────────────────────────┘
  ↓
Return response
```

## File Structure

```
packages/endpoint/
├── src/
│   ├── index.ts           # Worker entry + DO export
│   ├── worker.ts          # Main fetch handler, routing
│   ├── auth.ts            # API key validation (user + admin)
│   ├── cache.ts           # KV cache get/set/delete helpers
│   ├── cors.ts            # CORS preflight + headers
│   ├── rate-limiter.ts    # RateLimiter Durable Object (daily counter)
│   ├── handlers/
│   │   ├── define.ts      # GET /define/:word
│   │   ├── synonyms.ts    # GET /synonyms/:word
│   │   └── admin.ts       # DELETE /cache/:type/:word (admin only)
│   └── types.ts           # Env, response types
├── wrangler.toml          # CF Worker config
├── package.json           # Simplified (worker only, no library exports)
├── tsconfig.json          # Updated for Workers types
└── vitest.config.ts       # CF Workers test pool
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/define/:word` | WORKER_API_KEY | Dictionary lookup |
| GET | `/synonyms/:word` | WORKER_API_KEY | Thesaurus lookup |
| GET | `/health` | None | Health check for load balancers |
| GET | `/rate-limit/status` | WORKER_API_KEY | Current rate limit status |
| DELETE | `/cache/:type/:word` | ADMIN_API_KEY | Invalidate cache entry |
| OPTIONS | `*` | None | CORS preflight |

## Key Changes from Original Plan

| Aspect | Original | Revised |
|--------|----------|---------|
| Package type | Library + Worker | **Worker only** (remove tsup) |
| Caching | Cache-Control headers | **KV cache forever** (cache check before rate limit) |
| Rate limit | Token bucket (continuous refill) | **Daily counter** (reset at midnight UTC) |
| Auth | None | **Bearer token** (single shared key) |

## Implementation Steps

### 1. Simplify package.json (worker only)

Remove tsup, library exports. Keep only:
```json
{
  "name": "@merriam-webster/endpoint",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest"
  },
  "dependencies": {
    "@merriam-webster/lib": "workspace:*"
  },
  "devDependencies": {
    "wrangler": "^3.91.0",
    "@cloudflare/workers-types": "^4.20241127.0",
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "vitest": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 2. Create wrangler.toml

```toml
name = "merriam-webster-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# KV namespace for caching
[[kv_namespaces]]
binding = "CACHE"
id = "xxx"  # Created via: wrangler kv:namespace create CACHE

# Durable Objects for rate limiting
[durable_objects]
bindings = [{ name = "RATE_LIMITER", class_name = "RateLimiter" }]

[[migrations]]
tag = "v1"
new_classes = ["RateLimiter"]

[vars]
DAILY_REQUEST_LIMIT = "1000"
```

**Secrets (via CLI):**
```bash
wrangler secret put MW_DICTIONARY_KEY
wrangler secret put MW_THESAURUS_KEY
wrangler secret put WORKER_API_KEY   # Auth key for API consumers
wrangler secret put ADMIN_API_KEY    # Separate key for cache admin
```

### 3. Create types.ts

```typescript
export interface Env {
  // KV namespace
  CACHE: KVNamespace;

  // Durable Object
  RATE_LIMITER: DurableObjectNamespace;

  // Secrets
  MW_DICTIONARY_KEY: string;
  MW_THESAURUS_KEY: string;
  WORKER_API_KEY: string;
  ADMIN_API_KEY: string;

  // Config
  DAILY_REQUEST_LIMIT?: string;
  ALLOWED_ORIGINS?: string;  // Comma-separated list for CORS
}

export interface CachedResponse {
  data: unknown;
  cachedAt: string;  // ISO timestamp
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: string;  // ISO timestamp (next midnight UTC)
}
```

### 4. Create auth.ts

```typescript
export function validateAuth(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  return token === env.WORKER_API_KEY;
}
```

### 5. Create cache.ts

```typescript
// KV cache helpers
const NOT_FOUND_TTL = 60 * 60 * 24; // 24 hours in seconds

export function getCacheKey(type: 'define' | 'synonyms', word: string): string {
  // Use pipe separator (safe - not in words) to avoid key collision
  return `${type}|${word.toLowerCase()}`;
}

export async function getCached(
  kv: KVNamespace,
  type: 'define' | 'synonyms',
  word: string
): Promise<CachedResponse | null> {
  return kv.get(getCacheKey(type, word), 'json');
}

export async function setCache(
  kv: KVNamespace,
  type: 'define' | 'synonyms',
  word: string,
  data: unknown,
  found: boolean
): Promise<void> {
  const key = getCacheKey(type, word);
  const value = JSON.stringify({
    data,
    cachedAt: new Date().toISOString(),
    found
  });

  // Found responses: cache forever. Not-found: 24h TTL
  const options = found ? {} : { expirationTtl: NOT_FOUND_TTL };
  await kv.put(key, value, options);
}

export async function deleteCache(
  kv: KVNamespace,
  type: 'define' | 'synonyms',
  word: string
): Promise<void> {
  await kv.delete(getCacheKey(type, word));
}
```

### 6. Create rate-limiter.ts (Daily Counter)

```typescript
export class RateLimiter implements DurableObject {
  private state: DurableObjectState;
  private limit: number;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.limit = parseInt(env.DAILY_REQUEST_LIMIT || '1000', 10);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/check') {
      return this.checkAndIncrement();
    }
    if (url.pathname === '/status') {
      return this.getStatus();
    }

    return new Response('Not Found', { status: 404 });
  }

  private async checkAndIncrement(): Promise<Response> {
    const today = this.getTodayUTC();
    const stored = await this.state.storage.get<{ date: string; count: number }>('counter');

    let count = 0;
    if (stored && stored.date === today) {
      count = stored.count;
    }
    // New day = reset to 0

    if (count >= this.limit) {
      return Response.json({
        allowed: false,
        remaining: 0,
        limit: this.limit,
        resetsAt: this.getNextMidnightUTC()
      });
    }

    // Increment and save
    await this.state.storage.put('counter', { date: today, count: count + 1 });

    return Response.json({
      allowed: true,
      remaining: this.limit - count - 1,
      limit: this.limit,
      resetsAt: this.getNextMidnightUTC()
    });
  }

  private async getStatus(): Promise<Response> {
    const today = this.getTodayUTC();
    const stored = await this.state.storage.get<{ date: string; count: number }>('counter');

    let count = 0;
    if (stored && stored.date === today) {
      count = stored.count;
    }

    return Response.json({
      remaining: this.limit - count,
      limit: this.limit,
      resetsAt: this.getNextMidnightUTC()
    });
  }

  private getTodayUTC(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private getNextMidnightUTC(): string {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }
}
```

### 7. Create worker.ts (main handler)

Flow:
1. CORS preflight handling
2. Auth check → 401
3. Route matching
4. KV cache check → return if hit
5. Rate limit check → 429 if exceeded
6. Call MW API
7. Cache response in KV
8. Return response

### 8. Create handlers

Each handler:
- Receives pre-validated request
- Gets word from URL
- Checks cache (via helper)
- If miss: check rate limit, call MW API, cache result
- Return standardized response

### 9. Delete tsup.config.ts

No longer needed - wrangler handles bundling.

### 10. Update tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["@cloudflare/workers-types"],
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

## Response Format

### Success (200)
```json
{
  "success": true,
  "data": { "found": true, "entries": [...] },
  "cached": true,
  "rateLimit": {
    "remaining": 998,
    "limit": 1000,
    "resetsAt": "2024-01-02T00:00:00.000Z"
  }
}
```

### Rate Limited (429)
```json
{
  "success": false,
  "error": { "code": "RATE_LIMITED", "message": "Daily limit exceeded" },
  "rateLimit": { "remaining": 0, "limit": 1000, "resetsAt": "..." }
}
```

Headers: `Retry-After`, `X-RateLimit-*`

### Unauthorized (401)
```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Invalid or missing API key" }
}
```

## Critical Files

| File | Action |
|------|--------|
| `packages/endpoint/package.json` | Simplify (remove tsup, library exports) |
| `packages/endpoint/tsup.config.ts` | **Delete** |
| `packages/endpoint/wrangler.toml` | Create |
| `packages/endpoint/src/types.ts` | Create |
| `packages/endpoint/src/auth.ts` | Create (user + admin validation) |
| `packages/endpoint/src/cache.ts` | Create (with TTL support) |
| `packages/endpoint/src/cors.ts` | Create |
| `packages/endpoint/src/rate-limiter.ts` | Create |
| `packages/endpoint/src/worker.ts` | Create |
| `packages/endpoint/src/handlers/define.ts` | Create |
| `packages/endpoint/src/handlers/synonyms.ts` | Create |
| `packages/endpoint/src/handlers/admin.ts` | Create (cache invalidation) |
| `packages/endpoint/src/index.ts` | Replace |
| `packages/endpoint/tsconfig.json` | Update |
| `packages/endpoint/vitest.config.ts` | Update for CF Workers |

## Deployment

```bash
# Create KV namespace
wrangler kv:namespace create CACHE
# Update wrangler.toml with returned ID

# Set secrets
wrangler secret put MW_DICTIONARY_KEY
wrangler secret put MW_THESAURUS_KEY
wrangler secret put WORKER_API_KEY
wrangler secret put ADMIN_API_KEY

# Deploy
pnpm --filter @merriam-webster/endpoint deploy
```

## Decisions Made

| Question | Decision |
|----------|----------|
| tsup vs wrangler | Wrangler only (worker deployment) |
| Caching: found responses | Cache forever in KV |
| Caching: not-found responses | Cache with 24h TTL (allows MW to add new words) |
| Cache invalidation | Admin endpoint `DELETE /cache/:type/:word` |
| Rate limit algorithm | Daily counter with midnight UTC reset |
| Rate limit on MW failure | No refund (simple - accept the loss) |
| Authentication | Bearer token in header |
| User vs Admin auth | Separate keys (WORKER_API_KEY vs ADMIN_API_KEY) |
| Consumers | Both server-side (skill) and browser clients |
| CORS | Enabled, configurable origins via ALLOWED_ORIGINS |
| Package purpose | Worker deployment only, not a library |
