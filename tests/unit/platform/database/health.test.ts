import type { PrismaClient } from "@/generated/prisma/client";

import { describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => {
  const adapter = { kind: "test-adapter" };
  const client = { kind: "test-client" };

  return {
    adapter,
    client,
    getServerEnv: vi.fn(() => ({
      DATABASE_URL: "postgresql://app:app@127.0.0.1:54322/app",
    })),
    PrismaPg: vi.fn(function PrismaPgMock() {
      return adapter;
    }),
    PrismaClient: vi.fn(function PrismaClientMock() {
      return client;
    }),
  };
});

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: databaseMocks.PrismaPg,
}));

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: databaseMocks.PrismaClient,
}));

vi.mock("@/platform/env", () => ({
  getServerEnv: databaseMocks.getServerEnv,
}));

import { getDatabase } from "@/platform/database/client";
import { checkDatabaseAvailability } from "@/platform/database/health";

describe("getDatabase", () => {
  it("creates and caches the Prisma client only when requested", () => {
    expect(databaseMocks.getServerEnv).not.toHaveBeenCalled();
    expect(databaseMocks.PrismaPg).not.toHaveBeenCalled();
    expect(databaseMocks.PrismaClient).not.toHaveBeenCalled();

    const firstClient = getDatabase();
    const secondClient = getDatabase();

    expect(firstClient).toBe(databaseMocks.client);
    expect(secondClient).toBe(firstClient);
    expect(databaseMocks.getServerEnv).toHaveBeenCalledOnce();
    expect(databaseMocks.PrismaPg).toHaveBeenCalledWith({
      connectionString: "postgresql://app:app@127.0.0.1:54322/app",
    });
    expect(databaseMocks.PrismaClient).toHaveBeenCalledWith({
      adapter: databaseMocks.adapter,
    });
  });
});

describe("checkDatabaseAvailability", () => {
  it("resolves when PostgreSQL returns one", async () => {
    const healthyClient = {
      $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]),
    } as unknown as PrismaClient;

    await expect(
      checkDatabaseAvailability(healthyClient),
    ).resolves.toBeUndefined();
    expect(healthyClient.$queryRaw).toHaveBeenCalledOnce();
  });

  it("throws when the health query returns an invalid result", async () => {
    const invalidClient = {
      $queryRaw: vi.fn().mockResolvedValue([{ result: 0 }]),
    } as unknown as PrismaClient;

    await expect(checkDatabaseAvailability(invalidClient)).rejects.toThrow(
      "Database health query returned an invalid result.",
    );
  });
});
