"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useAppPreferences } from "@/lib/app-preferences";
import { formatCurrencyWithEstimate } from "@/lib/currency";
import { loanOffers } from "@/lib/aurum-data";
import { useWalletSession } from "@/lib/use-wallet-session";

type OfferStat = {
  label: string;
  value?: string;
  valueUsd?: number;
  detail: string;
  tone: string;
};

export default function LoanOffersPage() {
  const { connected, toggleWallet, walletLabel } = useWalletSession();
  const {
    preferences: { currency, refreshWindow, showFiatEstimate },
  } = useAppPreferences();
  const featuredOffer =
    loanOffers.find((offer) => offer.featured) ?? loanOffers[0];
  const maxCapacity =
    loanOffers.reduce(
      (highest, offer) => Math.max(highest, offer.amountUsd ?? 0),
      0,
    ) || 0;
  const offerStats: OfferStat[] = [
    { label: "Live offers", value: "4", detail: "Curated against the current score window", tone: "green" },
    { label: "Best APR", value: "6.4%", detail: "Lowest quote in the active market set", tone: "gold" },
    { label: "Max capacity", valueUsd: maxCapacity, detail: "Top available amount across desks", tone: "" },
    { label: "RWA-aware desks", value: "2", detail: "Offers that reward real-world collateral context", tone: "green" },
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
            <h1 className="dash-page-title">Loan Offers</h1>
            <p className="dash-page-caption">
              Compare desks priced against the live Aurum score so borrowers can see how confidence, collateral mix,
              and monitoring posture translate into actual capital terms.
            </p>
          </article>

          <div className="dash-stat-row">
            {offerStats.map((stat) => (
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

          <div className="detail-grid">
            <article className="data-card aurora-border">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Featured match</span>
                <span className="dash-live-badge">
                  <span className="dash-pill-dot" />
                  {refreshWindow === "Live" ? "Best priced" : `Best priced • ${refreshWindow}`}
                </span>
              </div>

              <div>
                <h2>{featuredOffer.lender}</h2>
                <p className="chart-note">{featuredOffer.summary}</p>
              </div>

              <div className="offer-grid">
                <div>
                  <span className="offer-meta">APR</span>
                  <strong>{featuredOffer.apr}</strong>
                </div>
                <div>
                  <span className="offer-meta">Amount</span>
                  <strong>{formatCurrencyWithEstimate(featuredOffer.amountUsd, currency, showFiatEstimate).primary}</strong>
                  {formatCurrencyWithEstimate(featuredOffer.amountUsd, currency, showFiatEstimate).secondary ? (
                    <div className="money-secondary">
                      {formatCurrencyWithEstimate(featuredOffer.amountUsd, currency, showFiatEstimate).secondary}
                    </div>
                  ) : null}
                </div>
                <div>
                  <span className="offer-meta">Tenor</span>
                  <strong>{featuredOffer.tenor}</strong>
                </div>
                <div>
                  <span className="offer-meta">Collateral</span>
                  <strong>{featuredOffer.collateral}</strong>
                </div>
              </div>

              <div className="data-points">
                {featuredOffer.highlights.map((highlight) => (
                  <span key={highlight} className="mini-badge">
                    {highlight}
                  </span>
                ))}
              </div>
            </article>

            <article className="data-card aurora-border">
              <div>
                <h2>Pricing logic</h2>
                <p className="chart-note">
                  Offers tighten when repayment consistency and portfolio quality are strong, and widen when monitor
                  alerts or utilization pressure show up in the latest cycle.
                </p>
              </div>

              <div className="score-bars">
                <div className="score-row">
                  <header>
                    <span>Repayment stability</span>
                    <strong>Strong</strong>
                  </header>
                  <div className="score-bar-track"><div className="score-bar-fill" style={{ width: "88%" }} /></div>
                </div>
                <div className="score-row">
                  <header>
                    <span>Collateral confidence</span>
                    <strong>High</strong>
                  </header>
                  <div className="score-bar-track"><div className="score-bar-fill" style={{ width: "81%" }} /></div>
                </div>
                <div className="score-row">
                  <header>
                    <span>Oracle freshness</span>
                    <strong>Stable</strong>
                  </header>
                  <div className="score-bar-track"><div className="score-bar-fill" style={{ width: "76%" }} /></div>
                </div>
              </div>
            </article>
          </div>

          <article className="data-card aurora-border">
            <div className="dash-panel-head">
              <span className="dash-panel-title">Market book</span>
              <span className="dash-panel-hint gold">{loanOffers.length} active desks</span>
            </div>

            <div className="offer-list">
              {loanOffers.map((offer) => (
                <div key={offer.lender} className="offer-row">
                  <header>
                    <div>
                      <strong>{offer.lender}</strong>
                      <div className="agent-subtitle">{offer.summary}</div>
                    </div>
                    <span className={`dash-offer-tier ${offer.featured ? "tier-a" : "tier-b"}`}>{offer.tag}</span>
                  </header>

                  <div className="offer-grid">
                    <div>
                      <span className="offer-meta">APR</span>
                      <strong>{offer.apr}</strong>
                    </div>
                    <div>
                      <span className="offer-meta">Amount</span>
                      <strong>{formatCurrencyWithEstimate(offer.amountUsd, currency, showFiatEstimate).primary}</strong>
                      {formatCurrencyWithEstimate(offer.amountUsd, currency, showFiatEstimate).secondary ? (
                        <div className="money-secondary">
                          {formatCurrencyWithEstimate(offer.amountUsd, currency, showFiatEstimate).secondary}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <span className="offer-meta">Tenor</span>
                      <strong>{offer.tenor}</strong>
                    </div>
                    <div>
                      <span className="offer-meta">Collateral</span>
                      <strong>{offer.collateral}</strong>
                    </div>
                  </div>

                  <div className="data-points">
                    {offer.highlights.map((highlight) => (
                      <span key={highlight} className="mini-badge">
                        {highlight}
                      </span>
                    ))}
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
