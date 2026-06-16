"use client";

import { useRouter } from "next/navigation";
import { useWalletSession } from "@/lib/use-wallet-session";

export function WalletConnect() {
  const router = useRouter();
  const {
    connected,
    connectError,
    isConnecting,
    providerLabel,
    statusText,
    toggleWallet,
    walletLabel,
  } = useWalletSession();

  return (
    <article className="wallet-panel aurora-border">
      <div className="wallet-copy">
        <h2>Connect once, surface the full credit context.</h2>
        <p>
          Start from a wallet identity, then let Aurum assess repayment
          confidence, oracle state, agent health, and RWA backing from the same
          session.
        </p>
        <div className="wallet-actions">
          <button
            type="button"
            className="wallet-button primary"
            onClick={connected ? () => router.push("/dashboard") : toggleWallet}
          >
            {connected ? "Open dashboard" : isConnecting ? "Connecting..." : "Connect wallet"}
          </button>
          {connected ? (
            <button
              type="button"
              className="wallet-button secondary"
              onClick={toggleWallet}
            >
              Disconnect
            </button>
          ) : null}
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
            <strong>{connected ? "Injected EVM" : "Waiting"}</strong>
          </div>
          <div>
            <span>Assessment</span>
            <strong>{connected ? "Ready" : isConnecting ? "Authorizing" : "Pending"}</strong>
          </div>
        </div>

        {connectError ? <p className="wallet-error">{connectError}</p> : null}
      </div>
    </article>
  );
}
