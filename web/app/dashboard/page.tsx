import { AgentStatus } from "@/components/agent-status";
import { Footer } from "@/components/footer";
import { ScoreCard } from "@/components/score-card";
import { ScoreHistory } from "@/components/score-history";
import { scoreHistory, scoreSnapshot } from "@/lib/aurum-data";

export default function DashboardPage() {
  return (
    <main className="subpage-shell">
      <section className="subpage-hero aurora-border">
        <div className="subpage-hero-copy">
          <h1 className="subpage-title">Credit intelligence in one glance.</h1>
          <p className="subpage-subtitle">
            Score confidence, agent health, and underwriting momentum for the
            connected wallet, framed with the same visual language as the landing page.
          </p>
        </div>

        <div className="subpage-hero-panel aurora-border">
          <div className="subpage-panel-title">{scoreSnapshot.score}</div>
          <p className="subpage-panel-text">
            Wallet consistency, collateral quality, and a stable oracle window
            continue to support a healthy lending posture.
          </p>

          <div className="subpage-metrics-grid">
            <div className="subpage-metric-tile">
              <span>Tier</span>
              <strong>{scoreSnapshot.tier}</strong>
            </div>
            <div className="subpage-metric-tile">
              <span>Delta</span>
              <strong>+{scoreSnapshot.delta}</strong>
            </div>
            <div className="subpage-metric-tile">
              <span>Capacity</span>
              <strong>$24,000</strong>
            </div>
            <div className="subpage-metric-tile">
              <span>Freshness</span>
              <strong>12 sec</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="subpage-summary-grid">
        <article className="subpage-summary-card aurora-border">
          <h2>Agents agree the wallet still looks lender-friendly.</h2>
          <p>
            Repayment cadence, collateral diversity, and RWA support are still
            doing most of the work in the score profile.
          </p>
        </article>
        <article className="subpage-summary-card aurora-border">
          <h2>The latest assessment lifted confidence, not just score.</h2>
          <p>
            The delta is backed by healthier utilization, clean oracle freshness,
            and broad agent agreement rather than one noisy signal.
          </p>
        </article>
      </section>

      <section className="dashboard-grid subpage-dashboard-grid">
        <div className="metric-grid">
          <ScoreCard />
          <article className="metric-card aurora-border">
            <span>Borrowing capacity</span>
            <strong>$24,000</strong>
            <div className="score-trend">+8.4% after latest assessment</div>
          </article>
          <article className="metric-card aurora-border">
            <span>Repayment likelihood</span>
            <strong>91.2%</strong>
            <p className="chart-note">
              Wallet consistency and collateral quality remain the strongest
              positive drivers.
            </p>
          </article>
          <article className="metric-card aurora-border">
            <span>Oracle freshness</span>
            <strong>12 seconds</strong>
            <p className="chart-note">
              Market and collateral feeds are within the target freshness window.
            </p>
          </article>
        </div>

        <AgentStatus />
      </section>

      <section className="detail-grid subpage-detail-grid">
        <ScoreHistory history={scoreHistory} />

        <article className="data-card aurora-border">
          <div>
            <h2>{scoreSnapshot.tier} profile</h2>
            <p className="chart-note">
              This wallet is showing healthy activity cadence, a stable collateral
              mix, and low oracle stress against current exposure.
            </p>
          </div>
          <div className="mini-metrics">
            <div>
              <span>Wallet age</span>
              <strong>29 mo</strong>
            </div>
            <div>
              <span>RWA exposure</span>
              <strong>38%</strong>
            </div>
            <div>
              <span>Agent consensus</span>
              <strong>94%</strong>
            </div>
            <div>
              <span>Last monitor</span>
              <strong>2 min</strong>
            </div>
          </div>
        </article>
      </section>

      <Footer />
    </main>
  );
}
