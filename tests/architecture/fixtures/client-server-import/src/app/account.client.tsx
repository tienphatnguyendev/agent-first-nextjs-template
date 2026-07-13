import { loadAccount } from "./load-account";

export function AccountClient() {
  return <p>{loadAccount()}</p>;
}
