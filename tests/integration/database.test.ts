import { afterAll, describe, expect, it } from "vitest";

import { checkDatabaseAvailability, getDatabase } from "@/platform/database";

const database = getDatabase();

afterAll(async () => {
  await database.$disconnect();
});

describe.sequential("Supabase PostgreSQL", () => {
  it("passes the database health query", async () => {
    await expect(checkDatabaseAvailability(database)).resolves.toBeUndefined();
  });

  it("completes an interactive transaction", async () => {
    const transactionId = await database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<
        Array<{ transactionId: string }>
      >`SELECT txid_current()::text AS "transactionId"`;

      return rows[0]?.transactionId;
    });

    expect(transactionId).toMatch(/^\d+$/);
  });

  it("records the completed empty baseline migration", async () => {
    const migrations = await database.$queryRaw<
      Array<{ migrationName: string }>
    >`
      SELECT migration_name AS "migrationName"
      FROM "_prisma_migrations"
      WHERE migration_name = '20260713000000_init'
        AND finished_at IS NOT NULL
        AND rolled_back_at IS NULL
    `;

    expect(migrations).toEqual([{ migrationName: "20260713000000_init" }]);
  });
});
