var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-x3oEA1/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-x3oEA1/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/auth.ts
function extractBearerToken(request) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer "))
    return null;
  return auth.slice(7);
}
__name(extractBearerToken, "extractBearerToken");
function validateUserAuth(request, env) {
  const token = extractBearerToken(request);
  return token === env.WORKER_API_KEY;
}
__name(validateUserAuth, "validateUserAuth");
function validateAdminAuth(request, env) {
  const token = extractBearerToken(request);
  return token === env.ADMIN_API_KEY;
}
__name(validateAdminAuth, "validateAdminAuth");

// src/cors.ts
function corsHeaders(env, origin) {
  const allowedOrigins = env.ALLOWED_ORIGINS || "*";
  let allowOrigin = "*";
  if (allowedOrigins !== "*" && origin) {
    const origins = allowedOrigins.split(",").map((o) => o.trim());
    if (origins.includes(origin)) {
      allowOrigin = origin;
    } else {
      allowOrigin = origins[0];
    }
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
    // Cache preflight for 24 hours
  };
}
__name(corsHeaders, "corsHeaders");
function handlePreflight(request, env) {
  const origin = request.headers.get("Origin");
  return new Response(null, {
    status: 204,
    headers: corsHeaders(env, origin)
  });
}
__name(handlePreflight, "handlePreflight");
function withCors(response, env, origin) {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(env, origin))) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
__name(withCors, "withCors");

// ../lib/dist/index.js
function isDictionaryEntries(response) {
  if (!Array.isArray(response) || response.length === 0) {
    return false;
  }
  return typeof response[0] === "object" && response[0] !== null && "meta" in response[0];
}
__name(isDictionaryEntries, "isDictionaryEntries");
function isThesaurusEntries(response) {
  if (!Array.isArray(response) || response.length === 0) {
    return false;
  }
  return typeof response[0] === "object" && response[0] !== null && "meta" in response[0];
}
__name(isThesaurusEntries, "isThesaurusEntries");
var MerriamWebsterError = /* @__PURE__ */ __name(class extends Error {
  constructor(message) {
    super(message);
    this.name = "MerriamWebsterError";
  }
}, "MerriamWebsterError");
var TimeoutError = /* @__PURE__ */ __name(class extends MerriamWebsterError {
  constructor(timeout) {
    super(`Request timed out after ${timeout}ms`);
    this.name = "TimeoutError";
    this.timeout = timeout;
  }
}, "TimeoutError");
var NetworkError = /* @__PURE__ */ __name(class extends MerriamWebsterError {
  constructor(message, cause) {
    super(message);
    this.name = "NetworkError";
    this.cause = cause;
  }
}, "NetworkError");
var InvalidKeyError = /* @__PURE__ */ __name(class extends MerriamWebsterError {
  constructor(endpoint) {
    super(
      `Invalid or missing API key for ${endpoint}. Get your free API key at https://dictionaryapi.com/register/index`
    );
    this.name = "InvalidKeyError";
  }
}, "InvalidKeyError");
var APIError = /* @__PURE__ */ __name(class extends MerriamWebsterError {
  constructor(status, statusText) {
    super(`API error: HTTP ${status} ${statusText}`);
    this.name = "APIError";
    this.status = status;
    this.statusText = statusText;
  }
}, "APIError");
var API_BASE_URL = "https://www.dictionaryapi.com/api/v3/references";
var DEFAULT_TIMEOUT = 1e4;
var MerriamWebster = /* @__PURE__ */ __name(class {
  /**
   * Create a new MerriamWebster client.
   *
   * @param config - Client configuration
   * @throws Error if neither dictionaryKey nor thesaurusKey is provided
   */
  constructor(config) {
    if (!config.dictionaryKey && !config.thesaurusKey) {
      throw new Error(
        "MerriamWebster: At least one of dictionaryKey or thesaurusKey is required"
      );
    }
    this.dictionaryKey = config.dictionaryKey;
    this.thesaurusKey = config.thesaurusKey;
    this.defaultTimeout = config.timeout ?? DEFAULT_TIMEOUT;
  }
  /**
   * Look up a word in the dictionary.
   *
   * @param word - The word to look up
   * @param options - Request options (timeout, signal)
   * @returns Result with entries if found, or suggestions if not found
   * @throws Error if dictionaryKey was not configured
   * @throws TimeoutError if request times out
   * @throws NetworkError if network request fails
   * @throws InvalidKeyError if API key is invalid
   * @throws APIError for other HTTP errors
   *
   * @example
   * ```ts
   * const result = await mw.define('test');
   * if (result.found) {
   *   console.log(result.entries[0].shortdef);
   * } else {
   *   console.log('Did you mean:', result.suggestions.join(', '));
   * }
   * ```
   */
  async define(word, options) {
    if (!this.dictionaryKey) {
      throw new Error("MerriamWebster: dictionaryKey is required for define()");
    }
    const response = await this.request(
      "collegiate",
      word,
      this.dictionaryKey,
      options
    );
    if (isDictionaryEntries(response)) {
      return { found: true, entries: response };
    }
    return { found: false, suggestions: response };
  }
  /**
   * Look up synonyms for a word in the thesaurus.
   *
   * @param word - The word to look up
   * @param options - Request options (timeout, signal)
   * @returns Result with entries if found, or suggestions if not found
   * @throws Error if thesaurusKey was not configured
   * @throws TimeoutError if request times out
   * @throws NetworkError if network request fails
   * @throws InvalidKeyError if API key is invalid
   * @throws APIError for other HTTP errors
   *
   * @example
   * ```ts
   * const result = await mw.synonyms('happy');
   * if (result.found) {
   *   console.log(result.entries[0].meta.syns);
   * }
   * ```
   */
  async synonyms(word, options) {
    if (!this.thesaurusKey) {
      throw new Error("MerriamWebster: thesaurusKey is required for synonyms()");
    }
    const response = await this.request(
      "thesaurus",
      word,
      this.thesaurusKey,
      options
    );
    if (isThesaurusEntries(response)) {
      return { found: true, entries: response };
    }
    return { found: false, suggestions: response };
  }
  /**
   * Make an API request with timeout handling.
   *
   * @param endpoint - API endpoint ('collegiate' or 'thesaurus')
   * @param word - Word to look up
   * @param apiKey - API key for authentication
   * @param options - Request options
   * @returns Parsed JSON response
   * @throws TimeoutError if request times out
   * @throws NetworkError if network request fails
   * @throws InvalidKeyError if API key is invalid (403)
   * @throws APIError for other HTTP errors
   */
  async request(endpoint, word, apiKey, options) {
    const timeout = options?.timeout ?? this.defaultTimeout;
    const encodedWord = encodeURIComponent(word);
    const url = `${API_BASE_URL}/${endpoint}/json/${encodedWord}?key=${apiKey}`;
    const controller = new AbortController();
    let timeoutId;
    if (!options?.signal) {
      timeoutId = setTimeout(() => controller.abort(), timeout);
    }
    const signal = options?.signal ?? controller.signal;
    try {
      const response = await fetch(url, { signal });
      if (response.status === 403) {
        throw new InvalidKeyError(endpoint === "collegiate" ? "dictionary" : "thesaurus");
      }
      if (!response.ok) {
        throw new APIError(response.status, response.statusText);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof TimeoutError || error instanceof NetworkError || error instanceof InvalidKeyError || error instanceof APIError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        if (!options?.signal) {
          throw new TimeoutError(timeout);
        }
        throw error;
      }
      if (error instanceof Error) {
        throw new NetworkError(error.message, error);
      }
      throw new NetworkError("Unknown network error");
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}, "MerriamWebster");

// src/cache.ts
var NOT_FOUND_TTL = 60 * 60 * 24;
function getCacheKey(type, word) {
  return `${type}|${word.toLowerCase()}`;
}
__name(getCacheKey, "getCacheKey");
async function getCached(kv, type, word) {
  const key = getCacheKey(type, word);
  return kv.get(key, "json");
}
__name(getCached, "getCached");
async function setCache(kv, type, word, data, found) {
  const key = getCacheKey(type, word);
  const value = {
    data,
    cachedAt: (/* @__PURE__ */ new Date()).toISOString(),
    found
  };
  const options = found ? {} : { expirationTtl: NOT_FOUND_TTL };
  await kv.put(key, JSON.stringify(value), options);
}
__name(setCache, "setCache");
async function deleteCache(kv, type, word) {
  const key = getCacheKey(type, word);
  await kv.delete(key);
}
__name(deleteCache, "deleteCache");
async function hasCache(kv, type, word) {
  const key = getCacheKey(type, word);
  const metadata = await kv.getWithMetadata(key);
  return metadata.value !== null;
}
__name(hasCache, "hasCache");

// src/handlers/shared.ts
var RATE_LIMITER_ID = "global";
async function checkRateLimit(env) {
  const id = env.RATE_LIMITER.idFromName(RATE_LIMITER_ID);
  const stub = env.RATE_LIMITER.get(id);
  const response = await stub.fetch(new Request("http://do/check"));
  return response.json();
}
__name(checkRateLimit, "checkRateLimit");
async function getRateLimitStatus(env) {
  const id = env.RATE_LIMITER.idFromName(RATE_LIMITER_ID);
  const stub = env.RATE_LIMITER.get(id);
  const response = await stub.fetch(new Request("http://do/status"));
  return response.json();
}
__name(getRateLimitStatus, "getRateLimitStatus");
function rateLimitedResponse(rateLimit) {
  const retryAfter = Math.ceil(
    (new Date(rateLimit.resetsAt).getTime() - Date.now()) / 1e3
  );
  return Response.json(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Daily API limit exceeded. Try again tomorrow."
      },
      rateLimit: {
        remaining: 0,
        limit: rateLimit.limit,
        resetsAt: rateLimit.resetsAt
      }
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": rateLimit.resetsAt
      }
    }
  );
}
__name(rateLimitedResponse, "rateLimitedResponse");
function handleMWError(error, rateLimit) {
  if (error instanceof MerriamWebsterError) {
    const status = error.name === "InvalidKeyError" ? 503 : 502;
    return Response.json(
      {
        success: false,
        error: {
          code: "UPSTREAM_ERROR",
          message: "Dictionary service temporarily unavailable"
        },
        rateLimit: {
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          resetsAt: rateLimit.resetsAt
        }
      },
      { status }
    );
  }
  throw error;
}
__name(handleMWError, "handleMWError");
function validateWord(word) {
  if (!word || word.length > 100) {
    return Response.json(
      {
        success: false,
        error: {
          code: "INVALID_WORD",
          message: "Word must be 1-100 characters"
        }
      },
      { status: 400 }
    );
  }
  return null;
}
__name(validateWord, "validateWord");

// src/handlers/define.ts
async function handleDefine(request, env, ctx) {
  const url = new URL(request.url);
  const word = decodeURIComponent(url.pathname.replace("/define/", ""));
  const invalid = validateWord(word);
  if (invalid)
    return invalid;
  const cached = await getCached(env.CACHE, "define", word);
  if (cached) {
    const rateLimit2 = await getRateLimitStatus(env);
    return Response.json(
      {
        success: true,
        data: cached.data,
        cached: true,
        rateLimit: {
          remaining: rateLimit2.remaining,
          limit: rateLimit2.limit,
          resetsAt: rateLimit2.resetsAt
        }
      },
      {
        status: 200,
        headers: { "X-Cache": "HIT" }
      }
    );
  }
  const rateLimit = await checkRateLimit(env);
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit);
  }
  try {
    const mw = new MerriamWebster({
      dictionaryKey: env.MW_DICTIONARY_KEY
    });
    const result = await mw.define(word);
    ctx.waitUntil(setCache(env.CACHE, "define", word, result, result.found));
    return Response.json(
      {
        success: true,
        data: result,
        cached: false,
        rateLimit: {
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          resetsAt: rateLimit.resetsAt
        }
      },
      {
        status: 200,
        headers: { "X-Cache": "MISS" }
      }
    );
  } catch (error) {
    return handleMWError(error, rateLimit);
  }
}
__name(handleDefine, "handleDefine");

// src/handlers/synonyms.ts
async function handleSynonyms(request, env, ctx) {
  const url = new URL(request.url);
  const word = decodeURIComponent(url.pathname.replace("/synonyms/", ""));
  const invalid = validateWord(word);
  if (invalid)
    return invalid;
  const cached = await getCached(env.CACHE, "synonyms", word);
  if (cached) {
    const rateLimit2 = await getRateLimitStatus(env);
    return Response.json(
      {
        success: true,
        data: cached.data,
        cached: true,
        rateLimit: {
          remaining: rateLimit2.remaining,
          limit: rateLimit2.limit,
          resetsAt: rateLimit2.resetsAt
        }
      },
      {
        status: 200,
        headers: { "X-Cache": "HIT" }
      }
    );
  }
  const rateLimit = await checkRateLimit(env);
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit);
  }
  try {
    const mw = new MerriamWebster({
      thesaurusKey: env.MW_THESAURUS_KEY
    });
    const result = await mw.synonyms(word);
    ctx.waitUntil(setCache(env.CACHE, "synonyms", word, result, result.found));
    return Response.json(
      {
        success: true,
        data: result,
        cached: false,
        rateLimit: {
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          resetsAt: rateLimit.resetsAt
        }
      },
      {
        status: 200,
        headers: { "X-Cache": "MISS" }
      }
    );
  } catch (error) {
    return handleMWError(error, rateLimit);
  }
}
__name(handleSynonyms, "handleSynonyms");

// src/handlers/admin.ts
async function handleCacheDelete(request, env) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/cache\/(define|synonyms)\/(.+)$/);
  if (!match) {
    return Response.json(
      {
        success: false,
        error: {
          code: "INVALID_PATH",
          message: "Path must be /cache/{define|synonyms}/{word}"
        }
      },
      { status: 400 }
    );
  }
  const type = match[1];
  const word = decodeURIComponent(match[2]);
  if (!word || word.length > 100) {
    return Response.json(
      {
        success: false,
        error: {
          code: "INVALID_WORD",
          message: "Word must be 1-100 characters"
        }
      },
      { status: 400 }
    );
  }
  const exists = await hasCache(env.CACHE, type, word);
  if (!exists) {
    return Response.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: `No cached entry for ${type}:${word}`
        }
      },
      { status: 404 }
    );
  }
  await deleteCache(env.CACHE, type, word);
  return Response.json(
    {
      success: true,
      data: {
        deleted: true,
        type,
        word,
        key: getCacheKey(type, word)
      }
    },
    { status: 200 }
  );
}
__name(handleCacheDelete, "handleCacheDelete");

// src/worker.ts
var RATE_LIMITER_ID2 = "global";
async function handleRequest(request, env, ctx) {
  const origin = request.headers.get("Origin");
  if (request.method === "OPTIONS") {
    return handlePreflight(request, env);
  }
  const url = new URL(request.url);
  const path = url.pathname;
  try {
    if (path === "/health") {
      return withCors(handleHealth(), env, origin);
    }
    if (path === "/rate-limit/status") {
      if (!validateUserAuth(request, env)) {
        return withCors(unauthorizedResponse(), env, origin);
      }
      return withCors(await handleRateLimitStatus(env), env, origin);
    }
    if (path.startsWith("/define/")) {
      if (!validateUserAuth(request, env)) {
        return withCors(unauthorizedResponse(), env, origin);
      }
      return withCors(await handleDefine(request, env, ctx), env, origin);
    }
    if (path.startsWith("/synonyms/")) {
      if (!validateUserAuth(request, env)) {
        return withCors(unauthorizedResponse(), env, origin);
      }
      return withCors(await handleSynonyms(request, env, ctx), env, origin);
    }
    if (path.startsWith("/cache/") && request.method === "DELETE") {
      if (!validateAdminAuth(request, env)) {
        return withCors(forbiddenResponse(), env, origin);
      }
      return withCors(await handleCacheDelete(request, env), env, origin);
    }
    return withCors(notFoundResponse(), env, origin);
  } catch (error) {
    console.error("Unhandled error:", error);
    return withCors(internalErrorResponse(), env, origin);
  }
}
__name(handleRequest, "handleRequest");
function handleHealth() {
  return Response.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
__name(handleHealth, "handleHealth");
async function handleRateLimitStatus(env) {
  const id = env.RATE_LIMITER.idFromName(RATE_LIMITER_ID2);
  const stub = env.RATE_LIMITER.get(id);
  const response = await stub.fetch(new Request("http://do/status"));
  const status = await response.json();
  return Response.json({
    success: true,
    data: status
  });
}
__name(handleRateLimitStatus, "handleRateLimitStatus");
function unauthorizedResponse() {
  return Response.json(
    {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or missing API key"
      }
    },
    { status: 401 }
  );
}
__name(unauthorizedResponse, "unauthorizedResponse");
function forbiddenResponse() {
  return Response.json(
    {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Admin access required"
      }
    },
    { status: 403 }
  );
}
__name(forbiddenResponse, "forbiddenResponse");
function notFoundResponse() {
  return Response.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Endpoint not found"
      }
    },
    { status: 404 }
  );
}
__name(notFoundResponse, "notFoundResponse");
function internalErrorResponse() {
  return Response.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred"
      }
    },
    { status: 500 }
  );
}
__name(internalErrorResponse, "internalErrorResponse");

// src/rate-limiter.ts
var RateLimiter = class {
  state;
  limit;
  constructor(state, env) {
    this.state = state;
    this.limit = parseInt(env.DAILY_REQUEST_LIMIT || "1000", 10);
  }
  /**
   * Handle incoming requests to the Durable Object.
   *
   * Endpoints:
   * - GET /check - Check rate limit and increment counter (atomic)
   * - GET /status - Get current status without incrementing
   */
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/check") {
      return this.checkAndIncrement();
    }
    if (url.pathname === "/status") {
      return this.getStatus();
    }
    return new Response("Not Found", { status: 404 });
  }
  /**
   * Check if request is allowed and increment counter atomically.
   *
   * If it's a new day (UTC), the counter resets automatically.
   */
  async checkAndIncrement() {
    const today = this.getTodayUTC();
    const stored = await this.state.storage.get("counter");
    let count = 0;
    if (stored && stored.date === today) {
      count = stored.count;
    }
    if (count >= this.limit) {
      return Response.json({
        allowed: false,
        remaining: 0,
        limit: this.limit,
        resetsAt: this.getNextMidnightUTC()
      });
    }
    await this.state.storage.put("counter", {
      date: today,
      count: count + 1
    });
    return Response.json({
      allowed: true,
      remaining: this.limit - count - 1,
      limit: this.limit,
      resetsAt: this.getNextMidnightUTC()
    });
  }
  /**
   * Get current rate limit status without incrementing.
   *
   * Used for /rate-limit/status endpoint.
   */
  async getStatus() {
    const today = this.getTodayUTC();
    const stored = await this.state.storage.get("counter");
    let count = 0;
    if (stored && stored.date === today) {
      count = stored.count;
    }
    return Response.json({
      allowed: true,
      // Status check doesn't consume
      remaining: this.limit - count,
      limit: this.limit,
      resetsAt: this.getNextMidnightUTC()
    });
  }
  /**
   * Get today's date in UTC as YYYY-MM-DD.
   */
  getTodayUTC() {
    return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  }
  /**
   * Get ISO timestamp of next midnight UTC.
   */
  getNextMidnightUTC() {
    const tomorrow = /* @__PURE__ */ new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }
};
__name(RateLimiter, "RateLimiter");

// src/index.ts
var src_default = {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};

// ../../node_modules/.pnpm/wrangler@3.114.16_@cloudflare+workers-types@4.20260108.0/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/.pnpm/wrangler@3.114.16_@cloudflare+workers-types@4.20260108.0/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-x3oEA1/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../node_modules/.pnpm/wrangler@3.114.16_@cloudflare+workers-types@4.20260108.0/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-x3oEA1/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  RateLimiter,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
