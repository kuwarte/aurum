"use client";

import Link from "next/link";
import { useAssessment } from "@/lib/use-assessment";

export function ScoreCard() {
  const { assessment, isLoading } = useAssessment();

  const score = assessment?.score ?? "—";
  const tier  = assessment?.tier  ?? "—";

  // Delta vs prior: use score history from oracle if available, else omit
  const showDelta = false; // oracle history is single-entry; no meaningful delta yet

  return (
    <article className="metric-card aurora-border">
      <span>Current Aurum score</span>
      <strong className="score-big">
        {isLoading ? <span style={{ opacity: 0.4 }}>…</span> : score}
      </strong>
      <div className="score-label">
        {assessment ? `Tier ${tier} • ${assessment.compliance_level || "standard"} compliance` : "Connect wallet to score"}
      </div>
      {assessment && !showDelta && (
        <div className="score-trend">
          {assessment.active ? "✓ Credential active" : "⚠ Credential inactive"}
        </div>
      )}
      <div className="header-actions">
        <Link className="btn btn-secondary" href="/score-breakdown">
          Open SHAP breakdown
        </Link>
      </div>
    </article>
  );
}
