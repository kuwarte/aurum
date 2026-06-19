"use client";

import { useEffect, useState } from "react";
import { fetchHealth, type HealthResponse } from "@/lib/api-client";
import { useAssessment } from "@/lib/use-assessment";

// The 6 pipeline agents — status derives from live pipeline state
const PIPELINE_AGENTS = [
  { name: "Credit Agent",      summary: "XGBoost scoring — wallet behavior and repayment history" },
  { name: "Risk Agent",        summary: "GBM default probability — 30/60/90d horizons" },
  { name: "Fraud Agent",       summary: "Graph analysis — sybil detection and wash trading" },
  { name: "Attestation Agent", summary: "Ed25519 credential signing — Casper Testnet" },
  { name: "Monitoring Agent",  summary: "CSPR.cloud polling — credential surveillance" },
  { name: "Lending Agent",     summary: "Offer matching — x402 gated lending pools" },
];

export function AgentStatus() {
  const { assessment, isLoading } = useAssessment();
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => null);
  }, []);

  // Derive per-agent confidence from live sub_scores where possible
  const agentConfidences: number[] = assessment
    ? [
        assessment.sub_scores?.repayment    ?? 70,
        assessment.sub_scores?.wallet_activity ?? 60,
        100 - (assessment.fraud_score ?? 0) * 100,
        assessment.active ? 100 : 30,
        assessment.monitoring_action === "maintain" ? 88 : 50,
        assessment.loan_offers.length > 0 ? 90 : 40,
      ]
    : [70, 60, 80, 50, 55, 30];

  const agentStates: string[] = assessment
    ? [
        "Active",
        "Active",
        (assessment.fraud_score ?? 0) > 0.3 ? "Flagged" : "Clear",
        assessment.active ? "Signed" : "Pending",
        assessment.monitoring_action === "maintain" ? "Healthy" : "Alert",
        assessment.loan_offers.length > 0 ? "Matched" : "Standby",
      ]
    : ["Idle", "Idle", "Idle", "Idle", "Idle", "Standby"];

  return (
    <article className="data-card aurora-border">
      <div>
        <h2>Pipeline agents</h2>
        <p className="chart-note">
          {health
            ? `Backend ${health.status} — ${health.mode}`
            : "Connecting to backend…"}
        </p>
      </div>

      <div className="agent-list">
        {PIPELINE_AGENTS.map((agent, i) => (
          <div key={agent.name} className="agent-row">
            <div className="agent-header">
              <div>
                <div className="agent-name">{agent.name}</div>
                <div className="agent-subtitle">{agent.summary}</div>
              </div>
              <span className="mini-badge">
                {isLoading ? "running" : agentStates[i]}
              </span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${agentConfidences[i]}%` }}
              />
            </div>
            <div className="agent-subtitle">
              Confidence {Math.round(agentConfidences[i])}%
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
