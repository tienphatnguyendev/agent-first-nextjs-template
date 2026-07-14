import type { Account } from "../domain/account";

export interface AccountReader {
  read(): Account;
}
