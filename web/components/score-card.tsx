import Link from "next/link";
import { scoreSnapshot } from "@/lib/aurum-data";

export function ScoreCard() {
  return (
    <article className="metric-card aurora-border">
      <span>Current Aurum score</span>
      <strong className="score-big">{scoreSnapshot.score}</strong>
      <div className="score-label">{scoreSnapshot.tier} confidence tier</div>
      <div className="score-trend">+{scoreSnapshot.delta} vs prior cycle</div>
      <div className="header-actions">
        <Link className="btn btn-secondary" href="/score-breakdown">
          Open SHAP breakdown
        </Link>
      </div>
    </article>
  );
}
