import type { Env, RateLimitStatus } from "./types.js";

/**
 * Rate limiter Durable Object.
 *
 * Maintains a single global counter that resets at midnight UTC each day.
 * Uses Durable Object storage for strong consistency across all edge locations.
 *
 * @example
 * // In worker:
 * const id = env.RATE_LIMITER.idFromName('global');
 * const stub = env.RATE_LIMITER.get(id);
 * const response = await stub.fetch(new Request('http://do/check'));
 * const result: RateLimitStatus = await response.json();
 */
export class RateLimiter implements DurableObject {
  private state: DurableObjectState;
  private limit: number;

  constructor(state: DurableObjectState, env: Env) {
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
  async fetch(request: Request): Promise<Response> {
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
  private async checkAndIncrement(): Promise<Response> {
    const today = this.getTodayUTC();
    const stored = await this.state.storage.get<{
      date: string;
      count: number;
    }>("counter");

    let count = 0;
    if (stored && stored.date === today) {
      count = stored.count;
    }
    // If stored.date !== today, count stays 0 (new day = reset)

    if (count >= this.limit) {
      return Response.json({
        allowed: false,
        remaining: 0,
        limit: this.limit,
        resetsAt: this.getNextMidnightUTC(),
      } satisfies RateLimitStatus);
    }

    // Increment and save atomically
    await this.state.storage.put("counter", {
      date: today,
      count: count + 1,
    });

    return Response.json({
      allowed: true,
      remaining: this.limit - count - 1,
      limit: this.limit,
      resetsAt: this.getNextMidnightUTC(),
    } satisfies RateLimitStatus);
  }

  /**
   * Get current rate limit status without incrementing.
   *
   * Used for /rate-limit/status endpoint.
   */
  private async getStatus(): Promise<Response> {
    const today = this.getTodayUTC();
    const stored = await this.state.storage.get<{
      date: string;
      count: number;
    }>("counter");

    let count = 0;
    if (stored && stored.date === today) {
      count = stored.count;
    }

    return Response.json({
      allowed: true, // Status check doesn't consume
      remaining: this.limit - count,
      limit: this.limit,
      resetsAt: this.getNextMidnightUTC(),
    } satisfies RateLimitStatus);
  }

  /**
   * Get today's date in UTC as YYYY-MM-DD.
   */
  private getTodayUTC(): string {
    return new Date().toISOString().split("T")[0];
  }

  /**
   * Get ISO timestamp of next midnight UTC.
   */
  private getNextMidnightUTC(): string {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }
}
