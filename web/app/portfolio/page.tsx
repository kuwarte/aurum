"use client";

import { useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useAppPreferences } from "@/lib/app-preferences";
import { formatCurrencyWithEstimate } from "@/lib/currency";
import { useWalletSession } from "@/lib/use-wallet-session";
import { useAssessment } from "@/lib/use-assessment";

export default function PortfolioPage() {
  const { connected, address, toggleWallet, walletLabel } = useWalletSession();
  const {
    preferences: { currency, refreshWindow, showFiatEstimate },
  } = useAppPreferences();
  const { assessment, isLoading, isIdle, assess } = useAssessment();

  // Auto-assess if connected and no data
  useEffect(() => {
    if (connected && address && isIdle) void assess(address);
  }, [connected, address, isIdle, assess]);

  // ─── Derive portfolio data from raw_wallet_data ─────────────────────────

  const raw = assessment?.raw_wallet_data;

  const positions = raw?.positions?.positions ?? [];
  const rwaEvents = raw?.rwa?.rwa_events ?? [];
  const yieldEvents = raw?.yield?.yield_events ?? [];
  const loans = raw?.loans?.loans ?? [];
  const volumeSummary = raw?.volume_summary;
  const flowSummary = raw?.flow_summary;

  const cspr = flowSummary?.asset_breakdown?.CSPR;
  const inbound  = cspr?.inbound  ?? 0;
  const outbound = cspr?.outbound ?? 0;

  // Build allocation mix from what we actually have
  const allocationItems = [
    { label: "DeFi positions",    value: positions.length },
    { label: "RWA events",        value: rwaEvents.length },
    { label: "Yield events",      value: yieldEvents.length },
    { label: "Active loans",      value: loans.filter((l) => l.status === "active").length },
  ].filter((a) => a.value > 0);

  const totalItems = allocationItems.reduce((s, a) => s + a.value, 0) || 1;
  const allocationPct = allocationItems.map((a) => ({
    label: a.label,
    value: Math.round((a.value / totalItems) * 100),
    count: a.value,
  }));

  // Fallback allocation when no data yet
  const defaultAllocation = [
    { label: "Tokenized treasuries", value: 42, count: 0 },
    { label: "Invoice receivables",  value: 24, count: 0 },
    { label: "Commodity notes",      value: 18, count: 0 },
    { label: "Cash equivalents",     value: 16, count: 0 },
  ];

  const displayAllocation = allocationPct.length > 0 ? allocationPct : defaultAllocation;

  // Sub-scores from pipeline for stats
  const subScores = assessment?.sub_scores;
  const rwaScore = subScores?.rwa ?? 0;
  const defiScore = subScores?.defi ?? 0;
  const incomeScore = subScores?.income ?? 0;

  // Borrowing limit from attestation (motes → CSPR, 1 CSPR = 1e9 motes)
  const borrowingLimitCspr = assessment
    ? (assessment.borrowing_limit_motes / 1e9).toFixed(0)
    : null;

  const portfolioStats = [
    {
      label: "RWA score",
      value: assessment ? `${rwaScore}/100` : "—",
      detail: `${rwaEvents.length} RWA event${rwaEvents.length !== 1 ? "s" : ""} on-chain`,
      tone: rwaScore >= 60 ? "gold" : "",
    },
    {
      label: "DeFi score",
      value: assessment ? `${defiScore}/100` : "—",
      detail: `${positions.length} active position${positions.length !== 1 ? "s" : ""}`,
      tone: defiScore >= 60 ? "green" : "",
    },
    {
      label: "Income score",
      value: assessment ? `${incomeScore}/100` : "—",
      detail: `Inbound ${inbound.toFixed(0)} CSPR / Outbound ${outbound.toFixed(0)} CSPR`,
      tone: incomeScore >= 60 ? "green" : "",
    },
    {
      label: "Borrowing limit",
      value: borrowingLimitCspr ? `${Number(borrowingLimitCspr).toLocaleString()} CSPR` : "—",
      detail: assessment ? `Tier ${assessment.tier} ceiling` : "Run assessment to see",
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
            <h1 className="dash-page-title">RWA Portfolio</h1>
            <p className="dash-page-caption">
              Inspect the real-world asset mix and DeFi positions behind the
              wallet so lenders can evaluate backing quality, liquidity, and
              downside resilience.
            </p>
          </article>

          {/* Stats */}
          <div className="dash-stat-row">
            {portfolioStats.map((stat) => (
              <article key={stat.label} className="dash-stat-card aurora-border">
                <div className="dash-stat-label">{stat.label}</div>
                <div className={`dash-stat-value${stat.tone ? ` ${stat.tone}` : ""}`}>
                  {isLoading ? <span style={{ opacity: 0.4 }}>…</span> : stat.value}
                </div>
                <div className="dash-stat-delta">{stat.detail}</div>
              </article>
            ))}
          </div>

          <div className="portfolio-overview">
            {/* Allocation mix */}
            <article className="data-card aurora-border">
              <div>
                <h2>Allocation mix</h2>
                <p className="chart-note">
                  {assessment
                    ? "Derived from on-chain data: DeFi positions, RWA events, yield events, and active loans."
                    : "Connect wallet and run assessment to see live allocation."}
                </p>
                <div className="money-secondary">
                  {refreshWindow === "Live" ? "Live allocation feed" : `Refresh cadence ${refreshWindow}`}
                </div>
              </div>

              <div className="holdings-list">
                {displayAllocation.map((allocation) => (
                  <div key={allocation.label} className="allocation-row">
                    <div className="allocation-meta">
                      <span>{allocation.label}</span>
                      <strong>{allocation.value}%</strong>
                    </div>
                    <div className="allocation-track">
                      <div
                        className="allocation-fill"
                        style={{ width: `${allocation.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* Portfolio readout */}
            <article className="data-card aurora-border">
              <div>
                <h2>Portfolio readout</h2>
                <p className="chart-note">
                  Live metrics derived from the pipeline assessment.
                </p>
              </div>

              <div className="mini-metrics">
                <div>
                  <span>Tx count</span>
                  <strong>{volumeSummary?.transaction_count ?? "—"}</strong>
                </div>
                <div>
                  <span>Counterparties</span>
                  <strong>{volumeSummary?.counterparty_diversity ?? "—"}</strong>
                </div>
                <div>
                  <span>CSPR in</span>
                  <strong>{inbound > 0 ? `${inbound.toFixed(0)} CSPR` : "—"}</strong>
                </div>
                <div>
                  <span>CSPR out</span>
                  <strong>{outbound > 0 ? `${outbound.toFixed(0)} CSPR` : "—"}</strong>
                </div>
              </div>
            </article>
          </div>

          {/* DeFi positions */}
          {positions.length > 0 && (
            <article className="data-card aurora-border">
              <div className="dash-panel-head">
                <span className="dash-panel-title">DeFi positions</span>
                <span className="dash-panel-hint gold">{positions.length} active</span>
              </div>
              <div className="holdings-list">
                {positions.map((pos, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable list
                  <div key={i} className="holding-row">
                    <header>
                      <div>
                        <strong>{pos.protocol ?? "Unknown protocol"}</strong>
                        <div className="agent-subtitle">{pos.pool ?? "Pool"}</div>
                      </div>
                      <span className="mini-badge">{pos.status ?? "active"}</span>
                    </header>
                    {typeof pos.liquidity_usd === "number" && (
                      <div className="mini-metrics">
                        <div>
                          <span className="portfolio-meta">Liquidity</span>
                          <strong>
                            {formatCurrencyWithEstimate(pos.liquidity_usd, currency, showFiatEstimate).primary}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* RWA events */}
          {rwaEvents.length > 0 && (
            <article className="data-card aurora-border">
              <div className="dash-panel-head">
                <span className="dash-panel-title">RWA events</span>
                <span className="dash-panel-hint gold">{rwaEvents.length} recorded</span>
              </div>
              <div className="holdings-list">
                {rwaEvents.map((event, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable list
                  <div key={i} className="holding-row">
                    <header>
                      <div>
                        <strong>{event.asset_id ?? `Asset ${i + 1}`}</strong>
                        <div className="agent-subtitle">{event.event_type ?? "event"}</div>
                      </div>
                      {event.timestamp && (
                        <span className="mini-badge">
                          {new Date(event.timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </header>
                    {typeof event.value === "number" && (
                      <div className="mini-metrics">
                        <div>
                          <span className="portfolio-meta">Value</span>
                          <strong>
                            {formatCurrencyWithEstimate(event.value, currency, showFiatEstimate).primary}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* Empty state */}
          {!isLoading && !assessment && (
            <article className="data-card aurora-border">
              <div>
                <h2>No portfolio data yet</h2>
                <p className="chart-note">
                  {connected
                    ? "Run an assessment from the dashboard to pull live DeFi positions and RWA events."
                    : "Connect your Casper Wallet to load portfolio data."}
                </p>
              </div>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}
