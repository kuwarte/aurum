"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useWalletSession } from "@/lib/use-wallet-session";

const COMPLIANCE_STATS = [
  { label: "Credential status", value: "Active", detail: "Attestation is current and query-ready", tone: "green" },
  { label: "Monitoring coverage", value: "24/7", detail: "Continuous watch across wallet and collateral state", tone: "green" },
  { label: "Open exceptions", value: "1", detail: "Moderate oracle stress remains on watch", tone: "gold" },
  { label: "Reuse readiness", value: "High", detail: "Portable profile can be consumed by partner protocols", tone: "" },
];

const COMPLIANCE_CHECKS = [
  {
    name: "Wallet integrity",
    status: "Pass",
    summary: "No sybil cluster or circular-flow alerts are currently attached to the connected wallet session.",
  },
  {
    name: "Oracle freshness",
    status: "Watch",
    summary: "One collateral feed recently widened in volatility, but freshness thresholds remain inside tolerance.",
  },
  {
    name: "Credential validity",
    status: "Pass",
    summary: "The latest attestation is signed, portable, and still inside its active validity window.",
  },
  {
    name: "Portfolio support",
    status: "Pass",
    summary: "Observed RWA backing and liquidity windows remain strong enough for current borrow posture.",
  },
];

const COMPLIANCE_SURFACES = [
  "Explainable score factors for lender review",
  "Continuous monitoring rather than one-time underwriting",
  "Portable attestation for downstream protocol verification",
  "Risk and fraud signals attached to the credit profile itself",
];

export default function CompliancePage() {
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
            <h1 className="dash-page-title">Compliance</h1>
            <p className="dash-page-caption">
              Inspect the control surface around the Aurum credential so protocols can understand identity quality,
              monitoring coverage, and the exceptions that still need caution.
            </p>
          </article>

          <div className="dash-stat-row">
            {COMPLIANCE_STATS.map((stat) => (
              <article key={stat.label} className="dash-stat-card aurora-border">
                <div className="dash-stat-label">{stat.label}</div>
                <div className={`dash-stat-value${stat.tone ? ` ${stat.tone}` : ""}`}>{stat.value}</div>
                <div className="dash-stat-delta">{stat.detail}</div>
              </article>
            ))}
          </div>

          <div className="detail-grid">
            <article className="data-card aurora-border">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Control checks</span>
                <span className="dash-panel-hint gold">{COMPLIANCE_CHECKS.length} active checks</span>
              </div>

              <div className="score-bars">
                {COMPLIANCE_CHECKS.map((check) => (
                  <div key={check.name} className="score-row">
                    <header>
                      <strong>{check.name}</strong>
                      <span className={`mini-badge${check.status === "Watch" ? " gold" : ""}`}>{check.status}</span>
                    </header>
                    <div className="agent-subtitle">{check.summary}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="data-card aurora-border">
              <div>
                <h2>Why it matters</h2>
                <p className="chart-note">
                  Aurum compliance is about making credit reusable and inspectable. Protocols should be able to query
                  not just the score, but the conditions that make that score trustworthy.
                </p>
              </div>

              <div className="score-bars">
                {COMPLIANCE_SURFACES.map((surface) => (
                  <div key={surface} className="score-row">
                    <strong>{surface}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
