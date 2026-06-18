"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("aurum-theme-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("aurum-theme-change", callback);
  };
}

function getSnapshot(): ThemeMode {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" ? "dark" : "light";
}

export function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light") as ThemeMode;
  const [overlayTheme, setOverlayTheme] = useState<ThemeMode | null>(null);
  const [overlayDirection, setOverlayDirection] = useState<"reveal-up" | "reveal-down">(
    "reveal-up",
  );
  const [overlayActive, setOverlayActive] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      document.documentElement.dataset.theme = nextTheme;
      window.localStorage.setItem("aurum-theme", nextTheme);
      window.dispatchEvent(new Event("aurum-theme-change"));
      return;
    }

    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];

    setOverlayTheme(theme);
    setOverlayDirection(nextTheme === "dark" ? "reveal-up" : "reveal-down");
    setOverlayActive(true);

    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("aurum-theme", nextTheme);
    window.dispatchEvent(new Event("aurum-theme-change"));

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setOverlayActive(false);
      });
    });

    timersRef.current.push(
      window.setTimeout(() => {
        setOverlayTheme(null);
      }, 940),
    );
  };

  return (
    <>
      {overlayTheme ? (
        <span
          aria-hidden="true"
          className={`theme-transition-overlay theme-transition-overlay--${overlayTheme} theme-transition-overlay--${overlayDirection}${overlayActive ? " is-active" : ""}`}
        />
      ) : null}

      <button
        type="button"
        className={`theme-toggle${inline ? " theme-toggle--inline" : ""}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        title={theme === "light" ? "Dark mode" : "Light mode"}
      >
        <span aria-hidden="true" className="theme-toggle__icon">
          {theme === "light" ? (
            <svg viewBox="0 0 24 24" className="theme-toggle__svg">
              <circle cx="12" cy="12" r="4.5" fill="currentColor" />
              <path
                d="M12 1.75v3M12 19.25v3M4.75 4.75l2.1 2.1M17.15 17.15l2.1 2.1M1.75 12h3M19.25 12h3M4.75 19.25l2.1-2.1M17.15 6.85l2.1-2.1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="theme-toggle__svg">
              <path
                d="M20 15.1A8.5 8.5 0 0 1 8.9 4a9 9 0 1 0 11.1 11.1Z"
                fill="currentColor"
              />
            </svg>
          )}
        </span>
      </button>
    </>
  );
}
