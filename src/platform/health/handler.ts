import "server-only";

import { CORRELATION_ID_HEADER } from "@/platform/logging/correlation-id";

export interface HealthDependencies {
  checkDatabaseAvailability(): Promise<void>;
  getCorrelationId(): Promise<string>;
  logFailure(correlationId: string, error: unknown): void;
}

export function createHealthHandler(dependencies: HealthDependencies) {
  return async function handleHealth(): Promise<Response> {
    const correlationId = await dependencies.getCorrelationId();
    const headers = {
      "content-type": "application/json",
      [CORRELATION_ID_HEADER]: correlationId,
    };

    try {
      await dependencies.checkDatabaseAvailability();
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers,
      });
    } catch (error) {
      try {
        dependencies.logFailure(correlationId, error);
      } catch {
        // A logging failure must not replace the safe health response.
      }
      return new Response(
        JSON.stringify({ status: "unavailable", correlationId }),
        { status: 503, headers },
      );
    }
  };
}
