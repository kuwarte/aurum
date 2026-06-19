"use client";

/**
 * useAssessment
 *
 * Central hook for credit assessment state. Shared across all dashboard pages.
 * Stores the latest assessment result in React state so pages don't each
 * trigger their own pipeline run.
 *
 * Usage:
 *   const { assessment, isLoading, error, assess } = useAssessment();
 *
 * `assess(walletAddress)` triggers a POST /api/assess call.
 * The result is stored and all pages that call useAssessment() share it
 * via the AssessmentContext at the app shell level.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { runAssessment, type AssessmentResponse } from "@/lib/api-client";

type AssessmentState =
  | { status: "idle" }
  | { status: "loading"; walletAddress: string }
  | { status: "success"; walletAddress: string; data: AssessmentResponse }
  | { status: "error"; walletAddress: string; message: string };

type AssessmentContextValue = {
  state: AssessmentState;
  assess: (walletAddress: string) => Promise<void>;
  clear: () => void;
};

const AssessmentContext = createContext<AssessmentContextValue | null>(null);

export function AssessmentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<AssessmentState>({ status: "idle" });

  const assess = useCallback(async (walletAddress: string) => {
    setState({ status: "loading", walletAddress });
    try {
      const data = await runAssessment(walletAddress);
      setState({ status: "success", walletAddress, data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Assessment failed";
      setState({ status: "error", walletAddress, message });
    }
  }, []);

  const clear = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  const value = useMemo(
    () => ({ state, assess, clear }),
    [state, assess, clear],
  );

  return (
    <AssessmentContext.Provider value={value}>
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext);
  if (!ctx) {
    throw new Error("useAssessment must be used within AssessmentProvider");
  }

  const { state, assess, clear } = ctx;

  return {
    assess,
    clear,
    isIdle: state.status === "idle",
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    assessment: state.status === "success" ? state.data : null,
    error: state.status === "error" ? state.message : null,
    walletAddress:
      state.status !== "idle" ? state.walletAddress : null,
  };
}
