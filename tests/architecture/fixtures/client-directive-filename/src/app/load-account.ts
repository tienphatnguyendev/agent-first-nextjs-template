import { databaseClient } from "../platform/database/client";

export function loadAccount() {
  return databaseClient;
}
