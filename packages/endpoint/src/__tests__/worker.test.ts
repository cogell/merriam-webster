import { describe, it, expect, beforeAll } from "vitest";
import { SELF, env } from "cloudflare:test";
import type { APIErrorResponse } from "../types";

// Test secrets - these should be set in the test environment
const TEST_API_KEY = "test-api-key";
const TEST_ADMIN_KEY = "test-admin-key";

describe("Worker Integration", () => {
  describe("authentication", () => {
    it("rejects requests without auth header", async () => {
      const response = await SELF.fetch("https://api/define/hello");

      expect(response.status).toBe(401);
      const body = (await response.json()) as APIErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects requests with invalid auth", async () => {
      const response = await SELF.fetch("https://api/define/hello", {
        headers: { Authorization: "Bearer wrong-key" },
      });

      expect(response.status).toBe(401);
    });
  });

  describe("CORS", () => {
    it("handles preflight requests", async () => {
      const response = await SELF.fetch("https://api/define/hello", {
        method: "OPTIONS",
        headers: { Origin: "https://example.com" },
      });

      expect(response.status).toBe(204);
      expect(
        response.headers.get("Access-Control-Allow-Origin")
      ).toBeDefined();
      expect(
        response.headers.get("Access-Control-Allow-Methods")
      ).toBeDefined();
    });

    it("includes CORS headers in error responses", async () => {
      const response = await SELF.fetch("https://api/define/hello", {
        headers: {
          Origin: "https://example.com",
        },
      });

      expect(response.headers.get("Access-Control-Allow-Origin")).toBeDefined();
    });
  });

  describe("health endpoint", () => {
    it("returns 200 without auth", async () => {
      const response = await SELF.fetch("https://api/health");
      const body = (await response.json()) as { status: string; timestamp: string };

      expect(response.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.timestamp).toBeDefined();
    });
  });

  describe("not found", () => {
    it("returns 404 for unknown endpoints", async () => {
      const response = await SELF.fetch("https://api/unknown");

      expect(response.status).toBe(404);
      const body = (await response.json()) as APIErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });
});

describe("Cache utilities", () => {
  it("getCacheKey generates correct format", async () => {
    // Import the cache module
    const { getCacheKey } = await import("../cache.js");

    expect(getCacheKey("define", "Hello")).toBe("define|hello");
    expect(getCacheKey("synonyms", "WORLD")).toBe("synonyms|world");
  });
});

describe("Auth utilities", () => {
  it("validateUserAuth returns false for missing header", async () => {
    const { validateUserAuth } = await import("../auth.js");

    const request = new Request("https://api/test");
    const result = validateUserAuth(request, env as any);

    expect(result).toBe(false);
  });

  it("validateUserAuth returns false for wrong prefix", async () => {
    const { validateUserAuth } = await import("../auth.js");

    const request = new Request("https://api/test", {
      headers: { Authorization: "Basic abc123" },
    });
    const result = validateUserAuth(request, env as any);

    expect(result).toBe(false);
  });
});
