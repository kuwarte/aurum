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
import {
  fetchOracleHistory,
  runAssessment,
  type AssessmentResponse,
  type OracleHistoryEntry,
} from "@/lib/api-client";

type AssessmentState =
  | { status: "idle" }
  | { status: "checking_cache"; walletAddress: string }
  | { status: "loading"; walletAddress: string }
  | {
      status: "success";
      walletAddress: string;
      data: AssessmentResponse;
      source: "cache" | "live";
    }
  | { status: "error"; walletAddress: string; message: string };

type AssessmentContextValue = {
  state: AssessmentState;
  assess: (walletAddress: string) => Promise<void>;
  hydrateFromHistory: (walletAddress: string) => Promise<boolean>;
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
      setState({ status: "success", walletAddress, data, source: "live" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Assessment failed";
      setState({ status: "error", walletAddress, message });
    }
  }, []);

  const hydrateFromHistory = useCallback(async (walletAddress: string) => {
    setState({ status: "checking_cache", walletAddress });
    try {
      const history = await fetchOracleHistory(walletAddress);
      const latest = history.history[0];
      if (!latest) {
        setState({ status: "idle" });
        return false;
      }

      setState({
        status: "success",
        walletAddress,
        data: assessmentFromHistory(latest),
        source: "cache",
      });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load cached assessment";
      setState({ status: "error", walletAddress, message });
      return false;
    }
  }, []);

  const clear = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  const value = useMemo(
    () => ({ state, assess, hydrateFromHistory, clear }),
    [state, assess, hydrateFromHistory, clear],
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

  const { state, assess, hydrateFromHistory, clear } = ctx;

  return {
    assess,
    hydrateFromHistory,
    clear,
    isIdle: state.status === "idle",
    isCheckingCache: state.status === "checking_cache",
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    assessment: state.status === "success" ? state.data : null,
    assessmentSource: state.status === "success" ? state.source : null,
    error: state.status === "error" ? state.message : null,
    walletAddress:
      state.status !== "idle" ? state.walletAddress : null,
  };
}

function assessmentFromHistory(entry: OracleHistoryEntry): AssessmentResponse {
  const subScores = {
    repayment: entry.sub_scores?.repayment ?? 0,
    wallet_activity: entry.sub_scores?.wallet_activity ?? 0,
    defi: entry.sub_scores?.defi ?? 0,
    dao: entry.sub_scores?.dao ?? 0,
    rwa: entry.sub_scores?.rwa ?? 0,
    income: entry.sub_scores?.income ?? 0,
  };

  return {
    score: entry.score,
    sub_scores: subScores,
    shap: entry.shap ?? {},
    tier: entry.tier,
    default_prob: entry.default_prob ?? 0,
    default_prob_60d: 0,
    default_prob_90d: 0,
    early_warning_flags: [],
    risk_analysis: "Loaded from cached oracle history.",
    fraud_score: entry.fraud_score ?? 0,
    fraud_flags: entry.fraud_flags ?? [],
    fraud_reasoning: "",
    fraud_confidence: 0,
    tx_hash: entry.tx_hash ?? "",
    attestation_hash: entry.attestation_hash ?? "",
    attestation_summary: "Cached assessment loaded from Supabase history.",
    borrowing_limit_motes: 0,
    compliance_level: "",
    deploy_mode: "cached",
    active: entry.active ?? true,
    monitoring_action: "cached",
    loan_offers: entry.loan_offers ?? [],
    lending_recommendation: "Run Re-assess to refresh lending recommendations.",
    raw_wallet_data: {},
  };
}
