import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/loan-offers", label: "Loan Offers" },
  { href: "/portfolio", label: "RWA Portfolio" },
];

export function Navbar() {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark" aria-label="Aurum home">
        <span className="brand-mark__coin">A</span>
        <span>
          <strong>Aurum</strong>
          <small>Agentic Credit Layer</small>
        </span>
      </Link>

      <nav className="site-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
