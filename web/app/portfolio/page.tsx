"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useAppPreferences } from "@/lib/app-preferences";
import { formatCurrencyWithEstimate } from "@/lib/currency";
import { portfolioAllocations, portfolioHoldings } from "@/lib/aurum-data";
import { useWalletSession } from "@/lib/use-wallet-session";

type PortfolioStat = {
  label: string;
  value?: string;
  valueUsd?: number;
  detail: string;
  tone: string;
};

export default function PortfolioPage() {
  const { connected, toggleWallet, walletLabel } = useWalletSession();
  const {
    preferences: { currency, refreshWindow, showFiatEstimate },
  } = useAppPreferences();
  const totalPortfolioValue = portfolioHoldings.reduce(
    (sum, holding) => sum + (holding.valueUsd ?? 0),
    0,
  );
  const portfolioStats: PortfolioStat[] = [
    { label: "RWA value", valueUsd: totalPortfolioValue, detail: "Tokenized backing visible to the score", tone: "gold" },
    { label: "Yield average", value: "7.8%", detail: "Blended across the active holdings set", tone: "green" },
    { label: "Coverage ratio", value: "1.9x", detail: "Collateral support against current borrow need", tone: "green" },
    { label: "Liquidity window", value: "48h", detail: "Expected time to rotate into usable coverage", tone: "" },
  ] as const;

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
              Inspect the real-world asset mix behind the wallet so lenders can evaluate backing quality, liquidity,
              and downside resilience with the same clarity as the rest of the Aurum score.
            </p>
          </article>

          <div className="dash-stat-row">
            {portfolioStats.map((stat) => (
              <article key={stat.label} className="dash-stat-card aurora-border">
                <div className="dash-stat-label">{stat.label}</div>
                {typeof stat.valueUsd === "number" ? (
                  (() => {
                    const displayAmount = formatCurrencyWithEstimate(
                      stat.valueUsd,
                      currency,
                      showFiatEstimate,
                    );

                    return (
                      <>
                        <div className={`dash-stat-value${stat.tone ? ` ${stat.tone}` : ""}`}>
                          {displayAmount.primary}
                        </div>
                        {displayAmount.secondary ? (
                          <div className="money-secondary dash-stat-secondary">
                            {displayAmount.secondary}
                          </div>
                        ) : null}
                      </>
                    );
                  })()
                ) : (
                  <div className={`dash-stat-value${stat.tone ? ` ${stat.tone}` : ""}`}>{stat.value}</div>
                )}
                <div className="dash-stat-delta">{stat.detail}</div>
              </article>
            ))}
          </div>

          <div className="portfolio-overview">
            <article className="data-card aurora-border">
              <div>
                <h2>Allocation mix</h2>
                <p className="chart-note">
                  Diversification matters because concentration can create fragility even when headline value looks
                  strong.
                </p>
                <div className="money-secondary">
                  {refreshWindow === "Live" ? "Live allocation feed" : `Refresh cadence ${refreshWindow}`}
                </div>
              </div>

              <div className="holdings-list">
                {portfolioAllocations.map((allocation) => (
                  <div key={allocation.label} className="allocation-row">
                    <div className="allocation-meta">
                      <span>{allocation.label}</span>
                      <strong>{allocation.value}%</strong>
                    </div>
                    <div className="allocation-track">
                      <div className="allocation-fill" style={{ width: `${allocation.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="data-card aurora-border">
              <div>
                <h2>Portfolio readout</h2>
                <p className="chart-note">
                  Treasury, receivable, commodity, and cash-management positions give the score a more grounded view
                  than token balances alone.
                </p>
              </div>

              <div className="mini-metrics">
                <div>
                  <span>Volatility</span>
                  <strong>Low</strong>
                </div>
                <div>
                  <span>Yield quality</span>
                  <strong>Stable</strong>
                </div>
                <div>
                  <span>Liquidity window</span>
                  <strong>48h</strong>
                </div>
                <div>
                  <span>Coverage ratio</span>
                  <strong>1.9x</strong>
                </div>
              </div>
            </article>
          </div>

          <article className="data-card aurora-border">
            <div className="dash-panel-head">
              <span className="dash-panel-title">Asset inventory</span>
              <span className="dash-panel-hint gold">{portfolioHoldings.length} tracked holdings</span>
            </div>

            <div className="holdings-list">
              {portfolioHoldings.map((holding) => (
                <div key={holding.name} className="holding-row">
                  <header>
                    <div>
                      <strong>{holding.name}</strong>
                      <div className="agent-subtitle">{holding.type}</div>
                    </div>
                    <span className="mini-badge">{holding.yield}</span>
                  </header>

                  <p className="chart-note">{holding.summary}</p>

                  <div className="mini-metrics">
                    <div>
                      <span className="portfolio-meta">Position value</span>
                      <strong>{formatCurrencyWithEstimate(holding.valueUsd, currency, showFiatEstimate).primary}</strong>
                      {formatCurrencyWithEstimate(holding.valueUsd, currency, showFiatEstimate).secondary ? (
                        <div className="money-secondary">
                          {formatCurrencyWithEstimate(holding.valueUsd, currency, showFiatEstimate).secondary}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <span className="portfolio-meta">Yield</span>
                      <strong>{holding.yield}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
