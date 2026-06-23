"use client";

import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useAssessment } from "@/lib/use-assessment";
import { useWalletSession } from "@/lib/use-wallet-session";
import { formatCurrencyWithEstimate } from "@/lib/currency";
import { useAppPreferences } from "@/lib/app-preferences";

const FLOW = [
  {
    label: "Protocol request",
    title: "Lender asks for a wallet profile",
    detail: "The lending app calls Aurum's oracle instead of running its own underwriting stack.",
  },
  {
    label: "x402 payment",
    title: "Protocol pays 1.5 CSPR",
    detail: "The borrower is not charged. The protocol attaches the payment proof to unlock the response.",
  },
  {
    label: "Aurum response",
    title: "Score, tier, and offers return",
    detail: "Aurum returns the latest score, risk tier, explainability, and tier-matched loan offers.",
  },
  {
    label: "Underwriting",
    title: "Protocol prices the loan",
    detail: "The lender can approve, cap, or decline credit using the returned Aurum bureau data.",
  },
];

export default function LendingDemoPage() {
  const { connected, address, toggleWallet, walletLabel } = useWalletSession();
  const { assessment, assessmentSource, assess, isLoading } = useAssessment();
  const {
    preferences: { currency, showFiatEstimate },
  } = useAppPreferences();

  const tier = assessment?.tier ?? "B";
  const score = assessment?.score ?? 682;
  const defaultProb = assessment?.default_prob ?? 0.067;
  const offers = assessment?.loan_offers?.length
    ? assessment.loan_offers
    : [
        { protocol: "Maple", rate: "12%", max_loan: 20000 },
        { protocol: "Clearpool", rate: "18%", max_loan: 5000 },
      ];
  const topOffer = offers[0];
  const topOfferValue = formatCurrencyWithEstimate(
    topOffer.max_loan,
    currency,
    showFiatEstimate,
  );

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
            <h1 className="dash-page-title">Lending Demo</h1>
            <p className="dash-page-caption">
              See how a DeFi lending protocol uses Aurum as an on-chain credit
              bureau: the protocol pays the x402 query fee, Aurum returns a
              score and risk tier, and the lender maps that profile to offers.
            </p>
          </article>

          <div className="dash-stat-row">
            <article className="dash-stat-card aurora-border">
              <div className="dash-stat-label">Query payer</div>
              <div className="dash-stat-value gold">Protocol</div>
              <div className="dash-stat-delta">Borrower is not charged for lookup</div>
            </article>
            <article className="dash-stat-card aurora-border">
              <div className="dash-stat-label">x402 fee</div>
              <div className="dash-stat-value gold">1.5 CSPR</div>
              <div className="dash-stat-delta">Paid before oracle data is returned</div>
            </article>
            <article className="dash-stat-card aurora-border">
              <div className="dash-stat-label">Returned tier</div>
              <div className="dash-stat-value green">Tier {tier}</div>
              <div className="dash-stat-delta">
                {assessmentSource === "cache" ? "Loaded from history" : "Demo underwriting profile"}
              </div>
            </article>
            <article className="dash-stat-card aurora-border">
              <div className="dash-stat-label">Best offer</div>
              <div className="dash-stat-value">{topOfferValue.primary}</div>
              <div className="dash-stat-delta">{topOffer.protocol} at {topOffer.rate}</div>
            </article>
          </div>

          <div className="detail-grid">
            <article className="data-card aurora-border">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Credit bureau response</span>
                <span className="dash-live-badge">
                  <span className="dash-pill-dot" />
                  {assessment ? "Wallet data" : "Demo data"}
                </span>
              </div>

              <div className="score-bars" style={{ marginTop: "1rem" }}>
                <div className="score-row">
                  <header>
                    <strong>Wallet</strong>
                    <span className="agent-subtitle" style={{ wordBreak: "break-all" }}>
                      {address ?? "Connect a Casper wallet to assess live data"}
                    </span>
                  </header>
                </div>
                <div className="score-row">
                  <header>
                    <strong>Aurum score</strong>
                    <span className="agent-subtitle">{score} / 1000</span>
                  </header>
                </div>
                <div className="score-row">
                  <header>
                    <strong>Risk tier</strong>
                    <span className="agent-subtitle">Tier {tier}</span>
                  </header>
                </div>
                <div className="score-row">
                  <header>
                    <strong>Default probability</strong>
                    <span className="agent-subtitle">{(defaultProb * 100).toFixed(1)}% over 30 days</span>
                  </header>
                </div>
              </div>

              <div className="dash-reassess-row" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
                {connected && address ? (
                  <button
                    type="button"
                    className="dash-reassess-btn"
                    disabled={isLoading}
                    onClick={() => void assess(address)}
                  >
                    {isLoading ? "Assessing..." : "Re-assess wallet"}
                  </button>
                ) : (
                  <button type="button" className="wallet-button primary" onClick={toggleWallet}>
                    Connect wallet
                  </button>
                )}
              </div>
            </article>

            <article className="data-card aurora-border">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Loan offer mapping</span>
                <span className="dash-panel-hint gold">{offers.length} offers</span>
              </div>

              <div className="dash-offer-list" style={{ marginTop: "1rem" }}>
                {offers.map((offer) => {
                  const value = formatCurrencyWithEstimate(
                    offer.max_loan,
                    currency,
                    false,
                  );
                  return (
                    <div key={offer.protocol} className="dash-offer-row">
                      <span className="dash-offer-protocol">{offer.protocol}</span>
                      <span className="dash-offer-amount">{value.primary}</span>
                      <span className={`dash-offer-tier tier-${tier.toLowerCase()}`}>
                        Tier {tier}
                      </span>
                      <span className="dash-offer-rate">{offer.rate}</span>
                    </div>
                  );
                })}
              </div>

              <p className="chart-note" style={{ marginTop: "1rem" }}>
                The demo offer list is illustrative unless the connected wallet
                already has a live Aurum assessment with returned lending-agent
                offers.
              </p>
            </article>
          </div>

          <article className="data-card aurora-border">
            <div className="dash-panel-head">
              <span className="dash-panel-title">Protocol integration flow</span>
              <Link href="/oracle-demo" className="dash-reassess-btn">
                Open oracle demo
              </Link>
            </div>

            <div className="subpage-summary-grid" style={{ marginTop: "1rem" }}>
              {FLOW.map((item) => (
                <div key={item.label} className="subpage-summary-card">
                  <div className="subpage-panel-label">{item.label}</div>
                  <h2>{item.title}</h2>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
