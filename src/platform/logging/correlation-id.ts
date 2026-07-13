import { randomUUID } from "node:crypto";

export const CORRELATION_ID_HEADER = "x-correlation-id";
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function getOrCreateCorrelationId(
  candidate: string | null | undefined,
  createId: () => string = randomUUID,
): string {
  return candidate && SAFE_ID.test(candidate) ? candidate : createId();
}
