"use client";

/**
 * Casper Wallet integration
 *
 * Uses the Casper Wallet browser extension API (window.CasperWalletProvider).
 * The extension injects a provider into the page and fires custom DOM events
 * for connection state changes.
 *
 * Casper Wallet extension: https://www.casperwallet.io/
 * Docs: https://docs.casperwallet.io/
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// ─── Casper Wallet Provider types ────────────────────────────────────────────
// The extension injects window.CasperWalletProvider as a constructor function.

declare global {
  interface Window {
    CasperWalletProvider?: () => CasperWalletProviderInstance;
  }
}

interface CasperWalletProviderInstance {
  requestConnection(): Promise<boolean>;
  disconnectFromSite(): Promise<boolean>;
  getActivePublicKey(): Promise<string>;
  getVersion(): Promise<string>;
  isConnected(): Promise<boolean>;
  signMessage(message: string, signingPublicKey: string): Promise<{
    cancelled: boolean;
    signatureHex: string;
  }>;
}

// Casper Wallet fires these events on window
const CW_EVENTS = {
  connected:    "casperwallet:connected",
  disconnected: "casperwallet:disconnected",
  tabChanged:   "casperwallet:tabChanged",
  lockChanged:  "casperwallet:lockChanged",
  activeKeyChanged: "casperwallet:activeKeyChanged",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Derive an account-hash string from a public key hex via the Casper hash
 * convention. For display and backend calls we use the public key directly
 * when a full account-hash isn't derivable client-side without the SDK.
 *
 * The backend accepts both `account-hash-<hex>` and raw public key strings
 * in mock/CSPR.cloud mode, so we pass the public key prefixed as the wallet
 * address and the backend scoring handles it.
 */
function formatPublicKey(pk: string): string {
  // Already an account-hash
  if (pk.startsWith("account-hash-")) return pk;
  // Return as-is — public key hex (01... or 02...) which backend accepts
  return pk;
}

function shortenKey(pk: string): string {
  if (!pk) return "Not connected";
  const clean = pk.startsWith("account-hash-") ? pk.slice(13) : pk;
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
}

// ─── Context ─────────────────────────────────────────────────────────────────

type CasperWalletState = {
  /** Whether the Casper Wallet extension is installed */
  available: boolean;
  /** Whether the site is connected to the wallet */
  connected: boolean;
  /** Whether a connection request is in progress */
  isConnecting: boolean;
  /** Active public key hex string (01... or 02...) */
  publicKey: string | null;
  /** Formatted wallet address for display */
  walletLabel: string;
  /** Full address string to pass to backend (public key or account-hash) */
  address: string | undefined;
  /** Last error message */
  connectError: string | null;
  /** Request connection */
  connect: () => Promise<void>;
  /** Disconnect */
  disconnect: () => Promise<void>;
  /** Toggle connect/disconnect */
  toggleWallet: () => void;
};

const CasperWalletContext = createContext<CasperWalletState | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CasperWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [available, setAvailable]       = useState(false);
  const [connected, setConnected]       = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [publicKey, setPublicKey]       = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Lazy getter — returns provider instance or null
  const getProvider = useCallback((): CasperWalletProviderInstance | null => {
    if (typeof window === "undefined") return null;
    if (!window.CasperWalletProvider) return null;
    try {
      return window.CasperWalletProvider();
    } catch {
      return null;
    }
  }, []);

  // Refresh active key and connected state from the provider
  const refreshState = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setAvailable(false);
      setConnected(false);
      setPublicKey(null);
      return;
    }
    setAvailable(true);
    try {
      const isConn = await provider.isConnected();
      setConnected(isConn);
      if (isConn) {
        const pk = await provider.getActivePublicKey();
        setPublicKey(pk ?? null);
      } else {
        setPublicKey(null);
      }
    } catch {
      setConnected(false);
      setPublicKey(null);
    }
  }, [getProvider]);

  // On mount: check if extension is present and already connected
  useEffect(() => {
    // Extension may not be injected immediately — retry briefly
    let tries = 0;
    const poll = setInterval(() => {
      tries++;
      if (window.CasperWalletProvider || tries >= 20) {
        clearInterval(poll);
        void refreshState();
      }
    }, 150);
    return () => clearInterval(poll);
  }, [refreshState]);

  // Listen for Casper Wallet DOM events
  useEffect(() => {
    const onConnected = (e: Event) => {
      const detail = (e as CustomEvent).detail as { activeKey?: string } | undefined;
      setConnected(true);
      setConnectError(null);
      if (detail?.activeKey) setPublicKey(detail.activeKey);
      else void refreshState();
    };

    const onDisconnected = () => {
      setConnected(false);
      setPublicKey(null);
    };

    const onActiveKeyChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as { activeKey?: string } | undefined;
      if (detail?.activeKey) setPublicKey(detail.activeKey);
      else void refreshState();
    };

    const onLockChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as { isLocked?: boolean } | undefined;
      if (detail?.isLocked) {
        setConnected(false);
        setPublicKey(null);
      }
    };

    window.addEventListener(CW_EVENTS.connected, onConnected);
    window.addEventListener(CW_EVENTS.disconnected, onDisconnected);
    window.addEventListener(CW_EVENTS.activeKeyChanged, onActiveKeyChanged);
    window.addEventListener(CW_EVENTS.lockChanged, onLockChanged);
    window.addEventListener(CW_EVENTS.tabChanged, () => void refreshState());

    return () => {
      window.removeEventListener(CW_EVENTS.connected, onConnected);
      window.removeEventListener(CW_EVENTS.disconnected, onDisconnected);
      window.removeEventListener(CW_EVENTS.activeKeyChanged, onActiveKeyChanged);
      window.removeEventListener(CW_EVENTS.lockChanged, onLockChanged);
    };
  }, [refreshState]);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setConnectError(
        "Casper Wallet extension not found. Install it from casperwallet.io",
      );
      return;
    }
    setIsConnecting(true);
    setConnectError(null);
    try {
      const approved = await provider.requestConnection();
      if (approved) {
        await refreshState();
      } else {
        setConnectError("Connection request was rejected.");
      }
    } catch (err) {
      setConnectError(
        err instanceof Error ? err.message : "Connection failed",
      );
    } finally {
      setIsConnecting(false);
    }
  }, [getProvider, refreshState]);

  const disconnect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;
    try {
      await provider.disconnectFromSite();
    } catch {
      // ignore
    }
    setConnected(false);
    setPublicKey(null);
  }, [getProvider]);

  const toggleWallet = useCallback(() => {
    if (connected) {
      void disconnect();
    } else {
      void connect();
    }
  }, [connected, connect, disconnect]);

  const address = publicKey ? formatPublicKey(publicKey) : undefined;
  const walletLabel = publicKey ? shortenKey(publicKey) : "Not connected";

  const value = useMemo<CasperWalletState>(
    () => ({
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
    }),
    [
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
    ],
  );

  return (
    <CasperWalletContext.Provider value={value}>
      {children}
    </CasperWalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCasperWallet(): CasperWalletState {
  const ctx = useContext(CasperWalletContext);
  if (!ctx) {
    throw new Error("useCasperWallet must be used within CasperWalletProvider");
  }
  return ctx;
}
