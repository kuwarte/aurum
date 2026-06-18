"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AppCurrency } from "@/lib/currency";

export type DefaultAppView =
  | "Dashboard"
  | "Loan Offers"
  | "RWA Portfolio"
  | "Score Logic";

export type AppPreferences = {
  currency: AppCurrency;
  refreshWindow: "Live" | "15 sec" | "1 min" | "5 min";
  defaultView: DefaultAppView;
  compactCards: boolean;
  riskAlerts: boolean;
  weeklyDigest: boolean;
  showFiatEstimate: boolean;
  advancedSignals: boolean;
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  currency: "USD",
  refreshWindow: "Live",
  defaultView: "Dashboard",
  compactCards: false,
  riskAlerts: true,
  weeklyDigest: true,
  showFiatEstimate: true,
  advancedSignals: false,
};

const STORAGE_KEY = "aurum-app-preferences";

type AppPreferencesContextValue = {
  preferences: AppPreferences;
  setPreference: <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K],
  ) => void;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(
  null,
);

function getInitialPreferences(): AppPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PREFERENCES;
    }

    return {
      ...DEFAULT_PREFERENCES,
      ...JSON.parse(stored),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function resolveDefaultViewHref(view: DefaultAppView) {
  switch (view) {
    case "Loan Offers":
      return "/loan-offers";
    case "RWA Portfolio":
      return "/portfolio";
    case "Score Logic":
      return "/score-breakdown";
    case "Dashboard":
    default:
      return "/dashboard";
  }
}

export function AppPreferencesProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [preferences, setPreferences] = useState<AppPreferences>(
    getInitialPreferences,
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    document.documentElement.dataset.dashboardDensity = preferences.compactCards
      ? "compact"
      : "comfortable";
  }, [preferences]);

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      preferences,
      setPreference: (key, nextValue) => {
        setPreferences((current) => ({
          ...current,
          [key]: nextValue,
        }));
      },
    }),
    [preferences],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);

  if (!context) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }

  return context;
}
