import React from "react";

import type {
  AccountDeletionMarker,
  AccountDeletionServerStatus,
} from "@/lib/account-deletion";

export interface AccountDeletionGateValue {
  marker: AccountDeletionMarker | null;
  serverStatus: AccountDeletionServerStatus;
  setMarker: (marker: AccountDeletionMarker | null) => void;
}

const AccountDeletionGateContext =
  React.createContext<AccountDeletionGateValue | null>(null);

export const AccountDeletionGateProvider = AccountDeletionGateContext.Provider;

export function useAccountDeletionGate(): AccountDeletionGateValue {
  const value = React.useContext(AccountDeletionGateContext);
  if (!value) {
    throw new Error(
      "useAccountDeletionGate must be used inside the authenticated app layout.",
    );
  }
  return value;
}
