"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function formatWalletAddress(address?: string) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function subscribe() {
  return () => {};
}

export function useWalletSession() {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const { address, connector, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  const primaryConnector = connectors[0];
  const connected = ready && isConnected;

  const walletLabel = connected ? formatWalletAddress(address) : "Not connected";
  const providerLabel = connected ? connector?.name ?? "Injected wallet" : "Not connected";

  const connectWallet = () => {
    if (!primaryConnector) {
      return;
    }

    connect({ connector: primaryConnector });
  };

  const disconnectWallet = () => {
    disconnect();
  };

  const toggleWallet = () => {
    if (connected) {
      disconnectWallet();
      return;
    }

    connectWallet();
  };

  const statusText = useMemo(() => {
    if (!ready) {
      return "Checking wallet availability";
    }

    if (isPending) {
      return "Waiting for wallet approval";
    }

    if (connected) {
      return "Connected session";
    }

    return "Awaiting wallet session";
  }, [connected, isPending, ready]);

  return {
    address,
    connected,
    connectError: error?.message ?? null,
    connectWallet,
    connectorName: connector?.name ?? null,
    disconnectWallet,
    isConnecting: isPending,
    providerLabel,
    ready,
    statusText,
    toggleWallet,
    walletLabel,
  };
}
