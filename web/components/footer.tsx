import Link from "next/link";

export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          <span className="brand-mark__coin">A</span>
          <div>
            <div className="landing-footer-brand-text">AURUM</div>
            <div className="landing-footer-brand-sub">PROTOCOL</div>
          </div>
        </div>

        <div className="landing-footer-links">
          <Link href="/" className="landing-footer-link">
            Home
          </Link>
          <Link href="/dashboard" className="landing-footer-link">
            Dashboard
          </Link>
          <Link href="/loan-offers" className="landing-footer-link">
            Loan Offers
          </Link>
          <Link href="/portfolio" className="landing-footer-link">
            RWA Portfolio
          </Link>
        </div>

        <div className="landing-footer-meta">
          Built for Casper Agentic Buildathon 2026 - Casper Testnet
        </div>
      </div>
    </footer>
  );
}
