import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/platform/env";

const globalDatabase = globalThis as unknown as {
  database?: PrismaClient;
};

export function getDatabase(): PrismaClient {
  if (!globalDatabase.database) {
    const adapter = new PrismaPg({
      connectionString: getServerEnv().DATABASE_URL,
    });
    globalDatabase.database = new PrismaClient({ adapter });
  }

  return globalDatabase.database;
}
