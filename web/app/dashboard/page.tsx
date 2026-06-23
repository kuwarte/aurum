"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useAppPreferences } from "@/lib/app-preferences";
import { formatCurrencyWithEstimate } from "@/lib/currency";
import { useWalletSession } from "@/lib/use-wallet-session";
import { useAssessment } from "@/lib/use-assessment";
import type { RiskTier, LoanOffer, ShapBreakdown } from "@/lib/api-client";

// ─── Static agent pipeline display (status shown from monitoring) ─────────────

const AGENTS = [
  { name: "Credit Agent",      status: "running", meta: "XGBoost - SHAP - 24h cycle",         pct: 82 },
  { name: "Risk Agent",        status: "running", meta: "GBM - 30/60/90d horizon",             pct: 67 },
  { name: "Fraud Agent",       status: "running", meta: "Graph analysis - Sybil detection",    pct: 91 },
  { name: "Attestation Agent", status: "running", meta: "Ed25519 - IPFS - Casper",             pct: 100 },
  { name: "Monitoring Agent",  status: "running", meta: "15 min heartbeat - CSPR.cloud",       pct: 55 },
  { name: "Lending Agent",     status: "standby", meta: "x402 - LangGraph - Casper MCP",      pct: 22 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tierToLabel(tier: RiskTier): string {
  return `Tier ${tier}`;
}

function tierTone(tier: RiskTier): string {
  if (tier === "A") return "green";
  if (tier === "B") return "gold";
  return "";
}

/** Convert backend shap dict (feature→value) to sorted display rows */
function shapToRows(shap: ShapBreakdown) {
  return Object.entries(shap)
    .map(([key, value]) => ({
      name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      score: Math.round(Math.abs(value) * 100),
      raw: value,
      tone: value >= 0 ? "green" : ("" as const),
    }))
    .sort((a, b) => Math.abs(b.raw) - Math.abs(a.raw))
    .slice(0, 6);
}

/** Best loan offer from the list */
function bestOffer(offers: LoanOffer[]) {
  return [...offers].sort((a, b) => b.max_loan - a.max_loan)[0] ?? null;
}

const CIRCUMFERENCE = 2 * Math.PI * 54;

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { connected, address, toggleWallet, walletLabel } = useWalletSession();
  const {
    preferences: { advancedSignals, currency, refreshWindow, showFiatEstimate },
  } = useAppPreferences();
  const {
    assessment,
    assessmentSource,
    isLoading,
    isCheckingCache,
    isError,
    error,
    assess,
    hydrateFromHistory,
    isIdle,
  } =
    useAssessment();

  const [barsAnimated, setBarsAnimated] = useState(false);
  const ringRef = useRef<SVGCircleElement>(null);
  const autoCheckedWalletRef = useRef<string | null>(null);

  // On connect, check cached oracle history before running the full pipeline.
  useEffect(() => {
    if (
      connected &&
      address &&
      isIdle &&
      autoCheckedWalletRef.current !== address
    ) {
      autoCheckedWalletRef.current = address;
      void hydrateFromHistory(address).then((foundCachedAssessment) => {
        if (!foundCachedAssessment) {
          void assess(address);
        }
      });
    }
  }, [connected, address, isIdle, hydrateFromHistory, assess]);

  // Animate ring whenever score data arrives
  const score = assessment?.score ?? 0;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBarsAnimated(true);
      if (ringRef.current) {
        const offset = CIRCUMFERENCE - (score / 1000) * CIRCUMFERENCE;
        ringRef.current.style.strokeDashoffset = String(offset);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [score]);

  // ─── Derived display values ───────────────────────────────────────────────

  const tier = assessment?.tier ?? "A";
  const defaultProb = assessment?.default_prob ?? 0;
  const shapRows = assessment?.shap ? shapToRows(assessment.shap) : [];
  const loanOffers = assessment?.loan_offers ?? [];
  const topOffer = bestOffer(loanOffers);
  const credentialActive = assessment?.active ?? false;

  // ─── Stats row ────────────────────────────────────────────────────────────

  const stats = [
    {
      label: "Credit score",
      value: assessment ? String(assessment.score) : "—",
      delta: assessment
        ? assessmentSource === "cache"
          ? "loaded from history"
          : "from live assessment"
        : isCheckingCache
          ? "Checking history..."
          : isLoading
            ? "Running pipeline..."
            : "Connect wallet to score",
      deltaUp: assessment ? true : null,
      tone: "gold",
    },
    {
      label: "Risk tier",
      value: assessment ? tierToLabel(tier) : "—",
      delta: assessment ? `Credential ${credentialActive ? "active" : "inactive"}` : "—",
      deltaUp: credentialActive ? true : null,
      tone: tierTone(tier),
    },
    {
      label: "Max borrow",
      valueUsd: topOffer?.max_loan ?? 0,
      delta: `${loanOffers.length} active offer${loanOffers.length !== 1 ? "s" : ""}`,
      deltaUp: null,
      tone: "",
    },
    {
      label: "Default prob (30d)",
      value: assessment ? `${(defaultProb * 100).toFixed(1)}%` : "—",
      delta: assessment ? "from risk model" : "—",
      deltaUp: defaultProb < 0.05 ? true : null,
      tone: defaultProb < 0.05 ? "green" : "",
    },
  ];

  // ─── Score grid meta ──────────────────────────────────────────────────────

  const scoreGrid = [
    { label: "Tier",       value: assessment ? tierToLabel(tier) : "—",        tone: tierTone(tier) },
    { label: "Oracle sync", value: "Live",                                      tone: "" },
    { label: "Credential", value: credentialActive ? "Active" : "Inactive",    tone: credentialActive ? "green" : "" },
    { label: "Tx hash",    value: assessment?.tx_hash ? assessment.tx_hash.slice(0, 12) + "…" : "—", tone: "" },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

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
            <h1 className="dash-page-title">Aurum Dashboard</h1>
            <p className="dash-page-caption">
              Track your live credit score, agent pipeline health, current loan
              matches, and recent risk activity in one unified operating view.
            </p>
          </article>

          {/* ── Error banner ─────────────────────────────────────────────── */}
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

          {/* ── Stats row ────────────────────────────────────────────────── */}
          <div className="dash-stat-row">
            {stats.map((stat) => (
              <article key={stat.label} className="dash-stat-card aurora-border">
                <div className="dash-stat-label">{stat.label}</div>

                {typeof stat.valueUsd === "number" ? (
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
                    {isLoading || isCheckingCache ? <span className="dash-stat-loading">...</span> : stat.value}
                  </div>
                )}

                <div className={`dash-stat-delta${stat.deltaUp ? " is-up" : ""}`}>
                  {stat.delta}
                </div>
              </article>
            ))}
          </div>

          <div className="dash-content-grid">
            {/* ── Score ring panel ─────────────────────────────────────── */}
            <article className="dash-score-panel aurora-border">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Live confidence</span>
                <span className="dash-live-badge">
                  <span className="dash-pill-dot" />
                  {isCheckingCache
                    ? "Checking cache..."
                    : isLoading
                      ? "Scoring..."
                      : refreshWindow}
                </span>
              </div>

              <div className="dash-ring-wrap">
                <svg
                  className="dash-ring-svg"
                  viewBox="0 0 120 120"
                  role="img"
                  aria-label={`Credit score ring: ${score} out of 1000`}
                >
                  <circle className="dash-ring-bg" cx="60" cy="60" r="54" />
                  <circle
                    ref={ringRef}
                    className="dash-ring-fill"
                    cx="60"
                    cy="60"
                    r="54"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE}
                  />
                </svg>
                <div className="dash-ring-inner">
                  {isLoading || isCheckingCache ? (
                    <span className="dash-ring-loading">...</span>
                  ) : (
                    <>
                      <span className="dash-ring-number">{score || "—"}</span>
                      <span className="dash-ring-label">/ 1000</span>
                    </>
                  )}
                </div>
              </div>

              {/* Wallet connect prompt when not yet assessed */}
              {!connected && (
                <div className="dash-connect-prompt">
                  <button
                    type="button"
                    className="wallet-button primary"
                    onClick={toggleWallet}
                  >
                    Connect wallet to assess
                  </button>
                </div>
              )}

              {/* Reassess button when connected and idle/done */}
              {connected && address && !isLoading && (
                <div className="dash-reassess-row">
                  <button
                    type="button"
                    className="dash-reassess-btn"
                    onClick={() => void assess(address)}
                  >
                    Re-assess
                  </button>
                </div>
              )}

              <div className="dash-score-grid">
                {scoreGrid.map((cell) => (
                  <div key={cell.label} className="dash-score-grid-cell">
                    <div className="dash-score-grid-label">{cell.label}</div>
                    <div
                      className={`dash-score-grid-value${cell.tone ? ` ${cell.tone}` : ""}`}
                    >
                      {cell.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Score drivers from SHAP */}
              {shapRows.length > 0 && (
                <div className="dash-dimensions">
                  <div className="dash-dimensions-head">Score drivers</div>
                  {shapRows.map((dim) => (
                    <div key={dim.name} className="dash-dimension-row">
                      <div className="dash-dimension-header">
                        <span className="dash-dimension-name">{dim.name}</span>
                        <span className="dash-dimension-score">{dim.score}</span>
                      </div>
                      <div className="dash-dimension-track">
                        <div
                          className={`dash-dimension-fill${dim.tone === "green" ? " is-green" : ""}`}
                          style={{ width: barsAnimated ? `${dim.score}%` : "0%" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {advancedSignals && assessment && (
                <div className="dash-advanced-signals">
                  <div className="dash-dimensions-head">Advanced signals</div>
                  <div className="score-row">
                    <header>
                      <strong>Tx hash</strong>
                      <span className="agent-subtitle">{assessment.tx_hash}</span>
                    </header>
                  </div>
                  <div className="score-row">
                    <header>
                      <strong>Credential</strong>
                      <span className="agent-subtitle">
                        {assessment.active ? "Active — credential minted on Casper" : "Inactive"}
                      </span>
                    </header>
                  </div>
                </div>
              )}
            </article>

            {/* ── Right column ─────────────────────────────────────────── */}
            <div className="dash-right-col">
              {/* Agent pipeline (static status, always shown) */}
              <article className="dash-agents-panel aurora-border">
                <div className="dash-panel-head">
                  <span className="dash-panel-title">Agent pipeline</span>
                  <span className="dash-live-badge">
                    <span className="dash-pill-dot" />
                    {isLoading || isCheckingCache
                      ? isCheckingCache ? "Checking..." : "Running..."
                      : refreshWindow === "Live"
                      ? "5 running"
                      : `5 running • ${refreshWindow}`}
                  </span>
                </div>

                <div className="dash-agents-grid">
                  {AGENTS.map((agent) => (
                    <div key={agent.name} className="dash-agent-card">
                      <div className="dash-agent-card-top">
                        <span className="dash-agent-name">{agent.name}</span>
                        <span
                          className={`dash-agent-badge ${isLoading || isCheckingCache ? "running" : agent.status}`}
                        >
                          {isLoading || isCheckingCache ? "running" : agent.status}
                        </span>
                      </div>
                      <div className="dash-agent-meta">{agent.meta}</div>
                      <div className="dash-agent-bar">
                        <div
                          className={`dash-agent-bar-fill${agent.status === "standby" && !isLoading ? " is-gold" : ""}`}
                          style={{ width: `${agent.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <div className="dash-bottom-row">
                {/* Loan offers */}
                <article className="dash-loan-panel aurora-border">
                  <div className="dash-panel-head">
                    <span className="dash-panel-title">Loan offers</span>
                    <span className="dash-panel-hint gold">
                      {loanOffers.length} active
                    </span>
                  </div>

                  <div className="dash-offer-list">
                    {(isLoading || isCheckingCache) && (
                      <div className="dash-offer-placeholder">Matching offers…</div>
                    )}
                    {!isLoading && loanOffers.length === 0 && (
                      <div className="dash-offer-placeholder">
                        {connected ? "No offers available for your tier" : "Connect wallet to see offers"}
                      </div>
                    )}
                    {loanOffers.map((offer) => (
                      <Link
                        key={offer.protocol}
                        href="/loan-offers"
                        className="dash-offer-row"
                      >
                        <span className="dash-offer-protocol">{offer.protocol}</span>
                        <span className="dash-offer-amount">
                          {formatCurrencyWithEstimate(offer.max_loan, currency, false).primary}
                        </span>
                        <span className={`dash-offer-tier tier-${tier.toLowerCase()}`}>
                          Tier {tier}
                        </span>
                        <span className="dash-offer-rate">{offer.rate}</span>
                      </Link>
                    ))}
                  </div>
                </article>

                {/* Recent activity */}
                <article className="dash-activity-panel aurora-border">
                  <div className="dash-panel-head">
                    <span className="dash-panel-title">Recent activity</span>
                    <span className="dash-panel-hint">This session</span>
                  </div>

                  <div className="dash-activity-list">
                    {assessment && (
                      <>
                        <div className="dash-activity-item">
                          <div className="dash-activity-icon green" />
                          <div className="dash-activity-desc">
                            <div className="dash-activity-title">
                              {assessmentSource === "cache" ? "Score loaded" : "Score assessed"}
                            </div>
                            <div className="dash-activity-time">
                              {assessmentSource === "cache" ? "From oracle history" : "Just now"}
                            </div>
                          </div>
                          <span className="dash-activity-value green">{assessment.score}</span>
                        </div>
                        <div className="dash-activity-item">
                          <div className={`dash-activity-icon ${credentialActive ? "green" : ""}`} />
                          <div className="dash-activity-desc">
                            <div className="dash-activity-title">Credential</div>
                            <div className="dash-activity-time">Just now</div>
                          </div>
                          <span className={`dash-activity-value ${credentialActive ? "green" : ""}`}>
                            {credentialActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="dash-activity-item">
                          <div className="dash-activity-icon gold" />
                          <div className="dash-activity-desc">
                            <div className="dash-activity-title">Risk tier</div>
                            <div className="dash-activity-time">Just now</div>
                          </div>
                          <span className="dash-activity-value gold">{tierToLabel(tier)}</span>
                        </div>
                        <div className="dash-activity-item">
                          <div className="dash-activity-icon muted" />
                          <div className="dash-activity-desc">
                            <div className="dash-activity-title">Default prob (30d)</div>
                            <div className="dash-activity-time">Just now</div>
                          </div>
                          <span className="dash-activity-value muted">
                            {(defaultProb * 100).toFixed(1)}%
                          </span>
                        </div>
                      </>
                    )}
                    {!assessment && !isLoading && (
                      <div className="dash-activity-item">
                        <div className="dash-activity-desc">
                          <div className="dash-activity-title">No activity yet</div>
                          <div className="dash-activity-time">
                            {connected ? "Run an assessment to see results" : "Connect your wallet"}
                          </div>
                        </div>
                      </div>
                    )}
                    {isLoading && (
                      <div className="dash-activity-item">
                        <div className="dash-activity-desc">
                          <div className="dash-activity-title">
                            {isCheckingCache ? "Checking oracle history..." : "Pipeline running..."}
                          </div>
                          <div className="dash-activity-time">This may take 10-30s</div>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
