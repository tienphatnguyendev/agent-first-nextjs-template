import type { AccountReader } from "./account-reader";

export function readAccount(reader: AccountReader) {
  return reader.read();
}
