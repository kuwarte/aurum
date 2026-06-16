"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useAppPreferences } from "@/lib/app-preferences";
import {
  formatCurrencyWithEstimate,
} from "@/lib/currency";
import { useWalletSession } from "@/lib/use-wallet-session";

type DashboardStat = {
  label: string;
  value?: string;
  valueUsd?: number;
  delta: string;
  deltaUp: boolean | null;
  tone: string;
};

const STATS: DashboardStat[] = [
  {
    label: "Credit score",
    value: "784",
    delta: "+12 this week",
    deltaUp: true,
    tone: "gold",
  },
  {
    label: "Risk tier",
    value: "Tier A",
    delta: "Top 8% of wallets",
    deltaUp: true,
    tone: "green",
  },
  {
    label: "Max borrow",
    valueUsd: 24000,
    delta: "3 active offers",
    deltaUp: null,
    tone: "",
  },
  {
    label: "Default prob (30d)",
    value: "1.2%",
    delta: "-0.4% vs last",
    deltaUp: true,
    tone: "green",
  },
];

const SCORE_GRID = [
  { label: "Tier", value: "Tier A", tone: "gold" },
  { label: "Oracle sync", value: "12s ago", tone: "" },
  { label: "Credential", value: "Active", tone: "green" },
  { label: "Expires", value: "87 days", tone: "" },
];

const DIMENSIONS = [
  { name: "Wallet activity", score: 91, tone: "green" },
  { name: "Repayment history", score: 88, tone: "green" },
  { name: "DeFi behavior", score: 76, tone: "gold" },
  { name: "DAO participation", score: 82, tone: "green" },
  { name: "RWA ownership", score: 68, tone: "gold" },
  { name: "Income consistency", score: 85, tone: "green" },
];

const AGENTS = [
  { name: "Credit Agent", status: "running", meta: "XGBoost - SHAP - 24h cycle", pct: 82 },
  { name: "Risk Agent", status: "running", meta: "GBM - 30/60/90d horizon", pct: 67 },
  { name: "Fraud Agent", status: "running", meta: "Graph analysis - Sybil detection", pct: 91 },
  { name: "Attestation Agent", status: "running", meta: "Ed25519 - IPFS - Casper", pct: 100 },
  { name: "Monitoring Agent", status: "running", meta: "15 min heartbeat - CSPR.cloud", pct: 55 },
  { name: "Lending Agent", status: "standby", meta: "x402 - LangGraph - Casper MCP", pct: 22 },
];

const LOANS = [
  { protocol: "TrueFi", amountUsd: 24000, tier: "A", apr: "9.8% APR" },
  { protocol: "Maple", amountUsd: 18500, tier: "A", apr: "11.2% APR" },
  { protocol: "Clearpool", amountUsd: 12000, tier: "B", apr: "13.5% APR" },
];

const ACTIVITY = [
  { title: "Score updated", time: "2 hours ago", value: "+12", tone: "green" },
  { title: "Oracle queried", time: "5 hours ago", value: "0.05 CSPR", tone: "gold" },
  { title: "Credential renewed", time: "1 day ago", value: "Yes", tone: "green" },
  { title: "Risk assessed", time: "1 day ago", value: "1.2%", tone: "muted" },
];

const SCORE = 784;
const CIRCUMFERENCE = 2 * Math.PI * 54;

export default function DashboardPage() {
  const { connected, toggleWallet, walletLabel } = useWalletSession();
  const {
    preferences: { advancedSignals, currency, refreshWindow, showFiatEstimate },
  } = useAppPreferences();
  const [barsAnimated, setBarsAnimated] = useState(false);
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBarsAnimated(true);
      if (ringRef.current) {
        const offset = CIRCUMFERENCE - (SCORE / 1000) * CIRCUMFERENCE;
        ringRef.current.style.strokeDashoffset = String(offset);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, []);

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
              Track your live credit score, agent pipeline health, current loan matches, and recent
              risk activity in one unified operating view.
            </p>
          </article>

          <div className="dash-stat-row">
            {STATS.map((stat) => (
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
                  <div className={`dash-stat-value${stat.tone ? ` ${stat.tone}` : ""}`}>
                    {stat.value}
                  </div>
                )}
                <div className={`dash-stat-delta${stat.deltaUp ? " is-up" : ""}`}>
                  {stat.delta}
                </div>
              </article>
            ))}
          </div>

          <div className="dash-content-grid">
            <article className="dash-score-panel aurora-border">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Live confidence</span>
                <span className="dash-live-badge">
                  <span className="dash-pill-dot" />
                  {refreshWindow}
                </span>
              </div>

              <div className="dash-ring-wrap">
                <svg
                  className="dash-ring-svg"
                  viewBox="0 0 120 120"
                  role="img"
                  aria-label={`Credit score ring: ${SCORE} out of 1000`}
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
                  <span className="dash-ring-number">{SCORE}</span>
                  <span className="dash-ring-label">/ 1000</span>
                </div>
              </div>

              <div className="dash-score-grid">
                {SCORE_GRID.map((cell) => (
                  <div key={cell.label} className="dash-score-grid-cell">
                    <div className="dash-score-grid-label">{cell.label}</div>
                    <div className={`dash-score-grid-value${cell.tone ? ` ${cell.tone}` : ""}`}>
                      {cell.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="dash-dimensions">
                <div className="dash-dimensions-head">Score drivers</div>
                {DIMENSIONS.map((dimension) => (
                  <div key={dimension.name} className="dash-dimension-row">
                    <div className="dash-dimension-header">
                      <span className="dash-dimension-name">{dimension.name}</span>
                      <span className="dash-dimension-score">{dimension.score}</span>
                    </div>
                    <div className="dash-dimension-track">
                      <div
                        className={`dash-dimension-fill${dimension.tone === "green" ? " is-green" : ""}`}
                        style={{ width: barsAnimated ? `${dimension.score}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {advancedSignals ? (
                <div className="dash-advanced-signals">
                  <div className="dash-dimensions-head">Advanced signals</div>
                  <div className="score-row">
                    <header>
                      <strong>Model blend</strong>
                      <span className="agent-subtitle">Behavior 64% • Risk 22% • Collateral 14%</span>
                    </header>
                  </div>
                  <div className="score-row">
                    <header>
                      <strong>Monitor confidence</strong>
                      <span className="agent-subtitle">0.94 ensemble agreement across active agents</span>
                    </header>
                  </div>
                </div>
              ) : null}
            </article>

            <div className="dash-right-col">
              <article className="dash-agents-panel aurora-border">
                <div className="dash-panel-head">
                  <span className="dash-panel-title">Agent pipeline</span>
                  <span className="dash-live-badge">
                    <span className="dash-pill-dot" />
                    {refreshWindow === "Live" ? "5 running" : `5 running • ${refreshWindow}`}
                  </span>
                </div>

                <div className="dash-agents-grid">
                  {AGENTS.map((agent) => (
                    <div key={agent.name} className="dash-agent-card">
                      <div className="dash-agent-card-top">
                        <span className="dash-agent-name">{agent.name}</span>
                        <span className={`dash-agent-badge ${agent.status}`}>
                          {agent.status}
                        </span>
                      </div>
                      <div className="dash-agent-meta">{agent.meta}</div>
                      <div className="dash-agent-bar">
                        <div
                          className={`dash-agent-bar-fill${agent.status === "standby" ? " is-gold" : ""}`}
                          style={{ width: `${agent.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <div className="dash-bottom-row">
                <article className="dash-loan-panel aurora-border">
                  <div className="dash-panel-head">
                    <span className="dash-panel-title">Loan offers</span>
                    <span className="dash-panel-hint gold">3 active</span>
                  </div>

                  <div className="dash-offer-list">
                    {LOANS.map((loan) => (
                      <Link
                        key={loan.protocol}
                        href="/loan-offers"
                        className="dash-offer-row"
                      >
                        <span className="dash-offer-protocol">{loan.protocol}</span>
                        <span className="dash-offer-amount">
                          {formatCurrencyWithEstimate(loan.amountUsd, currency, false).primary}
                        </span>
                        <span className={`dash-offer-tier tier-${loan.tier.toLowerCase()}`}>
                          Tier {loan.tier}
                        </span>
                        <span className="dash-offer-rate">{loan.apr}</span>
                      </Link>
                    ))}
                  </div>
                </article>

                <article className="dash-activity-panel aurora-border">
                  <div className="dash-panel-head">
                    <span className="dash-panel-title">Recent activity</span>
                    <span className="dash-panel-hint">Last 24h</span>
                  </div>

                  <div className="dash-activity-list">
                    {ACTIVITY.map((item) => (
                      <div key={item.title} className="dash-activity-item">
                        <div className={`dash-activity-icon ${item.tone}`} />
                        <div className="dash-activity-desc">
                          <div className="dash-activity-title">{item.title}</div>
                          <div className="dash-activity-time">{item.time}</div>
                        </div>
                        <span className={`dash-activity-value ${item.tone}`}>{item.value}</span>
                      </div>
                    ))}
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
