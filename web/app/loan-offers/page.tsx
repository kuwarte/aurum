"use client";

import { useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useAppPreferences } from "@/lib/app-preferences";
import { formatCurrencyWithEstimate } from "@/lib/currency";
import { useWalletSession } from "@/lib/use-wallet-session";
import { useAssessment } from "@/lib/use-assessment";
import { loanOffers as fallbackOffers } from "@/lib/aurum-data";

export default function LoanOffersPage() {
  const { connected, address, toggleWallet, walletLabel } = useWalletSession();
  const {
    preferences: { currency, refreshWindow, showFiatEstimate },
  } = useAppPreferences();
  const { assessment, isLoading, isError, error, assess, isIdle } =
    useAssessment();

  // Auto-assess if wallet is connected but we have no data
  useEffect(() => {
    if (connected && address && isIdle) {
      void assess(address);
    }
  }, [connected, address, isIdle, assess]);

  // Use live offers or fall back to the static demo set
  const liveOffers = assessment?.loan_offers ?? [];
  const displayOffers =
    liveOffers.length > 0
      ? liveOffers.map((o) => ({
          lender: o.protocol,
          tag: `Tier ${assessment?.tier ?? "—"}`,
          summary: `${o.protocol} lending pool — ${o.rate} rate`,
          apr: o.rate,
          tenor: "—",
          amountUsd: o.max_loan,
          amount: `$${o.max_loan.toLocaleString()}`,
          collateral: "—",
          featured: false,
          highlights: [`${o.rate} rate`, `Up to $${o.max_loan.toLocaleString()}`],
        }))
      : fallbackOffers;

  const featuredOffer = displayOffers[0] ?? null;
  const maxCapacity = displayOffers.reduce(
    (acc, o) => Math.max(acc, o.amountUsd ?? 0),
    0,
  );

  // Best APR — pick lowest numeric value from liveOffers if available
  const bestApr = liveOffers.length > 0
    ? liveOffers
        .map((o) => parseFloat(o.rate.replace("%", "")))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b)[0]
    : null;

  type OfferStat =
    | { label: string; value: string; detail: string; tone: string }
    | { label: string; valueUsd: number; detail: string; tone: string };

  const offerStats: OfferStat[] = [
    {
      label: "Live offers",
      value: isLoading ? "…" : String(displayOffers.length),
      detail: isLoading ? "Pipeline running…" : "Curated against current score window",
      tone: "green",
    },
    {
      label: "Best APR",
      value: bestApr != null ? `${bestApr}%` : "—",
      detail: "Lowest quote in active market",
      tone: "gold",
    },
    {
      label: "Max capacity",
      valueUsd: maxCapacity,
      detail: "Top available amount across desks",
      tone: "",
    },
    {
      label: "Tier",
      value: assessment?.tier ? `Tier ${assessment.tier}` : "—",
      detail: assessment ? `Score ${assessment.score}` : "Run assessment to see",
      tone: assessment?.tier === "A" ? "green" : "",
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
            <h1 className="dash-page-title">Loan Offers</h1>
            <p className="dash-page-caption">
              Compare desks priced against the live Aurum score so borrowers can
              see how confidence, collateral mix, and monitoring posture translate
              into actual capital terms.
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

          {/* Stats */}
          <div className="dash-stat-row">
            {offerStats.map((stat) => (
              <article key={stat.label} className="dash-stat-card aurora-border">
                <div className="dash-stat-label">{stat.label}</div>
                {"valueUsd" in stat ? (
                  (() => {
                    const d = formatCurrencyWithEstimate(
                      stat.valueUsd,
                      currency,
                      showFiatEstimate,
                    );
                    return (
                      <>
                        <div className={`dash-stat-value${stat.tone ? ` ${stat.tone}` : ""}`}>
                          {d.primary}
                        </div>
                        {d.secondary ? (
                          <div className="money-secondary dash-stat-secondary">
                            {d.secondary}
                          </div>
                        ) : null}
                      </>
                    );
                  })()
                ) : (
                  <div className={`dash-stat-value${stat.tone ? ` ${stat.tone}` : ""}`}>
                    {stat.value}
                  </div>
                )}
                <div className="dash-stat-delta">{stat.detail}</div>
              </article>
            ))}
          </div>

          {/* Featured offer */}
          <div className="detail-grid">
            <article className="data-card aurora-border">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Featured match</span>
                <span className="dash-live-badge">
                  <span className="dash-pill-dot" />
                  {isLoading
                    ? "Matching…"
                    : refreshWindow === "Live"
                    ? "Best priced"
                    : `Best priced • ${refreshWindow}`}
                </span>
              </div>

              {featuredOffer ? (
                <>
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
                      <strong>
                        {
                          formatCurrencyWithEstimate(
                            featuredOffer.amountUsd,
                            currency,
                            showFiatEstimate,
                          ).primary
                        }
                      </strong>
                      {formatCurrencyWithEstimate(
                        featuredOffer.amountUsd,
                        currency,
                        showFiatEstimate,
                      ).secondary ? (
                        <div className="money-secondary">
                          {
                            formatCurrencyWithEstimate(
                              featuredOffer.amountUsd,
                              currency,
                              showFiatEstimate,
                            ).secondary
                          }
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
                    {featuredOffer.highlights.map((h) => (
                      <span key={h} className="mini-badge">
                        {h}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="chart-note">
                  {!connected
                    ? "Connect your wallet to see personalised offers."
                    : isLoading
                    ? "Pipeline is running — offers will appear shortly."
                    : "No offers available for your current tier."}
                </p>
              )}
            </article>

            <article className="data-card aurora-border">
              <div>
                <h2>Pricing logic</h2>
                <p className="chart-note">
                  Offers tighten when repayment consistency and portfolio quality
                  are strong, and widen when monitor alerts or utilization
                  pressure show up in the latest cycle.
                </p>
              </div>

              <div className="score-bars">
                {assessment?.shap ? (
                  Object.entries(assessment.shap)
                    .slice(0, 3)
                    .map(([key, val]) => (
                      <div key={key} className="score-row">
                        <header>
                          <span>
                            {key.replace(/_/g, " ").replace(/\b\w/g, (c) =>
                              c.toUpperCase(),
                            )}
                          </span>
                          <strong>{val >= 0 ? "Positive" : "Needs work"}</strong>
                        </header>
                        <div className="score-bar-track">
                          <div
                            className="score-bar-fill"
                            style={{
                              width: `${Math.min(100, Math.round(Math.abs(val) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                ) : (
                  <>
                    <div className="score-row">
                      <header><span>Repayment stability</span><strong>—</strong></header>
                      <div className="score-bar-track"><div className="score-bar-fill" style={{ width: "0%" }} /></div>
                    </div>
                    <div className="score-row">
                      <header><span>Collateral confidence</span><strong>—</strong></header>
                      <div className="score-bar-track"><div className="score-bar-fill" style={{ width: "0%" }} /></div>
                    </div>
                    <div className="score-row">
                      <header><span>Oracle freshness</span><strong>—</strong></header>
                      <div className="score-bar-track"><div className="score-bar-fill" style={{ width: "0%" }} /></div>
                    </div>
                  </>
                )}
              </div>
            </article>
          </div>

          {/* Full market book */}
          <article className="data-card aurora-border">
            <div className="dash-panel-head">
              <span className="dash-panel-title">Market book</span>
              <span className="dash-panel-hint gold">
                {displayOffers.length} active desk{displayOffers.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="offer-list">
              {displayOffers.map((offer) => (
                <div key={offer.lender} className="offer-row">
                  <header>
                    <div>
                      <strong>{offer.lender}</strong>
                      <div className="agent-subtitle">{offer.summary}</div>
                    </div>
                    <span className={`dash-offer-tier ${offer.featured ? "tier-a" : "tier-b"}`}>
                      {offer.tag}
                    </span>
                  </header>

                  <div className="offer-grid">
                    <div>
                      <span className="offer-meta">APR</span>
                      <strong>{offer.apr}</strong>
                    </div>
                    <div>
                      <span className="offer-meta">Amount</span>
                      <strong>
                        {
                          formatCurrencyWithEstimate(
                            offer.amountUsd,
                            currency,
                            showFiatEstimate,
                          ).primary
                        }
                      </strong>
                      {formatCurrencyWithEstimate(
                        offer.amountUsd,
                        currency,
                        showFiatEstimate,
                      ).secondary ? (
                        <div className="money-secondary">
                          {
                            formatCurrencyWithEstimate(
                              offer.amountUsd,
                              currency,
                              showFiatEstimate,
                            ).secondary
                          }
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
                    {offer.highlights.map((h) => (
                      <span key={h} className="mini-badge">
                        {h}
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
