"use client";

import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useWalletSession } from "@/lib/use-wallet-session";
import { useAssessment } from "@/lib/use-assessment";
import { fetchHealth, type HealthResponse } from "@/lib/api-client";

const AGENT_PIPELINE = [
  {
    name: "Credit Agent",
    model: "XGBoost - SHAP - 24h cycle",
    role: "Builds the composite score from repayment cadence, DeFi reuse, wallet age, and broader behavioral signals.",
    pct: 98,
  },
  {
    name: "Risk Agent",
    model: "GBM - 30/60/90d horizon",
    role: "Projects repayment stress and default probability across lending horizons so offers can be priced with context.",
    pct: 93,
  },
  {
    name: "Fraud Agent",
    model: "Graph analysis - Sybil detection",
    role: "Scans for circular flows, spoofed wallet clusters, and suspicious transaction patterns designed to inflate trust.",
    pct: 95,
  },
  {
    name: "Attestation Agent",
    model: "Ed25519 - IPFS - Casper",
    role: "Packages the final result into a portable credential that other protocols can verify and reuse on-chain.",
    pct: 100,
  },
  {
    name: "Monitoring Agent",
    model: "15 min heartbeat - CSPR.cloud",
    role: "Keeps watch on active borrowers, collateral drift, and any score changes that should update lender posture.",
    pct: 88,
  },
  {
    name: "Lending Agent",
    model: "x402 - LangGraph - Casper MCP",
    role: "Matches high-confidence borrowers with protocol offers once the rest of the stack clears the session for lending.",
    pct: 74,
    standby: true,
  },
];

export default function AgentsPage() {
  const { connected, address, toggleWallet, walletLabel } = useWalletSession();
  const { assessment, isLoading, isIdle, assess } = useAssessment();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Auto-assess if wallet is connected and no data yet
  useEffect(() => {
    if (connected && address && isIdle) {
      void assess(address);
    }
  }, [connected, address, isIdle, assess]);

  // Fetch backend health on mount
  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((err) => {
        setHealthError(err instanceof Error ? err.message : "Health check failed");
      });
  }, []);

  // Derive activity log from assessment
  const agentActivity = assessment
    ? [
        `Credit Agent produced score ${assessment.score} for wallet ${address?.slice(0, 16) ?? "—"}…`,
        `Risk Agent classified ${assessment.tier} tier — ${(assessment.default_prob * 100).toFixed(1)}% default probability (30d).`,
        `Fraud Agent completed review — credential is ${assessment.active ? "active" : "inactive"}.`,
        `Attestation Agent signed credential — tx ${assessment.tx_hash?.slice(0, 16)}…`,
        `Monitoring Agent assessed credential: ${assessment.active ? "maintain" : "review"}.`,
        `Lending Agent matched ${assessment.loan_offers.length} offer${assessment.loan_offers.length !== 1 ? "s" : ""}.`,
      ]
    : [
        "Credit Agent promoted repayment consistency to primary positive driver.",
        "Fraud Agent cleared the wallet from sybil-risk review in the latest cycle.",
        "Monitoring Agent flagged moderate oracle volatility on one collateral feed.",
        "Attestation Agent signed a fresh credential snapshot for downstream protocol queries.",
      ];

  const agentSummary = [
    {
      label: "Active agents",
      value: isLoading ? "6 running" : "6",
      detail: "Five running, one on warm standby",
      tone: "green",
    },
    {
      label: "Backend status",
      value: health ? health.status : healthError ? "Error" : "…",
      detail: health?.mode ?? (healthError ?? "Checking…"),
      tone: health?.status === "healthy" ? "green" : "gold",
    },
    {
      label: "Contracts",
      value: health ? (health.contracts_connected ? "Connected" : "Pending") : "—",
      detail: health?.contracts_connected ? "On-chain hashes configured" : "Placeholder hashes",
      tone: health?.contracts_connected ? "green" : "gold",
    },
    {
      label: "Pipeline",
      value: isLoading ? "Running" : assessment ? "Complete" : "Idle",
      detail: isLoading
        ? "6 agents executing…"
        : assessment
        ? `Score ${assessment.score} produced`
        : "Connect wallet to run",
      tone: isLoading ? "gold" : assessment ? "green" : "",
    },
  ];

  return (
    <main className="dash-shell">
      <div className="dash-layout">
        <DashboardSidebar
          connected={connected}
          walletLabel={walletLabel}
          onToggleWallet={toggleWallet}
        />

        <section className="dash-main">
          <article className="dash-page-intro">
            <h1 className="dash-page-title">Agent Pipeline</h1>
            <p className="dash-page-caption">
              Follow the specialized agents that power Aurum's credit layer, from
              behavioral scoring and fraud review to attestation, monitoring, and
              lender routing.
            </p>
          </article>

          <div className="dash-stat-row">
            {agentSummary.map((stat) => (
              <article key={stat.label} className="dash-stat-card aurora-border">
                <div className="dash-stat-label">{stat.label}</div>
                <div className={`dash-stat-value${stat.tone ? ` ${stat.tone}` : ""}`}>
                  {stat.value}
                </div>
                <div className="dash-stat-delta">{stat.detail}</div>
              </article>
            ))}
          </div>

          <div className="detail-grid agents-page-grid">
            <article className="data-card aurora-border">
              <div>
                <h2>Pipeline status</h2>
                <p className="chart-note">
                  Every stage is independently observable, which means score
                  generation is inspectable instead of hidden behind a single
                  model verdict.
                </p>
              </div>

              <div className="agent-list">
                {AGENT_PIPELINE.map((agent) => {
                  const status =
                    isLoading ? "running"
                    : agent.standby ? "standby"
                    : "running";
                  return (
                    <div key={agent.name} className="agent-row">
                      <div className="agent-header">
                        <div>
                          <div className="agent-name">{agent.name}</div>
                          <div className="agent-subtitle">{agent.model}</div>
                        </div>
                        <span className={`dash-agent-badge ${status}`}>
                          {status}
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${agent.pct}%` }}
                        />
                      </div>
                      <div className="agent-subtitle">{agent.role}</div>
                    </div>
                  );
                })}
              </div>
            </article>

            <div className="agent-side-stack">
              <article className="data-card aurora-border">
                <div>
                  <h2>Live console</h2>
                  <p className="chart-note">
                    {isLoading
                      ? "Pipeline is running — results will appear here shortly."
                      : "The monitoring mesh keeps feeding evidence back into the score."}
                  </p>
                </div>

                <div className="score-bars">
                  {agentActivity.map((entry) => (
                    <div key={entry} className="score-row">
                      <div className="agent-subtitle">{entry}</div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="data-card aurora-border">
                <div>
                  <h2>Backend health</h2>
                  <p className="chart-note">
                    Live status from the FastAPI service.
                  </p>
                </div>

                <div className="agent-list">
                  {healthError && (
                    <div className="agent-row">
                      <div className="agent-subtitle" style={{ color: "var(--color-alert, #e55)" }}>
                        {healthError}
                      </div>
                    </div>
                  )}
                  {health && (
                    <>
                      <div className="agent-row">
                        <div className="agent-header">
                          <div>
                            <div className="agent-name">Status</div>
                          </div>
                          <span className={`mini-badge${health.status === "healthy" ? " green" : ""}`}>
                            {health.status}
                          </span>
                        </div>
                        <div className="agent-subtitle">{health.mode}</div>
                      </div>
                      <div className="agent-row">
                        <div className="agent-header">
                          <div>
                            <div className="agent-name">Contracts</div>
                          </div>
                          <span className={`mini-badge${health.contracts_connected ? " green" : " gold"}`}>
                            {health.contracts_connected ? "Live" : "Placeholder"}
                          </span>
                        </div>
                        <div className="agent-subtitle">RPC: {health.rpc_url}</div>
                      </div>
                    </>
                  )}
                  {!health && !healthError && (
                    <div className="agent-row">
                      <div className="agent-subtitle">Checking backend health…</div>
                    </div>
                  )}
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
