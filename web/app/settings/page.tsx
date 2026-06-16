"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  resolveDefaultViewHref,
  useAppPreferences,
} from "@/lib/app-preferences";
import { useWalletSession } from "@/lib/use-wallet-session";

const CURRENCIES = ["USD", "USDC", "CSPR", "EUR", "PHP"] as const;
const REFRESH_OPTIONS = ["Live", "15 sec", "1 min", "5 min"] as const;
const LANDING_OPTIONS = ["Dashboard", "Loan Offers", "RWA Portfolio", "Score Logic"] as const;

export default function SettingsPage() {
  const { connected, toggleWallet, walletLabel } = useWalletSession();
  const { preferences, setPreference } = useAppPreferences();
  const {
    currency,
    refreshWindow,
    defaultView,
    compactCards,
    riskAlerts,
    weeklyDigest,
    showFiatEstimate,
    advancedSignals,
  } = preferences;

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
              <h2 className="settings-card-title">Display defaults</h2>
              <p className="settings-card-copy">
                Choose how balances, refresh timing, and the app opening view should feel day to day.
              </p>
              <div className="settings-form">
                <label className="settings-field">
                  <span className="settings-field-label">Preferred currency</span>
                  <span className="settings-select-wrap">
                    <select
                      value={currency}
                      onChange={(event) => setPreference("currency", event.target.value as (typeof CURRENCIES)[number])}
                    >
                      {CURRENCIES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>

                <label className="settings-field">
                  <span className="settings-field-label">Refresh cadence</span>
                  <span className="settings-select-wrap">
                    <select
                      value={refreshWindow}
                      onChange={(event) => setPreference("refreshWindow", event.target.value as (typeof REFRESH_OPTIONS)[number])}
                    >
                      {REFRESH_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>

                <label className="settings-field">
                  <span className="settings-field-label">Default app view</span>
                  <span className="settings-select-wrap">
                    <select
                      value={defaultView}
                      onChange={(event) => setPreference("defaultView", event.target.value as (typeof LANDING_OPTIONS)[number])}
                    >
                      {LANDING_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
              </div>
            </article>

            <article className="settings-card aurora-border">
              <div className="dash-panel-title">Controls</div>
              <h2 className="settings-card-title">Dashboard behavior</h2>
              <div className="settings-list">
                <div className="settings-list-row">
                  <div>
                    <span>Compact dashboard cards</span>
                    <small>Reduce padding for denser monitoring views.</small>
                  </div>
                  <button
                    type="button"
                    className={`settings-switch${compactCards ? " is-active" : ""}`}
                    onClick={() => setPreference("compactCards", !compactCards)}
                    aria-pressed={compactCards}
                  >
                    <span />
                  </button>
                </div>
                <div className="settings-list-row">
                  <div>
                    <span>Show fiat estimate overlays</span>
                    <small>Display rough converted values beside credit metrics.</small>
                  </div>
                  <button
                    type="button"
                    className={`settings-switch${showFiatEstimate ? " is-active" : ""}`}
                    onClick={() => setPreference("showFiatEstimate", !showFiatEstimate)}
                    aria-pressed={showFiatEstimate}
                  >
                    <span />
                  </button>
                </div>
                <div className="settings-list-row">
                  <div>
                    <span>Expose advanced signals</span>
                    <small>Surface more model detail in risk and score pages.</small>
                  </div>
                  <button
                    type="button"
                    className={`settings-switch${advancedSignals ? " is-active" : ""}`}
                    onClick={() => setPreference("advancedSignals", !advancedSignals)}
                    aria-pressed={advancedSignals}
                  >
                    <span />
                  </button>
                </div>
              </div>
            </article>

            <article className="settings-card aurora-border">
              <div className="dash-panel-title">Alerts</div>
              <h2 className="settings-card-title">Notification preferences</h2>
              <div className="settings-list">
                <div className="settings-list-row">
                  <div>
                    <span>Risk alert notifications</span>
                    <small>Get notified when score posture or collateral quality slips.</small>
                  </div>
                  <button
                    type="button"
                    className={`settings-switch${riskAlerts ? " is-active" : ""}`}
                    onClick={() => setPreference("riskAlerts", !riskAlerts)}
                    aria-pressed={riskAlerts}
                  >
                    <span />
                  </button>
                </div>
                <div className="settings-list-row">
                  <div>
                    <span>Weekly digest</span>
                    <small>Receive a rollup of score moves, offers, and monitoring health.</small>
                  </div>
                  <button
                    type="button"
                    className={`settings-switch${weeklyDigest ? " is-active" : ""}`}
                    onClick={() => setPreference("weeklyDigest", !weeklyDigest)}
                    aria-pressed={weeklyDigest}
                  >
                    <span />
                  </button>
                </div>
              </div>
            </article>

            <article className="settings-card aurora-border">
              <div className="dash-panel-title">Profile</div>
              <h2 className="settings-card-title">Current workspace</h2>
              <div className="settings-list">
                <div className="settings-list-row">
                  <span>Connected wallet</span>
                  <strong>{walletLabel}</strong>
                </div>
                <div className="settings-list-row">
                  <span>Theme control location</span>
                  <strong>Settings page</strong>
                </div>
                <div className="settings-list-row">
                  <span>Primary app navigation</span>
                  <strong>Sidebar</strong>
                </div>
                <div className="settings-list-row">
                  <span>Launch app target</span>
                  <strong>{resolveDefaultViewHref(defaultView)}</strong>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
