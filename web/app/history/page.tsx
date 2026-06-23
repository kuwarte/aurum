"use client";

import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useWalletSession } from "@/lib/use-wallet-session";
import { useAssessment } from "@/lib/use-assessment";
import { fetchOracleHistory, type OracleHistoryEntry } from "@/lib/api-client";

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

function relativeTime(timestamp: string): string {
  try {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return "—";
  }
}

export default function HistoryPage() {
  const { connected, address, toggleWallet, walletLabel } = useWalletSession();
  const { assessment, isIdle, assess } = useAssessment();
  const [history, setHistory] = useState<OracleHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Auto-assess if needed
  useEffect(() => {
    if (connected && address && isIdle) {
      void assess(address);
    }
  }, [connected, address, isIdle, assess]);

  // Fetch oracle history when wallet address is available
  useEffect(() => {
    if (!address) return;
    fetchOracleHistory(address)
      .then((res) => {
        setHistoryError(null);
        setHistory(res.history);
      })
      .catch((err) => {
        setHistoryError(err instanceof Error ? err.message : "Failed to load history");
      })
      .finally(() => setHistoryLoading(false));
  }, [address]);

  // Build activity feed from oracle history + current assessment
  const activityFeed = [
    ...(assessment
      ? [
          {
            title: "Score assessed",
            time: "Just now",
            status: "Completed",
            summary: `Credit score ${assessment.score} — tier ${assessment.tier} — credential ${assessment.active ? "active" : "inactive"}.`,
          },
        ]
      : []),
    ...history.map((entry) => ({
      title: "Score recorded",
      time: relativeTime(entry.timestamp),
      status: "Verified",
      summary: `Score ${entry.score} — tier ${entry.tier} — recorded on Casper via oracle.`,
    })),
  ];

  const stats = [
    {
      label: "Events logged",
      value: String(activityFeed.length || "—"),
      detail: "Score and oracle lifecycle entries",
      tone: "green",
    },
    {
      label: "Last score update",
      value: assessment ? "Just now" : history[0] ? relativeTime(history[0].timestamp) : "—",
      detail: "Most recent composite refresh",
      tone: "gold",
    },
    {
      label: "History entries",
      value: historyLoading ? "…" : String(history.length),
      detail: "Oracle-recorded assessments",
      tone: "green",
    },
    {
      label: "Current tier",
      value: assessment?.tier ? `Tier ${assessment.tier}` : history[0]?.tier ? `Tier ${history[0].tier}` : "—",
      detail: assessment ? "From latest pipeline run" : "From oracle history",
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
            <h1 className="dash-page-title">History</h1>
            <p className="dash-page-caption">
              Review the living audit trail behind the Aurum profile, from score
              updates and oracle reads to credential renewals and lender-side
              repricing events.
            </p>
          </article>

          {historyError && (
            <div className="dash-error-banner" role="alert">
              <span>History load failed: {historyError}</span>
            </div>
          )}

          <div className="dash-stat-row">
            {stats.map((stat) => (
              <article key={stat.label} className="dash-stat-card aurora-border">
                <div className="dash-stat-label">{stat.label}</div>
                <div className={`dash-stat-value${stat.tone ? ` ${stat.tone}` : ""}`}>
                  {stat.value}
                </div>
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
                  {historyLoading ? "Loading…" : "Live"}
                </span>
              </div>

              <div className="score-bars">
                {activityFeed.length === 0 && !historyLoading && (
                  <div className="score-row">
                    <div className="agent-subtitle">
                      {connected
                        ? "No history found. Run an assessment to create the first entry."
                        : "Connect your wallet to see history."}
                    </div>
                  </div>
                )}
                {historyLoading && (
                  <div className="score-row">
                    <div className="agent-subtitle">Loading oracle history…</div>
                  </div>
                )}
                {activityFeed.map((entry, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: order is stable
                  <div key={i} className="score-row">
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
                  History is not just a changelog. It is the evidence layer that
                  lets operators and lenders trace why credit posture moved, when
                  it moved, and which subsystem triggered it.
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

              {assessment && (
                <div className="score-row" style={{ marginTop: "1rem" }}>
                  <strong>Last tx hash</strong>
                  <div className="agent-subtitle" style={{ wordBreak: "break-all" }}>
                    {assessment.tx_hash}
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
