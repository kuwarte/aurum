import { Footer } from "@/components/footer";
import { portfolioAllocations, portfolioHoldings } from "@/lib/aurum-data";

export default function PortfolioPage() {
  return (
    <main className="subpage-shell">
      <section className="subpage-hero aurora-border">
        <div className="subpage-hero-copy">
          <h1 className="subpage-title">Collateral context beyond token balances.</h1>
          <p className="subpage-subtitle">
            A landing-style view of tokenized real-world assets that reinforce
            wallet quality, downside resilience, and lender confidence.
          </p>
        </div>

        <div className="subpage-hero-panel aurora-border">
          <div className="subpage-panel-title">$118,400</div>
          <p className="subpage-panel-text">
            Tokenized treasury, invoice, and commodity exposure gives the model a
            stronger view of non-speculative backing.
          </p>

          <div className="subpage-metrics-grid">
            <div className="subpage-metric-tile">
              <span>Yield avg</span>
              <strong>7.8%</strong>
            </div>
            <div className="subpage-metric-tile">
              <span>Volatility</span>
              <strong>Low</strong>
            </div>
            <div className="subpage-metric-tile">
              <span>Liquidity</span>
              <strong>48h</strong>
            </div>
            <div className="subpage-metric-tile">
              <span>Coverage</span>
              <strong>1.9x</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="portfolio-overview subpage-portfolio-overview">
        <article className="portfolio-card subpage-portfolio-card aurora-border">
          <h2>RWA concentration</h2>
          <div className="holdings-list">
            {portfolioAllocations.map((allocation) => (
              <div key={allocation.label} className="allocation-row">
                <div className="allocation-meta">
                  <span>{allocation.label}</span>
                  <strong>{allocation.value}%</strong>
                </div>
                <div className="allocation-track">
                  <div
                    className="allocation-fill"
                    style={{ width: `${allocation.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="portfolio-card subpage-portfolio-card aurora-border">
          <h2>Real assets make the score feel grounded.</h2>
          <p>
            Tokenized treasury, invoice, and commodity exposure gives the model a
            stronger view of non-speculative backing.
          </p>
          <div className="mini-metrics">
            <div>
              <span>Yield avg: </span>
              <strong>7.8%</strong>
            </div>
            <div>
              <span>Volatility: </span>
              <strong>Low</strong>
            </div>
            <div>
              <span>Liquidity window: </span>
              <strong>48h</strong>
            </div>
            <div>
              <span>Coverage ratio: </span>
              <strong>1.9x</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="subpage-section">
        <div className="subpage-section-heading">
          <h2 className="landing-section-headline">Assets that support a stronger borrowing posture.</h2>
        </div>

        <div className="portfolio-grid subpage-portfolio-grid">
        {portfolioHoldings.map((holding) => (
          <article
            key={holding.name}
            className="portfolio-card subpage-portfolio-card aurora-border"
          >
            <h2>{holding.name}</h2>
            <p>{holding.summary}</p>
            <div className="mini-metrics">
              <div>
                <span className="portfolio-meta">Value: </span>
                <strong>{holding.value}</strong>
              </div>
              <div>
                <span className="portfolio-meta">Yield: </span>
                <strong>{holding.yield}</strong>
              </div>
            </div>
          </article>
        ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
