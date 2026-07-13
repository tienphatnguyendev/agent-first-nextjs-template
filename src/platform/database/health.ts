import type { PrismaClient } from "@/generated/prisma/client";

import { getDatabase } from "./client";

export async function checkDatabaseAvailability(
  client: PrismaClient = getDatabase(),
): Promise<void> {
  const rows = await client.$queryRaw<Array<{ result: number }>>`
    SELECT 1::integer AS "result"
  `;
  if (rows[0]?.result !== 1) {
    throw new Error("Database health query returned an invalid result.");
  }
}
