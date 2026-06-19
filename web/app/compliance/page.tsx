"use client";

import { useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useWalletSession } from "@/lib/use-wallet-session";
import { useAssessment } from "@/lib/use-assessment";

const COMPLIANCE_SURFACES = [
  "Explainable score factors for lender review",
  "Continuous monitoring rather than one-time underwriting",
  "Portable attestation for downstream protocol verification",
  "Risk and fraud signals attached to the credit profile itself",
];

export default function CompliancePage() {
  const { connected, address, toggleWallet, walletLabel } = useWalletSession();
  const { assessment, isLoading, isIdle, isError, error, assess } =
    useAssessment();

  // Auto-assess if wallet is connected and no data yet
  useEffect(() => {
    if (connected && address && isIdle) {
      void assess(address);
    }
  }, [connected, address, isIdle, assess]);

  // Derive compliance checks from live assessment data
  const complianceChecks = assessment
    ? [
        {
          name: "Wallet integrity",
          status: "Pass",
          summary: `Wallet ${address?.slice(0, 12)}… cleared. No sybil cluster or circular-flow alerts attached.`,
        },
        {
          name: "Credit credential",
          status: assessment.active ? "Pass" : "Review",
          summary: assessment.active
            ? `Credential is active — signed and minted on-chain (tx: ${assessment.tx_hash?.slice(0, 16)}…).`
            : "Credential is currently inactive. Re-assess or check monitoring agent output.",
        },
        {
          name: "Risk posture",
          status: assessment.tier === "D" ? "Watch" : "Pass",
          summary: `Risk tier ${assessment.tier} — ${(assessment.default_prob * 100).toFixed(1)}% 30-day default probability. ${assessment.tier === "D" ? "Elevated risk — lending offers restricted." : "Within acceptable lending parameters."}`,
        },
        {
          name: "Score validity",
          status: assessment.score >= 300 ? "Pass" : "Watch",
          summary: `Composite score ${assessment.score}/1000. ${assessment.score < 300 ? "Below minimum lending threshold." : "Above minimum required for standard offers."}`,
        },
      ]
    : [
        {
          name: "Wallet integrity",
          status: "Pending",
          summary: "Connect your wallet and run an assessment to see integrity results.",
        },
        {
          name: "Credit credential",
          status: "Pending",
          summary: "Assessment required to validate credential status.",
        },
        {
          name: "Risk posture",
          status: "Pending",
          summary: "Risk agent output needed — run pipeline.",
        },
        {
          name: "Score validity",
          status: "Pending",
          summary: "Score not yet computed for this session.",
        },
      ];

  const complianceStats = [
    {
      label: "Credential status",
      value: isLoading ? "…" : assessment?.active ? "Active" : assessment ? "Inactive" : "—",
      detail: isLoading
        ? "Assessment running…"
        : assessment?.active
        ? "Attestation is current and query-ready"
        : "Connect wallet to check",
      tone: assessment?.active ? "green" : "",
    },
    {
      label: "Monitoring",
      value: "24/7",
      detail: "Continuous watch across wallet and collateral state",
      tone: "green",
    },
    {
      label: "Risk tier",
      value: assessment?.tier ? `Tier ${assessment.tier}` : "—",
      detail: assessment ? `Score ${assessment.score}` : "From pipeline output",
      tone: assessment?.tier === "A" ? "green" : assessment?.tier ? "gold" : "",
    },
    {
      label: "Reuse readiness",
      value: assessment ? (assessment.active ? "High" : "Low") : "—",
      detail: "Portable profile for partner protocol queries",
      tone: "",
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
            <h1 className="dash-page-title">Compliance</h1>
            <p className="dash-page-caption">
              Inspect the control surface around the Aurum credential so protocols
              can understand identity quality, monitoring coverage, and the
              exceptions that still need caution.
            </p>
          </article>

          {isError && (
            <div className="dash-error-banner" role="alert">
              <span>Assessment failed: {error}</span>
              {connected && address && (
                <button
                  type="button"
                  className="dash-error-retry"
                  onClick={() => void assess(address)}
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <div className="dash-stat-row">
            {complianceStats.map((stat) => (
              <article key={stat.label} className="dash-stat-card aurora-border">
                <div className="dash-stat-label">{stat.label}</div>
                <div
                  className={`dash-stat-value${stat.tone ? ` ${stat.tone}` : ""}`}
                >
                  {stat.value}
                </div>
                <div className="dash-stat-delta">{stat.detail}</div>
              </article>
            ))}
          </div>

          <div className="detail-grid">
            <article className="data-card aurora-border">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Control checks</span>
                <span className="dash-panel-hint gold">
                  {complianceChecks.length} checks
                </span>
              </div>

              <div className="score-bars">
                {complianceChecks.map((check) => (
                  <div key={check.name} className="score-row">
                    <header>
                      <strong>{check.name}</strong>
                      <span
                        className={`mini-badge${check.status === "Watch" || check.status === "Pending" || check.status === "Review" ? " gold" : ""}`}
                      >
                        {check.status}
                      </span>
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
                  Aurum compliance is about making credit reusable and
                  inspectable. Protocols should be able to query not just the
                  score, but the conditions that make that score trustworthy.
                </p>
              </div>

              <div className="score-bars">
                {COMPLIANCE_SURFACES.map((surface) => (
                  <div key={surface} className="score-row">
                    <strong>{surface}</strong>
                  </div>
                ))}
              </div>

              {assessment && (
                <div style={{ marginTop: "1.25rem" }}>
                  <div className="score-row">
                    <strong>Default prob (30d)</strong>
                    <div className="agent-subtitle">
                      {(assessment.default_prob * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div className="score-row">
                    <strong>On-chain tx</strong>
                    <div
                      className="agent-subtitle"
                      style={{ wordBreak: "break-all" }}
                    >
                      {assessment.tx_hash}
                    </div>
                  </div>
                </div>
              )}
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
