"use client";

import { useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ScoreCard } from "@/components/score-card";
import { ScoreHistory } from "@/components/score-history";
import { ShapBreakdown } from "@/components/shap-breakdown";
import { useWalletSession } from "@/lib/use-wallet-session";
import { useAssessment } from "@/lib/use-assessment";
import { fetchOracleHistory } from "@/lib/api-client";
import { useState } from "react";
import type { OracleHistoryEntry } from "@/lib/api-client";

const SCORE_PILLARS = [
  {
    title: "Behavioral reliability",
    summary:
      "Wallet cash-flow rhythm, repayment consistency, and account longevity anchor the core score base.",
  },
  {
    title: "Risk posture",
    summary:
      "Utilization, leverage sensitivity, and fraud flags keep the model from over-rewarding short bursts of activity.",
  },
  {
    title: "Collateral context",
    summary:
      "RWA exposure, diversification, and oracle freshness shape how much lenders can trust the collateral mix.",
  },
];

// Month labels for history display
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function historyToChartPoints(
  history: OracleHistoryEntry[],
  currentScore?: number,
): Array<{ label: string; score: number }> {
  const points = history
    .slice()
    .reverse()
    .map((entry) => {
      const d = new Date(entry.timestamp);
      return {
        label: MONTH_LABELS[d.getMonth()] ?? "—",
        score: entry.score,
      };
    });

  if (currentScore !== undefined) {
    const now = new Date();
    points.push({ label: MONTH_LABELS[now.getMonth()] ?? "Now", score: currentScore });
  }

  // Deduplicate by label keeping last
  const seen = new Map<string, { label: string; score: number }>();
  for (const p of points) seen.set(p.label, p);
  return Array.from(seen.values()).slice(-6);
}

// Convert shap dict → ShapFactor array the ShapBreakdown component expects
function shapDictToFactors(shap: Record<string, number>) {
  return Object.entries(shap)
    .map(([key, val]) => ({
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      impact: Math.round(val),
      reason: getShapReason(key, val),
    }))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

function getShapReason(feature: string, value: number): string {
  const positive = value >= 0;
  const map: Record<string, [string, string]> = {
    repayment:       ["Consistent repayments strengthen lender confidence.", "Repayment gaps reduce credit reliability."],
    wallet_activity: ["Active transaction history shows healthy wallet usage.", "Low activity signals a dormant or thin wallet."],
    defi:            ["DeFi participation adds behavioral depth to the profile.", "Minimal DeFi engagement limits scoring signals."],
    dao:             ["DAO governance activity signals long-term engagement.", "No governance participation reduces community trust signals."],
    rwa:             ["Real-world asset backing increases collateral confidence.", "Lack of RWA exposure limits collateral diversity."],
    income:          ["Consistent inflows support reliable repayment capacity.", "Irregular income patterns increase default risk."],
  };
  const [pos, neg] = map[feature] ?? ["Positive signal.", "Negative signal."];
  return positive ? pos : neg;
}

export default function ScoreBreakdownPage() {
  const { connected, address, toggleWallet, walletLabel } = useWalletSession();
  const { assessment, isLoading, isIdle, assess } = useAssessment();
  const [history, setHistory] = useState<OracleHistoryEntry[]>([]);

  // Auto-assess if wallet connected and no data
  useEffect(() => {
    if (connected && address && isIdle) void assess(address);
  }, [connected, address, isIdle, assess]);

  // Fetch oracle history
  useEffect(() => {
    if (!address) return;
    fetchOracleHistory(address)
      .then((res) => setHistory(res.history))
      .catch(() => null);
  }, [address]);

  const shapFactors = assessment?.shap
    ? shapDictToFactors(assessment.shap)
    : [];

  const chartHistory = historyToChartPoints(history, assessment?.score);

  // Sub-score stats row
  const subScores = assessment?.sub_scores;
  const scoreStats = [
    {
      label: "Model family",
      value: "XGBoost + SHAP",
      detail: "Behavioral + oracle + portfolio factors",
    },
    {
      label: "Risk analysis",
      value: assessment ? `Tier ${assessment.tier}` : "—",
      detail: assessment?.risk_analysis?.slice(0, 60) + (assessment?.risk_analysis && assessment.risk_analysis.length > 60 ? "…" : "") || "Run assessment to see",
    },
    {
      label: "Positive drivers",
      value: assessment
        ? String(shapFactors.filter((f) => f.impact > 0).length)
        : "—",
      detail: "Features lifting the score",
    },
    {
      label: "Watch items",
      value: assessment
        ? String(
            (assessment.early_warning_flags?.length ?? 0) +
            shapFactors.filter((f) => f.impact < 0).length,
          )
        : "—",
      detail: "Flags and negative SHAP factors",
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
            <h1 className="dash-page-title">Score Logic</h1>
            <p className="dash-page-caption">
              See how Aurum turns wallet behavior, oracle integrity, and
              portfolio quality into an explainable credit profile that lenders
              can actually inspect.
            </p>
          </article>

          {/* Stats row */}
          <div className="dash-stat-row">
            {scoreStats.map((stat) => (
              <article key={stat.label} className="dash-stat-card aurora-border">
                <div className="dash-stat-label">{stat.label}</div>
                <div className="dash-stat-value">
                  {isLoading ? <span style={{ opacity: 0.4 }}>…</span> : stat.value}
                </div>
                <div className="dash-stat-delta">{stat.detail}</div>
              </article>
            ))}
          </div>

          {/* Score card + history */}
          <div className="metric-grid">
            <ScoreCard />
            {chartHistory.length > 0 ? (
              <ScoreHistory history={chartHistory} />
            ) : (
              <article className="data-card aurora-border">
                <div>
                  <h2>Score history</h2>
                  <p className="chart-note">
                    {connected
                      ? isLoading
                        ? "Loading oracle history…"
                        : "Run an assessment to start building history."
                      : "Connect wallet to see score history."}
                  </p>
                </div>
              </article>
            )}
          </div>

          {/* SHAP breakdown + interpretation */}
          <div className="detail-grid score-logic-grid">
            {shapFactors.length > 0 ? (
              <ShapBreakdown factors={shapFactors} />
            ) : (
              <article className="data-card aurora-border">
                <div className="eyebrow">SHAP weights</div>
                <h2>Latest scoring factors</h2>
                <p className="chart-note">
                  {connected
                    ? isLoading
                      ? "Running SHAP analysis…"
                      : "Run an assessment to see factor weights."
                    : "Connect wallet to see SHAP breakdown."}
                </p>
              </article>
            )}

            <article className="data-card aurora-border">
              <div>
                <h2>Interpretation guide</h2>
                <p className="chart-note">
                  Each factor carries both weight and context. Positive values
                  lift lender confidence, while negative weights identify the
                  exact risks the monitoring loop is still pricing in.
                </p>
              </div>

              {shapFactors.length > 0 ? (
                <div className="score-bars">
                  {shapFactors.map((factor) => (
                    <div key={factor.label} className="score-row">
                      <header>
                        <strong>{factor.label}</strong>
                        <span
                          className={
                            factor.impact > 0
                              ? "text-green"
                              : "dash-stat-value gold"
                          }
                        >
                          {factor.impact > 0 ? "+" : ""}
                          {factor.impact}
                        </span>
                      </header>
                      <div className="agent-subtitle">{factor.reason}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="chart-note" style={{ marginTop: "1rem" }}>
                  Awaiting assessment data.
                </p>
              )}

              {/* Early warning flags */}
              {assessment?.early_warning_flags &&
                assessment.early_warning_flags.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <div className="dash-dimensions-head">Early warning flags</div>
                    {assessment.early_warning_flags.map((flag) => (
                      <div key={flag} className="score-row">
                        <div className="agent-subtitle" style={{ color: "var(--color-gold, #c6a435)" }}>
                          ⚠ {flag.replace(/_/g, " ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {/* Fraud summary */}
              {assessment && (
                <div style={{ marginTop: "1rem" }}>
                  <div className="dash-dimensions-head">Fraud assessment</div>
                  <div className="score-row">
                    <header>
                      <strong>Fraud score</strong>
                      <span>{(assessment.fraud_score * 100).toFixed(1)}%</span>
                    </header>
                    <div className="agent-subtitle">
                      {assessment.fraud_reasoning || "No anomalies detected."}
                    </div>
                  </div>
                  {assessment.fraud_flags.length > 0 && (
                    <div className="score-row">
                      <strong>Flags</strong>
                      <div className="agent-subtitle">
                        {assessment.fraud_flags.join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-scores */}
              {subScores && (
                <div style={{ marginTop: "1rem" }}>
                  <div className="dash-dimensions-head">Dimension scores</div>
                  {Object.entries(subScores).map(([key, val]) => (
                    <div key={key} className="score-row">
                      <header>
                        <span>
                          {key.replace(/_/g, " ").replace(/\b\w/g, (c) =>
                            c.toUpperCase(),
                          )}
                        </span>
                        <strong>{val}</strong>
                      </header>
                      <div className="score-bar-track">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          {/* Score pillars */}
          <div className="section-grid score-pillars-grid">
            {SCORE_PILLARS.map((pillar) => (
              <article key={pillar.title} className="data-card aurora-border">
                <div>
                  <h2>{pillar.title}</h2>
                  <p className="chart-note">{pillar.summary}</p>
                </div>
              </article>
            ))}
          </div>

          {/* Attestation detail */}
          {assessment && (
            <article className="data-card aurora-border" style={{ marginTop: "1rem" }}>
              <div className="dash-panel-head">
                <span className="dash-panel-title">Attestation</span>
                <span className="mini-badge">{assessment.deploy_mode}</span>
              </div>
              <div className="score-bars">
                <div className="score-row">
                  <strong>Summary</strong>
                  <div className="agent-subtitle">{assessment.attestation_summary}</div>
                </div>
                <div className="score-row">
                  <strong>Tx hash</strong>
                  <div className="agent-subtitle" style={{ wordBreak: "break-all" }}>
                    {assessment.tx_hash}
                  </div>
                </div>
                <div className="score-row">
                  <strong>Attestation hash</strong>
                  <div className="agent-subtitle" style={{ wordBreak: "break-all" }}>
                    {assessment.attestation_hash}
                  </div>
                </div>
                <div className="score-row">
                  <strong>Default prob (30d / 60d / 90d)</strong>
                  <div className="agent-subtitle">
                    {(assessment.default_prob * 100).toFixed(1)}% / {(assessment.default_prob_60d * 100).toFixed(1)}% / {(assessment.default_prob_90d * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="score-row">
                  <strong>Compliance level</strong>
                  <div className="agent-subtitle">{assessment.compliance_level || "standard"}</div>
                </div>
              </div>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}
