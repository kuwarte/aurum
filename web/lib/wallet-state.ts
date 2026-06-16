"use client";

import { useSyncExternalStore } from "react";

const WALLET_KEY = "aurum-wallet-connected";
const WALLET_EVENT = "aurum-wallet-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(WALLET_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(WALLET_EVENT, callback);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(WALLET_KEY) === "true";
}

function getServerSnapshot() {
  return false;
}

export function useWalletConnected() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setWalletConnected(next: boolean) {
  window.localStorage.setItem(WALLET_KEY, String(next));
  window.dispatchEvent(new Event(WALLET_EVENT));
}
