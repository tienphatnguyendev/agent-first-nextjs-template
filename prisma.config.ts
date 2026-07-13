import "dotenv/config";

import { defineConfig } from "prisma/config";

const generationOnlyUrl = "postgresql://build:build@127.0.0.1:5432/build";
const directUrl =
  process.env.DIRECT_URL ??
  (process.argv.includes("generate") ? generationOnlyUrl : undefined);

if (!directUrl) {
  throw new Error("DIRECT_URL is required for Prisma migration commands.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: directUrl },
});
