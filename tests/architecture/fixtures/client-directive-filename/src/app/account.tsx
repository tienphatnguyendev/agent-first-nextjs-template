"use client";

import { loadAccount } from "./load-account";

export function Account() {
  return <p>{loadAccount()}</p>;
}
