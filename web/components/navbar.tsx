"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "Loan Offers", href: "/loan-offers" },
  { label: "RWA Portfolio", href: "/portfolio" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname === "/dashboard") {
    return null;
  }

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="site-header__inner">
        <Link href="/" className="brand-mark" aria-label="Aurum home">
          <span className="brand-mark__coin">A</span>
          <span>
            <strong>Aurum</strong>
            <small>Agentic Credit Layer</small>
          </span>
        </Link>

        <div className="site-header__right">
          <nav className="site-nav" aria-label="Primary navigation">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="site-header__actions">
            <span className="site-network-pill">
              <span className="site-network-pill__dot" />
              Casper Testnet
            </span>
            <Link href="/dashboard" className="site-header__cta">
              Launch App
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
