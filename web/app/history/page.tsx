"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useWalletSession } from "@/lib/use-wallet-session";

const HISTORY_STATS = [
  { label: "Events logged", value: "24", detail: "Recent score, oracle, and lending lifecycle entries", tone: "green" },
  { label: "Last score update", value: "2h ago", detail: "Most recent composite refresh in the feed", tone: "gold" },
  { label: "Credential renewals", value: "3", detail: "Successful attestation refreshes in the active window", tone: "green" },
  { label: "Risk alerts", value: "1", detail: "One notable posture change still under watch", tone: "" },
];

const HISTORY_FEED = [
  {
    title: "Score updated",
    time: "2 hours ago",
    status: "Completed",
    summary: "The credit agent lifted the score after another clean repayment cycle and stable wallet liquidity.",
  },
  {
    title: "Oracle queried",
    time: "5 hours ago",
    status: "Verified",
    summary: "Collateral feed freshness was rechecked before lender-side terms were repriced for the session.",
  },
  {
    title: "Credential renewed",
    time: "1 day ago",
    status: "Minted",
    summary: "Attestation Agent published a fresh credit credential snapshot for downstream protocol queries.",
  },
  {
    title: "Risk assessed",
    time: "1 day ago",
    status: "Reviewed",
    summary: "Risk Agent reran short-horizon default posture and kept the wallet in a top-tier confidence band.",
  },
  {
    title: "Offer repriced",
    time: "2 days ago",
    status: "Synced",
    summary: "Lending desks compressed APR after monitor health, diversification, and repayment cadence held steady.",
  },
];

const HISTORY_GROUPS = [
  {
    title: "Credit timeline",
    items: ["Score changes", "SHAP driver shifts", "Attestation renewals"],
  },
  {
    title: "Lender activity",
    items: ["Offer repricing", "Oracle reads", "Capital availability updates"],
  },
  {
    title: "Monitoring trail",
    items: ["Risk posture flags", "Fraud checks", "Collateral drift watches"],
  },
];

export default function HistoryPage() {
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
            <h1 className="dash-page-title">History</h1>
            <p className="dash-page-caption">
              Review the living audit trail behind the Aurum profile, from score updates and oracle reads to
              credential renewals and lender-side repricing events.
            </p>
          </article>

          <div className="dash-stat-row">
            {HISTORY_STATS.map((stat) => (
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
                <span className="dash-panel-title">Activity feed</span>
                <span className="dash-live-badge">
                  <span className="dash-pill-dot" />
                  Rolling 72h
                </span>
              </div>

              <div className="score-bars">
                {HISTORY_FEED.map((entry) => (
                  <div key={`${entry.title}-${entry.time}`} className="score-row">
                    <header>
                      <div>
                        <strong>{entry.title}</strong>
                        <div className="agent-subtitle">{entry.time}</div>
                      </div>
                      <span className="mini-badge">{entry.status}</span>
                    </header>
                    <div className="agent-subtitle">{entry.summary}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="data-card aurora-border">
              <div>
                <h2>What gets recorded</h2>
                <p className="chart-note">
                  History is not just a changelog. It is the evidence layer that lets operators and lenders trace why
                  credit posture moved, when it moved, and which subsystem triggered it.
                </p>
              </div>

              <div className="section-grid score-pillars-grid">
                {HISTORY_GROUPS.map((group) => (
                  <article key={group.title} className="score-row">
                    <strong>{group.title}</strong>
                    <div className="agent-subtitle">{group.items.join(" • ")}</div>
                  </article>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
