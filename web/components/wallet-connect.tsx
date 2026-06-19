"use client";

import { useRouter } from "next/navigation";
import {
  resolveDefaultViewHref,
  useAppPreferences,
} from "@/lib/app-preferences";
import { useWalletSession } from "@/lib/use-wallet-session";

export function WalletConnect() {
  const router = useRouter();
  const {
    preferences: { defaultView },
  } = useAppPreferences();
  const {
    available,
    connected,
    connectError,
    isConnecting,
    providerLabel,
    statusText,
    toggleWallet,
    walletLabel,
    publicKey,
  } = useWalletSession();

  return (
    <article className="wallet-panel aurora-border">
      <div className="wallet-copy">
        <h2>Connect once, surface the full credit context.</h2>
        <p>
          Start from a Casper wallet identity, then let Aurum assess repayment
          confidence, oracle state, agent health, and RWA backing from the same
          session.
        </p>
        <div className="wallet-actions">
          {!available ? (
            <a
              href="https://www.casperwallet.io/"
              target="_blank"
              rel="noreferrer"
              className="wallet-button primary"
            >
              Install Casper Wallet
            </a>
          ) : (
            <button
              type="button"
              className="wallet-button primary"
              onClick={
                connected
                  ? () => router.push(resolveDefaultViewHref(defaultView))
                  : toggleWallet
              }
            >
              {connected
                ? "Open app"
                : isConnecting
                ? "Connecting…"
                : "Connect Casper Wallet"}
            </button>
          )}
          {connected && (
            <button
              type="button"
              className="wallet-button secondary"
              onClick={toggleWallet}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="wallet-shell">
        <span className="wallet-pill">
          <span className="status-dot status-live" />
          {statusText}
        </span>

        <div className="wallet-stats">
          <div>
            <span>Provider</span>
            <strong>{providerLabel}</strong>
          </div>
          <div>
            <span>Wallet</span>
            <strong>{connected ? walletLabel : "----"}</strong>
          </div>
          <div>
            <span>Network</span>
            <strong>{connected ? "Casper Testnet" : "Waiting"}</strong>
          </div>
          <div>
            <span>Assessment</span>
            <strong>
              {connected ? "Ready" : isConnecting ? "Authorizing" : "Pending"}
            </strong>
          </div>
        </div>

        {connected && publicKey && (
          <div className="wallet-key-row">
            <span className="wallet-key-label">Public key</span>
            <span className="wallet-key-value" title={publicKey}>
              {publicKey.slice(0, 20)}…{publicKey.slice(-8)}
            </span>
          </div>
        )}

        {connectError ? (
          <p className="wallet-error">{connectError}</p>
        ) : null}

        {!available && (
          <p className="wallet-install-hint">
            Casper Wallet extension required.{" "}
            <a
              href="https://www.casperwallet.io/"
              target="_blank"
              rel="noreferrer"
            >
              Get it here →
            </a>
          </p>
        )}
      </div>
    </article>
  );
}
