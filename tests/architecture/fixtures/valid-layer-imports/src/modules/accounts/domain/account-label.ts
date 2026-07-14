import type { Account } from "./account";

export function accountLabel(account: Account): string {
  return account.id;
}
