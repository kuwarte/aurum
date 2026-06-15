"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

const MOCK_WALLET = {
  provider: "Casper Wallet",
  address: "02f4...9c8a",
};

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("aurum-wallet-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("aurum-wallet-change", callback);
  };
}

function getSnapshot() {
  return window.localStorage.getItem("aurum-wallet-connected") === "true";
}

export function WalletConnect() {
  const connected = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const router = useRouter();

  const connectWallet = () => {
    window.localStorage.setItem("aurum-wallet-connected", "true");
    window.dispatchEvent(new Event("aurum-wallet-change"));
  };

  const disconnectWallet = () => {
    window.localStorage.removeItem("aurum-wallet-connected");
    window.dispatchEvent(new Event("aurum-wallet-change"));
  };

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
            onClick={connected ? () => router.push("/dashboard") : connectWallet}
          >
            {connected ? "Open dashboard" : "Connect Casper Wallet"}
          </button>
          {connected ? (
            <button
              type="button"
              className="wallet-button secondary"
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          ) : null}
        </div>
      </div>

      <div className="wallet-shell">
        <span className="wallet-pill">
          <span className="status-dot status-live" />
          {connected ? "Connected session" : "Awaiting wallet session"}
        </span>

        <div className="wallet-stats">
          <div>
            <span>Provider</span>
            <strong>{connected ? MOCK_WALLET.provider : "Not connected"}</strong>
          </div>
          <div>
            <span>Wallet</span>
            <strong>{connected ? MOCK_WALLET.address : "----"}</strong>
          </div>
          <div>
            <span>Network</span>
            <strong>Casper</strong>
          </div>
          <div>
            <span>Assessment</span>
            <strong>{connected ? "Ready" : "Pending"}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}
