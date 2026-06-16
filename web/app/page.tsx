"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppPreferences } from "@/lib/app-preferences";
import { formatCurrencyAmount } from "@/lib/currency";
import { shapFactors } from "@/lib/aurum-data";

type LandingStat = {
  label: string;
  value?: string;
  valueUsd?: number;
};

const STATS: LandingStat[] = [
  { valueUsd: 2.7e12, label: "Global trade finance gap" },
  { value: "1.4B", label: "Unbanked adults on-chain" },
  { value: "6", label: "Autonomous scoring agents" },
  { value: "0", label: "Human underwriters" },
];

const PROBLEMS = [
  {
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Over-collateralization locks out the underbanked",
    desc: "Aave and Compound demand 150% collateral. Only the already-wealthy can borrow.",
  },
  {
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
    title: "Manual underwriting keeps failing at scale",
    desc: "Human credit review remains slow, expensive, and inconsistent for crypto-native lending.",
  },
  {
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46L5 12H3" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46L19 12h2" />
      </svg>
    ),
    title: "AI agents still have no trust primitive",
    desc: "Autonomous agents can transact, but there is still no portable way to evaluate creditworthiness.",
  },
];

const HOW_STEPS = [
  {
    num: "01",
    title: "Connect wallet",
    desc: "Link a Casper wallet and let Aurum read on-chain history without forms or manual review.",
  },
  {
    num: "02",
    title: "Agents assess",
    desc: "Specialized agents evaluate wallet activity, repayments, DeFi behavior, DAO participation, and RWA ownership.",
  },
  {
    num: "03",
    title: "Credential minted",
    desc: "The attestation layer signs a verified credit profile on Casper for portable reuse.",
  },
  {
    num: "04",
    title: "Protocols query",
    desc: "Lending protocols query the score and risk profile through a lightweight oracle call.",
  },
];

const AGENTS = [
  {
    title: "Credit Agent",
    badge: "running",
    desc: "Builds the composite score from wallet history, DeFi participation, and broader behavioral features.",
    meta: "XGBoost · SHAP · CSPR.cloud",
  },
  {
    title: "Risk Agent",
    badge: "running",
    desc: "Projects default probability across short and medium horizons for lender-facing risk tiers.",
    meta: "GBM · 30/60/90d horizon",
  },
  {
    title: "Fraud Agent",
    badge: "running",
    desc: "Detects sybil clusters, circular flows, and suspicious patterns designed to inflate trust.",
    meta: "Graph analysis · Sybil detection",
  },
  {
    title: "Attestation Agent",
    badge: "running",
    desc: "Aggregates the mesh output and signs the final credential for on-chain portability.",
    meta: "Ed25519 · Casper Testnet · IPFS",
  },
  {
    title: "Monitoring Agent",
    badge: "running",
    desc: "Continuously watches active credentials for behavioral change and lender protection triggers.",
    meta: "Real-time stream · CSPR.cloud",
  },
  {
    title: "Lending Agent",
    badge: "standby",
    desc: "Matches high-confidence borrowers to protocol offers and repayment-aware opportunities.",
    meta: "OraclePaywall · LangGraph · Casper MCP",
  },
];

const AGENT_DETAILS = [
  {
    stream: "Wallet history ingestion live",
    confidence: "98.4%",
    latency: "220ms",
    insight:
      "Repayment streaks, wallet tenure, and DeFi reuse are currently the strongest composite inputs.",
  },
  {
    stream: "Default horizon model recalibrating",
    confidence: "94.1%",
    latency: "410ms",
    insight:
      "Short-horizon risk remains healthy, while medium-horizon exposure is being discounted for utilization pressure.",
  },
  {
    stream: "Cluster graph sweep active",
    confidence: "96.8%",
    latency: "310ms",
    insight:
      "No sybil overlap detected in the latest pass. Transaction topology still looks organic.",
  },
  {
    stream: "Credential bundle ready to sign",
    confidence: "99.2%",
    latency: "180ms",
    insight:
      "The attestation payload is stable and ready for portable on-chain verification.",
  },
  {
    stream: "Behavior watch loop online",
    confidence: "97.5%",
    latency: "260ms",
    insight:
      "Monitoring is tracking utilization drift and oracle volatility for any downgrade triggers.",
  },
  {
    stream: "Offer matching on standby",
    confidence: "91.7%",
    latency: "530ms",
    insight:
      "The lending agent is holding until market conditions improve and a cleaner offer band opens.",
  },
];

const USE_CASES = [
  {
    tag: "SME Lending",
    title: "Invoice-backed credit for underserved businesses",
    desc: "Aurum translates on-chain cash flow and tokenized invoice quality into a lender-readable trust layer.",
    highlight: "No human underwriter",
    borrower: "Exporters and invoice-financed SMEs",
    signal: "Tokenized receivables and payment consistency",
    outcome: "Unlocks lower-friction working capital without legacy bureau coverage.",
  },
  {
    tag: "Freelancer Credit",
    title: "Financial identity built from on-chain work",
    desc: "Recurring client payments become verifiable income consistency instead of invisible wallet noise.",
    highlight: "Work becomes credit",
    borrower: "Global freelancers paid in stablecoins",
    signal: "Recurring client flows and cadence reliability",
    outcome: "Turns wallet history into a reusable credit passport for flexible cash advances.",
  },
  {
    tag: "AI Agent Commerce",
    title: "Machine-speed lending for autonomous agents",
    desc: "Trading and execution agents can request capital with score, fraud, and risk posture attached.",
    highlight: "Machine-speed approval",
    borrower: "Autonomous market and execution agents",
    signal: "Behavioral score, fraud screening, and live monitor state",
    outcome: "Makes programmatic capital access feel native instead of manually gated.",
  },
  {
    tag: "DAO Treasury",
    title: "Idle treasury capital deployed with assurance",
    desc: "DAOs can lend into scored credit markets without standing up a full underwriting team.",
    highlight: "DAO-native credit layer",
    borrower: "DAO treasuries and ecosystem funds",
    signal: "Portfolio quality, covenant monitoring, and reusable oracle queries",
    outcome: "Gives treasury managers a cleaner path to productive yield with better visibility.",
  },
];

const COMPARISON_ROWS = [
  { feature: "On-chain credit scoring", aurum: true, chainlink: false, goldfinch: false, fico: false },
  { feature: "Autonomous AI agents", aurum: true, chainlink: false, goldfinch: false, fico: false },
  { feature: "Continuous monitoring", aurum: true, chainlink: false, goldfinch: false, fico: false },
  { feature: "Pay-per-query oracle access", aurum: true, chainlink: false, goldfinch: false, fico: false },
  { feature: "Zero human underwriters", aurum: true, chainlink: null, goldfinch: false, fico: false },
  { feature: "Portable credential NFT", aurum: true, chainlink: false, goldfinch: false, fico: false },
  { feature: "Emerging market access", aurum: true, chainlink: null, goldfinch: true, fico: false },
  { feature: "AI agent identity scoring", aurum: true, chainlink: false, goldfinch: false, fico: false },
];

function Cell({ val }: { val: boolean | null }) {
  if (val === true) return <span className="landing-check">Yes</span>;
  if (val === null) return <span className="landing-cross">N/A</span>;
  return <span className="landing-cross">No</span>;
}

export default function Home() {
  const {
    preferences: { currency },
  } = useAppPreferences();
  const ringRef = useRef<SVGCircleElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [activeFactorIndex, setActiveFactorIndex] = useState(0);
  const [activeAgentIndex, setActiveAgentIndex] = useState(0);
  const [activeUseCaseIndex, setActiveUseCaseIndex] = useState(0);
  const maxShapImpact = Math.max(
    ...shapFactors.map((factor) => Math.abs(factor.impact)),
  );
  const activeFactor = shapFactors[activeFactorIndex] ?? shapFactors[0];
  const activeAgent = AGENTS[activeAgentIndex] ?? AGENTS[0];
  const activeAgentDetail = AGENT_DETAILS[activeAgentIndex] ?? AGENT_DETAILS[0];
  const activeUseCase = USE_CASES[activeUseCaseIndex] ?? USE_CASES[0];
  const signalScore = useMemo(
    () => 784 + activeFactor.impact,
    [activeFactor.impact],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = "60";
      }
    }, 300);

    const hero = heroRef.current;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!hero || mediaQuery.matches) {
      return () => window.clearTimeout(timer);
    }

    let frameId = 0;

    const updateParallax = (clientX: number, clientY: number) => {
      const rect = hero.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const offsetX = (clientX - centerX) / rect.width;
      const offsetY = (clientY - centerY) / rect.height;

      hero.style.setProperty("--hero-shift-x", `${offsetX * 24}px`);
      hero.style.setProperty("--hero-shift-y", `${offsetY * 18}px`);
      hero.style.setProperty("--hero-card-x", `${offsetX * 14}px`);
      hero.style.setProperty("--hero-card-y", `${offsetY * 10}px`);
      hero.style.setProperty("--hero-card-rotate-x", `${offsetY * -4}deg`);
      hero.style.setProperty("--hero-card-rotate-y", `${offsetX * 5}deg`);
    };

    const handlePointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        updateParallax(event.clientX, event.clientY);
      });
    };

    const resetParallax = () => {
      hero.style.setProperty("--hero-shift-x", "0px");
      hero.style.setProperty("--hero-shift-y", "0px");
      hero.style.setProperty("--hero-card-x", "0px");
      hero.style.setProperty("--hero-card-y", "0px");
      hero.style.setProperty("--hero-card-rotate-x", "0deg");
      hero.style.setProperty("--hero-card-rotate-y", "0deg");
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("blur", resetParallax);
    resetParallax();

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", resetParallax);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (mediaQuery.matches) {
      return undefined;
    }

    const revealables = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    revealables.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section ref={heroRef} className="landing-hero" data-reveal>
        <div className="landing-hero-bg">
          <div className="landing-grid-lines" />
          <div className="landing-orbit landing-orbit--one" />
          <div className="landing-orbit landing-orbit--two" />
        </div>

        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow">
              <span className="landing-status-dot" />
              Casper Agentic Buildathon 2026
            </div>

            <h1 className="landing-hero-headline">
              The autonomous credit bureau{" "}
              <span className="landing-hero-accent">for the machine economy.</span>
            </h1>

            <p className="landing-hero-sub">
              Six AI agents continuously score every wallet, agent, and DAO on
              Casper, producing a verifiable on-chain credit profile queryable by
              any protocol. No accounts. No human underwriters. No opacity.
            </p>

            <div className="landing-hero-actions">
              <Link href="/dashboard" className="landing-btn-primary">
                Explore dashboard
              </Link>
              <Link href="#score-breakdown" className="landing-btn-secondary">
                View score logic
              </Link>
            </div>

            <div className="landing-hero-tags">
              {[
                "Wallet-first onboarding",
                "Live agent status",
                "Oracle-backed scoring",
                "Light and dark mode",
              ].map((tag) => (
                <span key={tag} className="landing-mini-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="landing-score-card aurora-border">
            <div className="landing-score-card-header">
              <span className="landing-score-card-label">Live credit profile</span>
              <span className="landing-live-pill">
                <span className="landing-status-dot" />
                Live
              </span>
            </div>

            <div className="landing-score-ring">
              <svg className="landing-score-ring-svg" viewBox="0 0 140 140">
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#C6A435" />
                    <stop offset="100%" stopColor="#30902B" />
                  </linearGradient>
                </defs>
                <circle className="landing-score-ring-bg" cx="70" cy="70" r="65" />
                <circle
                  ref={ringRef}
                  className="landing-score-ring-fill"
                  cx="70"
                  cy="70"
                  r="65"
                  strokeDasharray="408"
                  strokeDashoffset="408"
                />
              </svg>
              <div className="landing-score-ring-inner">
                <span className="landing-score-number">784</span>
                <span className="landing-score-sub">/ 1000</span>
              </div>
            </div>

            <div className="landing-score-grid">
              <div className="landing-score-grid-cell">
                <span>Tier</span>
                <strong className="landing-gold">Tier A</strong>
              </div>
              <div className="landing-score-grid-cell">
                <span>Oracle sync</span>
                <strong>12s ago</strong>
              </div>
              <div className="landing-score-grid-cell">
                <span>Monitor health</span>
                <strong className="landing-green">Stable</strong>
              </div>
              <div className="landing-score-grid-cell">
                <span>Max offer</span>
                <strong>{formatCurrencyAmount(24000, currency)}</strong>
              </div>
            </div>

            <div className="landing-agent-strip">
              {[
                { name: "Credit Agent", status: "running" },
                { name: "Risk Agent", status: "running" },
                { name: "Monitoring Agent", status: "running" },
                { name: "Lending Agent", status: "standby" },
              ].map((agent) => (
                <div key={agent.name} className="landing-agent-row">
                  <span className="landing-agent-name">{agent.name}</span>
                  <span
                    className={`landing-agent-status landing-agent-status--${agent.status}`}
                  >
                    {agent.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="landing-stats-bar" data-reveal>
        <div className="landing-stats-bar-inner">
          {STATS.map((stat) => (
            <div key={stat.label} className="landing-stat-item">
              <div className="landing-stat-value">
                {typeof stat.valueUsd === "number"
                  ? formatCurrencyAmount(stat.valueUsd, currency, { compact: true })
                  : stat.value}
              </div>
              <div className="landing-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="landing-problem-section" data-reveal>
        <div className="landing-section-inner">
          <div className="landing-section-label">The problem</div>
          <h2 className="landing-section-headline">
            On-chain credit infrastructure is still broken for humans and agents.
          </h2>
          <p className="landing-section-sub">
            Traditional credit systems are opaque, geographically siloed, and not
            designed for autonomous on-chain actors. Aurum replaces them with an
            explainable, agentic alternative.
          </p>

          <div className="landing-problem-grid">
            {PROBLEMS.map((problem) => (
              <div key={problem.title} className="landing-problem-card" data-reveal>
                <div className="landing-problem-icon">{problem.icon}</div>
                <div className="landing-problem-title">{problem.title}</div>
                <div className="landing-problem-desc">{problem.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-how-section" data-reveal>
        <div className="landing-section-inner">
          <div className="landing-how-header">
            <div>
              <div className="landing-section-label">How it works</div>
              <h2 className="landing-section-headline">
                From wallet to verified credit profile in minutes.
              </h2>
            </div>
            <Link href="#score-breakdown" className="landing-btn-secondary">
              View full score logic
            </Link>
          </div>

          <div className="landing-how-steps">
            {HOW_STEPS.map((step) => (
              <div key={step.num} className="landing-how-step" data-reveal>
                <div className="landing-how-step-num">{step.num}</div>
                <div className="landing-how-step-title">{step.title}</div>
                <div className="landing-how-step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="score-breakdown" className="landing-breakdown-section" data-reveal>
        <div className="landing-section-inner">
          <div className="landing-breakdown-header">
            <div>
              <div className="landing-section-label">Score breakdown</div>
              <h2 className="landing-section-headline">
                Every score move is visible and attributable.
              </h2>
            </div>
            <p className="landing-section-sub landing-breakdown-sub">
              SHAP-style factor weights show which wallet and oracle signals
              pushed the score higher and which ones still hold it back.
            </p>
          </div>

          <div className="landing-breakdown-grid">
            <article className="landing-breakdown-card aurora-border">
              <div className="landing-breakdown-card-head">
                <span className="landing-mini-tag">Latest weights</span>
                <span className="landing-mini-tag">Explainable AI</span>
              </div>

              <div className="landing-breakdown-list">
                {shapFactors.map((factor, index) => (
                  <div
                    key={factor.label}
                    className={`landing-breakdown-row${factor.impact < 0 ? " negative" : ""}`}
                    onMouseEnter={() => setActiveFactorIndex(index)}
                    onFocus={() => setActiveFactorIndex(index)}
                    tabIndex={0}
                  >
                    <div className="landing-breakdown-labels">
                      <strong>{factor.label}</strong>
                      <span>{factor.reason}</span>
                    </div>
                    <div className="landing-breakdown-bar">
                      <div
                        className="landing-breakdown-fill"
                        style={{
                          width: `${(Math.abs(factor.impact) / maxShapImpact) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="landing-breakdown-value">
                      {factor.impact > 0 ? "+" : ""}
                      {factor.impact}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="landing-breakdown-card aurora-border">
              <div className="landing-breakdown-card-head">
                <span className="landing-mini-tag">Interpretation guide</span>
                <span className="landing-mini-tag">Live selected signal</span>
              </div>

              <div className="landing-breakdown-points">
                <div className="landing-breakdown-spotlight">
                  <div className="landing-breakdown-spotlight-head">
                    <span className="landing-breakdown-spotlight-label">Active factor</span>
                    <span
                      className={`landing-breakdown-delta${activeFactor.impact < 0 ? " negative" : ""}`}
                    >
                      {activeFactor.impact > 0 ? "+" : ""}
                      {activeFactor.impact}
                    </span>
                  </div>
                  <strong>{activeFactor.label}</strong>
                  <p>{activeFactor.reason}</p>
                  <div className="landing-breakdown-preview">
                    <span>Preview score if isolated</span>
                    <strong>{signalScore}</strong>
                  </div>
                </div>
                <div className="landing-breakdown-point">
                  <strong>Positive impact</strong>
                  <p>
                    Consistent repayments, portfolio diversity, and wallet age
                    increase lender confidence.
                  </p>
                </div>
                <div className="landing-breakdown-point">
                  <strong>Negative impact</strong>
                  <p>
                    Oracle stress and elevated utilization reduce confidence
                    until the monitor loop sees improvement.
                  </p>
                </div>
                <div className="landing-breakdown-point">
                  <strong>Why it matters</strong>
                  <p>
                    Aurum lets borrowers and lenders see the reasoning behind
                    credit decisions instead of trusting a black box.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="agents" className="landing-agents-section" data-reveal>
        <div className="landing-section-inner">
          <div className="landing-agents-header">
            <div className="landing-section-label">Agent architecture</div>
            <h2 className="landing-section-headline landing-section-headline--center">
              Six specialized agents. One trust layer.
            </h2>
          </div>

          <div className="landing-agents-grid">
            {AGENTS.map((agent, index) => (
              <button
                key={agent.title}
                type="button"
                className={`landing-agent-card${index === activeAgentIndex ? " is-active" : ""}`}
                onClick={() => setActiveAgentIndex(index)}
              >
                <span
                  className={`landing-agent-card-badge landing-agent-card-badge--${agent.badge}`}
                >
                  {agent.badge}
                </span>
                <div className="landing-agent-card-title">{agent.title}</div>
                <div className="landing-agent-card-desc">{agent.desc}</div>
                <div className="landing-agent-card-meta">{agent.meta}</div>
              </button>
            ))}
          </div>

          <div className="landing-agent-console aurora-border" data-reveal>
            <div className="landing-agent-console-header">
              <div>
                <div className="landing-section-label">Live agent console</div>
                <div className="landing-agent-console-title">{activeAgent.title}</div>
              </div>
              <span
                className={`landing-agent-card-badge landing-agent-card-badge--${activeAgent.badge}`}
              >
                {activeAgent.badge}
              </span>
            </div>
            <div className="landing-agent-console-grid">
              <div className="landing-agent-console-metric">
                <span>Stream</span>
                <strong>{activeAgentDetail.stream}</strong>
              </div>
              <div className="landing-agent-console-metric">
                <span>Confidence</span>
                <strong>{activeAgentDetail.confidence}</strong>
              </div>
              <div className="landing-agent-console-metric">
                <span>Latency</span>
                <strong>{activeAgentDetail.latency}</strong>
              </div>
              <div className="landing-agent-console-metric">
                <span>Signal</span>
                <strong>{activeAgentDetail.insight}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="use-cases" className="landing-use-cases-section" data-reveal>
        <div className="landing-section-inner">
          <div className="landing-section-label">Use cases</div>
          <h2 className="landing-section-headline">Who Aurum serves and how.</h2>

          <div className="landing-use-cases-grid">
            {USE_CASES.map((useCase, index) => (
              <button
                key={useCase.title}
                type="button"
                className={`landing-use-case-card${index === activeUseCaseIndex ? " is-active" : ""}`}
                onClick={() => setActiveUseCaseIndex(index)}
              >
                <span className="landing-use-case-tag">{useCase.tag}</span>
                <div className="landing-use-case-title">{useCase.title}</div>
                <div className="landing-use-case-desc">{useCase.desc}</div>
                <span className="landing-use-case-highlight">
                  {useCase.highlight}
                </span>
              </button>
            ))}
          </div>

          <div className="landing-use-case-spotlight aurora-border" data-reveal>
            <div className="landing-use-case-spotlight-header">
              <div>
                <div className="landing-section-label">Selected path</div>
                <div className="landing-use-case-spotlight-title">
                  {activeUseCase.title}
                </div>
              </div>
              <span className="landing-use-case-highlight">
                {activeUseCase.highlight}
              </span>
            </div>
            <div className="landing-use-case-spotlight-grid">
              <div className="landing-use-case-spotlight-item">
                <span>Borrower</span>
                <strong>{activeUseCase.borrower}</strong>
              </div>
              <div className="landing-use-case-spotlight-item">
                <span>Best signal</span>
                <strong>{activeUseCase.signal}</strong>
              </div>
              <div className="landing-use-case-spotlight-item landing-use-case-spotlight-item--wide">
                <span>What Aurum unlocks</span>
                <strong>{activeUseCase.outcome}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="competitive-landscape" className="landing-comp-section" data-reveal>
        <div className="landing-section-inner">
          <div className="landing-section-label">Competitive landscape</div>
          <h2 className="landing-section-headline">
            Nobody is doing all of this. That is the moat.
          </h2>

          <table className="landing-comp-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="landing-aurum-col">Aurum Protocol</th>
                <th>Chainlink</th>
                <th>Goldfinch</th>
                <th>FICO / Experian</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  <td className="landing-aurum-cell">
                    <Cell val={row.aurum} />
                  </td>
                  <td>
                    <Cell val={row.chainlink} />
                  </td>
                  <td>
                    <Cell val={row.goldfinch} />
                  </td>
                  <td>
                    <Cell val={row.fico} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="landing-cta-section" data-reveal>
        <div className="landing-cta-bg" />
        <div className="landing-cta-inner">
          <div className="landing-eyebrow landing-eyebrow--centered">
            <span className="landing-status-dot" />
            Live on Casper Testnet
          </div>
          <h2 className="landing-cta-headline">
            Start building with the credit layer the machine economy has been missing.
          </h2>
          <p className="landing-cta-sub">
            Connect a wallet, let Aurum assess on-chain history, and issue a
            verifiable credit credential for the Casper ecosystem.
          </p>
          <div className="landing-cta-actions">
            <Link href="/dashboard" className="landing-btn-primary">
              Launch dashboard
            </Link>
            <Link href="#score-breakdown" className="landing-btn-secondary">
              Read the score logic
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer" data-reveal>
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="brand-mark__coin">A</span>
            <div>
              <div className="landing-footer-brand-text">AURUM</div>
              <div className="landing-footer-brand-sub">PROTOCOL</div>
            </div>
          </div>

          <div className="landing-footer-links">
            {["Dashboard", "Agents", "Loan Offers", "RWA Portfolio"].map((label) => (
              <Link
                key={label}
                href={
                  label === "Dashboard"
                    ? "/dashboard"
                    : label === "Agents"
                      ? "/#agents"
                      : label === "Loan Offers"
                      ? "/loan-offers"
                      : label === "RWA Portfolio"
                        ? "/portfolio"
                        : "/#score-breakdown"
                }
                className="landing-footer-link"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="landing-footer-meta">
            Built for Casper Agentic Buildathon 2026 · Casper Testnet
          </div>
        </div>
      </footer>
    </>
  );
}
