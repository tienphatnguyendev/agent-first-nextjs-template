import { describe, expect, it, vi } from "vitest";

import { createHealthHandler } from "@/platform/health/handler";

describe("health handler", () => {
  it("returns a simple healthy response and correlation header", async () => {
    const response = await createHealthHandler({
      checkDatabaseAvailability: vi.fn().mockResolvedValue(undefined),
      getCorrelationId: async () => "request-123",
      logFailure: vi.fn(),
    })();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(response.headers.get("x-correlation-id")).toBe("request-123");
  });

  it("logs details but returns no database details", async () => {
    const failure = new Error(
      "database host db.internal password=secret migration=20260713 query=SELECT *",
    );
    const logFailure = vi.fn();
    const response = await createHealthHandler({
      checkDatabaseAvailability: vi.fn().mockRejectedValue(failure),
      getCorrelationId: async () => "request-456",
      logFailure,
    })();

    expect(response.status).toBe(503);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({
      status: "unavailable",
      correlationId: "request-456",
    });
    expect(response.headers.get("x-correlation-id")).toBe("request-456");
    expect(logFailure).toHaveBeenCalledWith("request-456", failure);
    expect(body).not.toContain("db.internal");
    expect(body).not.toContain("secret");
    expect(body).not.toContain("migration");
    expect(body).not.toContain("SELECT");
    expect(body).not.toContain("Error");
  });

  it("returns a safe unavailable response when failure logging throws", async () => {
    const databaseFailure = new Error(
      "database host db.internal password=database-secret",
    );
    const loggingFailure = new Error(
      "logger configuration DATABASE_URL=logger-secret",
    );
    const response = await createHealthHandler({
      checkDatabaseAvailability: async () => {
        throw databaseFailure;
      },
      getCorrelationId: async () => "request-789",
      logFailure: () => {
        throw loggingFailure;
      },
    })();

    expect(response.status).toBe(503);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({
      status: "unavailable",
      correlationId: "request-789",
    });
    expect(response.headers.get("x-correlation-id")).toBe("request-789");
    expect(body).not.toContain("db.internal");
    expect(body).not.toContain("database-secret");
    expect(body).not.toContain("logger-secret");
  });
});
