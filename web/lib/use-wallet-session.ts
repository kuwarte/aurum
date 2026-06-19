"use client";

/**
 * useWalletSession
 *
 * Thin wrapper over useCasperWallet that preserves the same interface
 * the rest of the app already uses. All pages call this — they don't
 * need to know about the Casper Wallet internals.
 */

import { useMemo } from "react";
import { useCasperWallet } from "@/lib/casper-wallet";

export function useWalletSession() {
  const {
    available,
    connected,
    isConnecting,
    publicKey,
    walletLabel,
    address,
    connectError,
    connect,
    disconnect,
    toggleWallet,
  } = useCasperWallet();

  const providerLabel = connected
    ? "Casper Wallet"
    : available
    ? "Casper Wallet (not connected)"
    : "Casper Wallet not installed";

  const statusText = useMemo(() => {
    if (isConnecting) return "Waiting for wallet approval";
    if (connected)    return "Connected session";
    if (!available)   return "Install Casper Wallet extension";
    return "Awaiting wallet session";
  }, [available, connected, isConnecting]);

  return {
    // address is the public key hex (what backend expects as wallet_address)
    address,
    connected,
    connectError,
    connectWallet: connect,
    connectorName: connected ? "Casper Wallet" : null,
    disconnectWallet: disconnect,
    isConnecting,
    providerLabel,
    ready: true,           // no async hydration needed
    statusText,
    toggleWallet,
    walletLabel,
    // extra Casper-specific fields
    publicKey,
    available,
  };
}
