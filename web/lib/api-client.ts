/**
 * Aurum API Client
 *
 * Typed wrappers for all backend endpoints. All requests go through Next.js
 * API routes (/api/*) so secrets and CORS stay server-side.
 */

// ─── Response Types ──────────────────────────────────────────────────────────

export type RiskTier = "A" | "B" | "C" | "D";

export type LoanOffer = {
  protocol: string;
  rate: string;
  max_loan: number;
};

export type ShapBreakdown = Record<string, number>;

export type SubScores = {
  repayment: number;
  wallet_activity: number;
  defi: number;
  dao: number;
  rwa: number;
  income: number;
};

export type RawWalletData = {
  wallet_address?: string;
  volume_summary?: {
    transaction_count?: number;
    counterparty_diversity?: number;
    total_volume_cspr?: number;
  };
  flow_summary?: {
    asset_breakdown?: {
      CSPR?: {
        inbound?: number;
        outbound?: number;
      };
    };
  };
  positions?: {
    positions?: Array<{
      protocol?: string;
      pool?: string;
      liquidity_usd?: number;
      status?: string;
    }>;
  };
  loans?: {
    loans?: Array<{
      loan_id?: string;
      amount?: number;
      status?: string;
    }>;
  };
  repayments?: {
    repayment_events?: Array<{
      loan_id?: string;
      amount?: number;
      timestamp?: string;
    }>;
  };
  rwa?: {
    rwa_events?: Array<{
      asset_id?: string;
      event_type?: string;
      value?: number;
      timestamp?: string;
    }>;
  };
  yield?: {
    yield_events?: Array<{
      protocol?: string;
      amount?: number;
      timestamp?: string;
    }>;
  };
};

export type AssessmentResponse = {
  // Credit
  score: number;
  sub_scores: SubScores;
  shap: ShapBreakdown;
  // Risk
  tier: RiskTier;
  default_prob: number;
  default_prob_60d: number;
  default_prob_90d: number;
  early_warning_flags: string[];
  risk_analysis: string;
  // Fraud
  fraud_score: number;
  fraud_flags: string[];
  fraud_reasoning: string;
  fraud_confidence: number;
  // Attestation
  tx_hash: string;
  attestation_hash: string;
  attestation_summary: string;
  borrowing_limit_motes: number;
  compliance_level: string;
  deploy_mode: string;
  cspr_cloud_mode?: string;
  source?: "fresh" | "cache";
  llm_status?: "success" | "fallback" | "unavailable" | "rate_limited";
  fallback_used?: boolean;
  // Monitoring
  active: boolean;
  monitoring_action: string;
  // Lending
  loan_offers: LoanOffer[];
  lending_recommendation: string;
  // Raw wallet data
  raw_wallet_data: RawWalletData;
};

export type HealthResponse = {
  status: string;
  mode: string;
  contracts_connected: boolean;
  rpc_url: string;
};

export type ConfigResponse = {
  deploy_mode: string;
  cspr_cloud_mode: string;
  network: string;
  contracts: {
    credit_registry: string;
    compliance_registry: string;
    oracle_paywall: string;
    reputation_registry: string;
  };
};

export type OracleQueryResponse = {
  wallet_address: string;
  score: number;
  tier: RiskTier;
  shap_values: ShapBreakdown;
  loan_offers: LoanOffer[];
  assessed_at: string;
};

export type OracleHistoryEntry = {
  score: number;
  tier: RiskTier;
  timestamp: string;
  tx_hash?: string;
  fraud_score?: number;
  sub_scores?: Partial<SubScores>;
  shap?: ShapBreakdown;
  default_prob?: number;
  fraud_flags?: string[];
  attestation_hash?: string;
  loan_offers?: LoanOffer[];
  active?: boolean;
};

export type SystemStatusResponse = {
  status: string;
  deploy_mode: string;
  cspr_cloud_mode: string;
  x402_mode: string;
  cron_secret_configured: boolean;
  contracts_configured: boolean;
};

export type OracleHistoryResponse = {
  wallet_address: string;
  history: OracleHistoryEntry[];
};

export type CronMonitorResponse = {
  status: string;
  credentials_checked: number;
  credentials_revoked: number;
  credentials_errored: number;
  scanned?: number;
  processed?: number;
  skipped?: number;
  failed?: number;
  limit?: number | null;
  deploy_mode: string;
  timestamp: string;
};

export type PaymentInfoResponse = {
  contract_hash: string;
  entrypoint: string;
  price_cspr: string;
  network: string;
  mode: string;
};

// ─── Error type ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function apiErrorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;
  const detail = record.detail;
  if (detail && typeof detail === "object") {
    const detailRecord = detail as Record<string, unknown>;
    if (typeof detailRecord.message === "string") return detailRecord.message;
    if (typeof detailRecord.error === "string") return detailRecord.error;
  }
  if (typeof detail === "string") return detail;
  if (typeof record.message === "string") return record.message;
  if (typeof record.error === "string") return record.error;
  return fallback;
}

// ─── Fetch helper ────────────────────────────────────────────────────────────

async function request<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let body: unknown;
    try {
      body = await res.json();
      message = apiErrorMessage(body, message);
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, message, body);
  }

  return res.json() as Promise<T>;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function runAssessment(walletAddress: string): Promise<AssessmentResponse> {
  return request<AssessmentResponse>("/api/assess", {
    method: "POST",
    body: JSON.stringify({ wallet_address: walletAddress }),
  });
}

export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export async function fetchConfig(): Promise<ConfigResponse> {
  return request<ConfigResponse>("/api/config");
}

export async function fetchConfigStatus(): Promise<SystemStatusResponse> {
  return request<SystemStatusResponse>("/api/config/status");
}

export async function fetchOracleHistory(walletAddress: string): Promise<OracleHistoryResponse> {
  return request<OracleHistoryResponse>(
    `/api/oracle/history?wallet=${encodeURIComponent(walletAddress)}`,
  );
}

export async function fetchPaymentInfo(): Promise<PaymentInfoResponse> {
  return request<PaymentInfoResponse>("/api/oracle/payment-info");
}

/**
 * GET /api/oracle/query?wallet=<address>
 * x402-gated oracle query. Sends a mock payment proof in the header.
 * In mock mode the backend accepts any valid-shaped proof.
 */
export async function queryOracle(
  walletAddress: string,
  payerAccount: string,
): Promise<{ status: 200 | 402 | 404; data: unknown }> {
  // Build a mock payment proof
  const proof = {
    payer_account: payerAccount,
    receiver_account: "", // filled in from payment-info
    amount_cspr: "1.50",
    nonce: `nonce-${Date.now()}`,
    deadline_epoch_seconds: Math.floor(Date.now() / 1000) + 300,
    network: "casper-test",
    signature: "mock-signature",
    payment_reference: `demo-${Date.now()}`,
  };

  // Get treasury account from payment-info first
  try {
    const info = await fetchPaymentInfo();
    proof.receiver_account = (info as unknown as Record<string, string>).receiver_account ?? "";
  } catch {
    proof.receiver_account = "";
  }

  const res = await fetch(
    `/api/oracle/query?wallet=${encodeURIComponent(walletAddress)}`,
    {
      method: "GET",
      headers: {
        "content-type": "application/json",
        "x-402-payment-proof": JSON.stringify(proof),
      },
      cache: "no-store",
    },
  );

  const data = await res.json().catch(() => ({}));
  return {
    status: res.status as 200 | 402 | 404,
    data,
  };
}

export async function triggerMonitor(): Promise<CronMonitorResponse> {
  return request<CronMonitorResponse>("/api/cron/monitor", { method: "POST" });
}
