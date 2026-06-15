import { Footer } from "@/components/footer";
import { loanOffers } from "@/lib/aurum-data";

export default function LoanOffersPage() {
  const featuredOffer =
    loanOffers.find((offer) => offer.featured) ?? loanOffers[0];

  return (
    <main className="subpage-shell">
      <section className="subpage-hero aurora-border">
        <div className="subpage-hero-copy">
          <h1 className="subpage-title">
            Curated offers shaped by live agent confidence.
          </h1>
          <p className="subpage-subtitle">
            Every offer is aligned to the current wallet score, collateral mix,
            and monitor posture so capital feels explainable instead of opaque.
          </p>
        </div>

        <div className="subpage-hero-panel aurora-border">
          <div className="subpage-panel-title">{featuredOffer.lender}</div>
          <p className="subpage-panel-text">{featuredOffer.summary}</p>

          <div className="subpage-metrics-grid">
            <div className="subpage-metric-tile">
              <span>APR </span>
              <strong>{featuredOffer.apr}</strong>
            </div>
            <div className="subpage-metric-tile">
              <span>Amount</span>
              <strong>{featuredOffer.amount}</strong>
            </div>
            <div className="subpage-metric-tile">
              <span>Tenor</span>
              <strong>{featuredOffer.tenor}</strong>
            </div>
            <div className="subpage-metric-tile">
              <span>Collateral</span>
              <strong>{featuredOffer.collateral}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="subpage-summary-grid">
        <article className="subpage-summary-card aurora-border">
          <h2>Offers reprice with score quality, not just collateral bulk.</h2>
          <p>
            Better repayment consistency and stronger RWA support compress APR,
            while monitor alerts widen protection bands.
          </p>
        </article>
        <article className="subpage-summary-card aurora-border">
          <h2>Each desk exposes a different lender personality.</h2>
          <p>
            Some pools prefer treasury stability, others lean into growth
            wallets and longer-tenor upside.
          </p>
        </article>
      </section>

      <section className="subpage-section">
        <div className="subpage-section-heading">
          <h2 className="landing-section-headline">
            A market view that matches the landing page tone.
          </h2>
        </div>

        <div className="offers-grid subpage-offers-grid">
          {loanOffers.map((offer) => (
            <article
              key={offer.lender}
              className={`offer-card subpage-offer-card aurora-border${offer.featured ? " featured" : ""}`}
            >
              <h2>{offer.lender}</h2>
              <p>{offer.summary}</p>

              <div className="offer-grid">
                <div>
                  <span className="offer-meta">APR: </span>
                  <strong>{offer.apr}</strong>
                </div>
                <div>
                  <span className="offer-meta">Tenor: </span>
                  <strong>{offer.tenor}</strong>
                </div>
                <div>
                  <span className="offer-meta">Amount: </span>
                  <strong>{offer.amount}</strong>
                </div>
                <div>
                  <span className="offer-meta">Collateral: </span>
                  <strong>{offer.collateral}</strong>
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
