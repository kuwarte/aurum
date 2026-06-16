"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWalletSession } from "@/lib/use-wallet-session";

export default function SettingsPage() {
  const { connected, toggleWallet, walletLabel } = useWalletSession();

  return (
    <main className="dash-shell">
      <div className="dash-layout">
        <DashboardSidebar
          connected={connected}
          walletLabel={walletLabel}
          onToggleWallet={toggleWallet}
        />

        <section className="dash-main settings-main">
          <article className="settings-hero aurora-border">
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">
              Manage the dashboard experience and switch between light and dark mode here.
            </p>
          </article>

          <div className="settings-grid">
            <article className="settings-card aurora-border">
              <div className="settings-card-head">
                <div>
                  <div className="dash-panel-title">Appearance</div>
                  <h2 className="settings-card-title">Theme mode</h2>
                </div>
                <ThemeToggle inline />
              </div>
              <p className="settings-card-copy">
                Toggle the Aurum interface theme. The transition animation still runs, but the
                control now lives in settings instead of floating over every page.
              </p>
            </article>

            <article className="settings-card aurora-border">
              <div className="dash-panel-title">Preferences</div>
              <h2 className="settings-card-title">Dashboard controls</h2>
              <div className="settings-list">
                <div className="settings-list-row">
                  <span>Top dashboard navbar</span>
                  <strong>Removed</strong>
                </div>
                <div className="settings-list-row">
                  <span>Theme toggle location</span>
                  <strong>Settings page</strong>
                </div>
                <div className="settings-list-row">
                  <span>Sidebar navigation</span>
                  <strong>Primary app nav</strong>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
