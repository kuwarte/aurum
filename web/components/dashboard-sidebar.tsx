"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href?: string;
  badge?: string;
};

type NavGroup = {
  group: string;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Score Logic", href: "/score-breakdown" },
      { label: "Agents", href: "/agents", badge: "6" },
    ],
  },
  {
    group: "Finance",
    items: [
      { label: "RWA Portfolio", href: "/portfolio" },
      { label: "Loan Offers", href: "/loan-offers" },
      { label: "Lending Demo", href: "/lending-demo" },
      { label: "History", href: "/history" },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Oracle Demo", href: "/oracle-demo", badge: "x402" },
      { label: "Compliance", href: "/compliance" },
      { label: "Settings", href: "/settings" },
    ],
  },
];

type DashboardSidebarProps = {
  connected: boolean;
  walletLabel: string;
  onToggleWallet: () => void;
};

export function DashboardSidebar({
  connected,
  walletLabel,
  onToggleWallet,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="dash-sidebar aurora-border">
      <Link href="/" className="dash-sidebar-brand" aria-label="Aurum home">
        <span className="brand-mark__coin">A</span>
        <span>
          <strong>Aurum</strong>
          <small>Agentic Credit Layer</small>
        </span>
      </Link>

      {NAV.map((group) => (
        <div key={group.group} className="dash-nav-group">
          <div className="dash-nav-label">{group.group}</div>
          {group.items.map((item) => {
            const active = item.href ? pathname === item.href : false;

            if (!item.href) {
              return (
                <div key={`${group.group}-${item.label}`} className="dash-nav-item">
                  <span>{item.label}</span>
                  {item.badge ? <span className="dash-nav-badge">{item.badge}</span> : null}
                </div>
              );
            }

            return (
              <Link
                key={`${group.group}-${item.label}`}
                href={item.href}
                className={`dash-nav-item${active ? " is-active" : ""}`}
              >
                <span>{item.label}</span>
                {item.badge ? <span className="dash-nav-badge">{item.badge}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="dash-sidebar-bottom">
        <div className="dash-wallet-status">
          <div className="dash-wallet-status-label">Wallet</div>
          <div className="dash-wallet-status-row">
            <span className={`dash-pill-dot${connected ? "" : " is-off"}`} />
            <span>{walletLabel}</span>
          </div>
          <button type="button" className="dash-wallet-status-btn" onClick={onToggleWallet}>
            {connected ? "Disconnect wallet" : "Connect wallet"}
          </button>
        </div>
      </div>
    </aside>
  );
}
