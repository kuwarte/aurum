"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ScoreCard } from "@/components/score-card";
import { ScoreHistory } from "@/components/score-history";
import { ShapBreakdown } from "@/components/shap-breakdown";
import { scoreHistory, shapFactors } from "@/lib/aurum-data";
import { useWalletSession } from "@/lib/use-wallet-session";

const SCORE_STATS = [
  { label: "Model family", value: "Composite ensemble", detail: "Behavioral + oracle + portfolio factors" },
  { label: "Latest cycle", value: "12 seconds ago", detail: "Fresh oracle and agent data included" },
  { label: "Positive drivers", value: "3 major lifts", detail: "Repayment cadence, longevity, diversity" },
  { label: "Watch items", value: "2 drags", detail: "Utilization and oracle stress remain open" },
];

const SCORE_PILLARS = [
  {
    title: "Behavioral reliability",
    summary: "Wallet cash-flow rhythm, repayment consistency, and account longevity anchor the core score base.",
  },
  {
    title: "Risk posture",
    summary: "Utilization, leverage sensitivity, and fraud flags keep the model from over-rewarding short bursts of activity.",
  },
  {
    title: "Collateral context",
    summary: "RWA exposure, diversification, and oracle freshness shape how much lenders can trust the collateral mix.",
  },
];

export default function ScoreBreakdownPage() {
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
            <h1 className="dash-page-title">Score Logic</h1>
            <p className="dash-page-caption">
              See how Aurum turns wallet behavior, oracle integrity, and portfolio quality into an explainable
              credit profile that lenders can actually inspect.
            </p>
          </article>

          <div className="dash-stat-row">
            {SCORE_STATS.map((stat) => (
              <article key={stat.label} className="dash-stat-card aurora-border">
                <div className="dash-stat-label">{stat.label}</div>
                <div className="dash-stat-value">{stat.value}</div>
                <div className="dash-stat-delta">{stat.detail}</div>
              </article>
            ))}
          </div>

          <div className="metric-grid">
            <ScoreCard />
            <ScoreHistory history={scoreHistory} />
          </div>

          <div className="detail-grid score-logic-grid">
            <ShapBreakdown factors={shapFactors} />

            <article className="data-card aurora-border">
              <div>
                <h2>Interpretation guide</h2>
                <p className="chart-note">
                  Each factor carries both weight and context. Positive values lift lender confidence, while negative
                  weights identify the exact risks the monitoring loop is still pricing in.
                </p>
              </div>

              <div className="score-bars">
                {shapFactors.map((factor) => (
                  <div key={factor.label} className="score-row">
                    <header>
                      <strong>{factor.label}</strong>
                      <span className={factor.impact > 0 ? "text-green" : "dash-stat-value gold"}>
                        {factor.impact > 0 ? "+" : ""}
                        {factor.impact}
                      </span>
                    </header>
                    <div className="agent-subtitle">{factor.reason}</div>
                  </div>
                ))}
              </div>
            </article>
          </div>

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
        </section>
      </div>
    </main>
  );
}
