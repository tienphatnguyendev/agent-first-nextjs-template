import { headers } from "next/headers";

import { checkDatabaseAvailability } from "@/platform/database";
import { createHealthHandler } from "@/platform/health";
import {
  CORRELATION_ID_HEADER,
  getLogger,
  getOrCreateCorrelationId,
} from "@/platform/logging";

export const runtime = "nodejs";

export const GET = createHealthHandler({
  checkDatabaseAvailability,
  getCorrelationId: async () =>
    getOrCreateCorrelationId((await headers()).get(CORRELATION_ID_HEADER)),
  logFailure: (correlationId, error) => {
    getLogger().error({ err: error, correlationId }, "health check failed");
  },
});
