"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { agentStatuses } from "@/lib/aurum-data";
import { useWalletSession } from "@/lib/use-wallet-session";

const AGENT_SUMMARY = [
  { label: "Active agents", value: "6", detail: "Five running, one on warm standby", tone: "green" },
  { label: "Median confidence", value: "92%", detail: "Healthy orchestration across the mesh", tone: "green" },
  { label: "Last refresh", value: "12s", detail: "Continuous monitor loop is current", tone: "gold" },
  { label: "Escalations", value: "1", detail: "Oracle stress still under watch", tone: "gold" },
];

const AGENT_PIPELINE = [
  {
    name: "Credit Agent",
    status: "running",
    confidence: 98,
    model: "XGBoost - SHAP - 24h cycle",
    role: "Builds the composite score from repayment cadence, DeFi reuse, wallet age, and broader behavioral signals.",
  },
  {
    name: "Risk Agent",
    status: "running",
    confidence: 93,
    model: "GBM - 30/60/90d horizon",
    role: "Projects repayment stress and default probability across lending horizons so offers can be priced with context.",
  },
  {
    name: "Fraud Agent",
    status: "running",
    confidence: 95,
    model: "Graph analysis - Sybil detection",
    role: "Scans for circular flows, spoofed wallet clusters, and suspicious transaction patterns designed to inflate trust.",
  },
  {
    name: "Attestation Agent",
    status: "running",
    confidence: 100,
    model: "Ed25519 - IPFS - Casper",
    role: "Packages the final result into a portable credential that other protocols can verify and reuse on-chain.",
  },
  {
    name: "Monitoring Agent",
    status: "running",
    confidence: 88,
    model: "15 min heartbeat - CSPR.cloud",
    role: "Keeps watch on active borrowers, collateral drift, and any score changes that should update lender posture.",
  },
  {
    name: "Lending Agent",
    status: "standby",
    confidence: 74,
    model: "x402 - LangGraph - Casper MCP",
    role: "Matches high-confidence borrowers with protocol offers once the rest of the stack clears the session for lending.",
  },
];

const AGENT_ACTIVITY = [
  "Credit Agent promoted repayment consistency to primary positive driver.",
  "Fraud Agent cleared the wallet from sybil-risk review in the latest cycle.",
  "Monitoring Agent flagged moderate oracle volatility on one collateral feed.",
  "Attestation Agent signed a fresh credential snapshot for downstream protocol queries.",
];

export default function AgentsPage() {
  const { connected, toggleWallet, walletLabel } = useWalletSession();

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
              Follow the specialized agents that power Aurum’s credit layer, from behavioral scoring and fraud review
              to attestation, monitoring, and lender routing.
            </p>
          </article>

          <div className="dash-stat-row">
            {AGENT_SUMMARY.map((stat) => (
              <article key={stat.label} className="dash-stat-card aurora-border">
                <div className="dash-stat-label">{stat.label}</div>
                <div className={`dash-stat-value${stat.tone ? ` ${stat.tone}` : ""}`}>{stat.value}</div>
                <div className="dash-stat-delta">{stat.detail}</div>
              </article>
            ))}
          </div>

          <div className="detail-grid agents-page-grid">
            <article className="data-card aurora-border">
              <div>
                <h2>Pipeline status</h2>
                <p className="chart-note">
                  Every stage is independently observable, which means score generation is inspectable instead of
                  hidden behind a single model verdict.
                </p>
              </div>

              <div className="agent-list">
                {AGENT_PIPELINE.map((agent) => (
                  <div key={agent.name} className="agent-row">
                    <div className="agent-header">
                      <div>
                        <div className="agent-name">{agent.name}</div>
                        <div className="agent-subtitle">{agent.model}</div>
                      </div>
                      <span className={`dash-agent-badge ${agent.status}`}>{agent.status}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${agent.confidence}%` }} />
                    </div>
                    <div className="agent-subtitle">{agent.role}</div>
                  </div>
                ))}
              </div>
            </article>

            <div className="agent-side-stack">
              <article className="data-card aurora-border">
                <div>
                  <h2>Live console</h2>
                  <p className="chart-note">
                    The monitoring mesh keeps feeding evidence back into the score, so lenders can query living credit
                    rather than stale snapshots.
                  </p>
                </div>

                <div className="score-bars">
                  {AGENT_ACTIVITY.map((entry) => (
                    <div key={entry} className="score-row">
                      <div className="agent-subtitle">{entry}</div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="data-card aurora-border">
                <div>
                  <h2>Specialist health</h2>
                  <p className="chart-note">Legacy monitoring cards are still available for a quick confidence read.</p>
                </div>

                <div className="agent-list">
                  {agentStatuses.map((agent) => (
                    <div key={agent.name} className="agent-row">
                      <div className="agent-header">
                        <div>
                          <div className="agent-name">{agent.name}</div>
                          <div className="agent-subtitle">{agent.summary}</div>
                        </div>
                        <span className="mini-badge">{agent.state}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${agent.confidence}%` }} />
                      </div>
                      <div className="agent-subtitle">Confidence {agent.confidence}% - Updated {agent.updatedAt}</div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
