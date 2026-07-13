import { type NextRequest, NextResponse } from "next/server";

import {
  CORRELATION_ID_HEADER,
  getOrCreateCorrelationId,
} from "@/platform/logging/correlation-id";

export function proxy(request: NextRequest) {
  const correlationId = getOrCreateCorrelationId(
    request.headers.get(CORRELATION_ID_HEADER),
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CORRELATION_ID_HEADER, correlationId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
