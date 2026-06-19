"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useWalletSession } from "@/lib/use-wallet-session";
import { fetchPaymentInfo, queryOracle } from "@/lib/api-client";
import { useAssessment } from "@/lib/use-assessment";

type DemoStep =
  | { status: "idle" }
  | { status: "fetching_requirement" }
  | { status: "requirement_ready"; requirement: Record<string, unknown> }
  | { status: "sending_proof"; requirement: Record<string, unknown> }
  | { status: "success"; requirement: Record<string, unknown>; profile: Record<string, unknown> }
  | { status: "payment_required"; requirement: Record<string, unknown>; error: string }
  | { status: "not_found"; requirement: Record<string, unknown> }
  | { status: "error"; message: string };

export default function OracleDemoPage() {
  const { connected, address, toggleWallet, walletLabel } = useWalletSession();
  const { assessment } = useAssessment();
  const [step, setStep] = useState<DemoStep>({ status: "idle" });

  // Step 1: Fetch payment requirement (what a protocol sees first — HTTP 402)
  async function handleFetchRequirement() {
    setStep({ status: "fetching_requirement" });
    try {
      const info = await fetchPaymentInfo();
      setStep({ status: "requirement_ready", requirement: info as unknown as Record<string, unknown> });
    } catch (err) {
      setStep({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to fetch payment requirement",
      });
    }
  }

  // Step 2: Construct mock proof and query the oracle
  async function handleQueryOracle() {
    if (step.status !== "requirement_ready") return;
    if (!address) return;

    const requirement = step.requirement;
    setStep({ status: "sending_proof", requirement });

    try {
      const result = await queryOracle(address, address);

      if (result.status === 200) {
        setStep({
          status: "success",
          requirement,
          profile: result.data as Record<string, unknown>,
        });
      } else if (result.status === 402) {
        setStep({
          status: "payment_required",
          requirement,
          error: JSON.stringify(result.data, null, 2),
        });
      } else if (result.status === 404) {
        setStep({ status: "not_found", requirement });
      }
    } catch (err) {
      setStep({
        status: "error",
        message: err instanceof Error ? err.message : "Oracle query failed",
      });
    }
  }

  function handleReset() {
    setStep({ status: "idle" });
  }

  const walletToQuery = address ?? "No wallet connected";

  return (
    <main className="dash-shell">
      <div className="dash-layout">
        <DashboardSidebar
          connected={connected}
          walletLabel={walletLabel}
          onToggleWallet={toggleWallet}
        />

        <section className="dash-main">
          <article className="dash-page-intro">
            <h1 className="dash-page-title">Oracle Demo</h1>
            <p className="dash-page-caption">
              Simulate how any DeFi lending protocol queries Aurum for a
              wallet's credit profile. The oracle is x402-gated — the protocol
              pays 1.5 CSPR, Aurum returns a verified score. No accounts, no
              human underwriters.
            </p>
          </article>

          {/* How it works */}
          <div className="dash-stat-row">
            {[
              { label: "Step 1", value: "402 Response", detail: "Protocol requests profile → Aurum returns payment requirement" },
              { label: "Step 2", value: "Pay 1.5 CSPR", detail: "Protocol sends x402 payment proof in header" },
              { label: "Step 3", value: "Credit Profile", detail: "Aurum verifies payment → returns verified score + offers" },
              { label: "Mode", value: "Mock x402", detail: "No real CSPR transferred in demo mode" },
            ].map((s) => (
              <article key={s.label} className="dash-stat-card aurora-border">
                <div className="dash-stat-label">{s.label}</div>
                <div className="dash-stat-value gold">{s.value}</div>
                <div className="dash-stat-delta">{s.detail}</div>
              </article>
            ))}
          </div>

          <div className="detail-grid">
            {/* Left: interactive flow */}
            <article className="data-card aurora-border">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Protocol simulation</span>
                <span className="dash-live-badge">
                  <span className="dash-pill-dot" />
                  x402 mock mode
                </span>
              </div>

              {/* Wallet being queried */}
              <div className="score-row" style={{ marginBottom: "1rem" }}>
                <strong>Wallet being queried</strong>
                <div
                  className="agent-subtitle"
                  style={{ wordBreak: "break-all", marginTop: "0.25rem" }}
                >
                  {walletToQuery}
                </div>
                {!connected && (
                  <button
                    type="button"
                    className="dash-reassess-btn"
                    style={{ marginTop: "0.5rem" }}
                    onClick={toggleWallet}
                  >
                    Connect wallet first
                  </button>
                )}
                {!assessment && connected && (
                  <div className="agent-subtitle" style={{ marginTop: "0.4rem", color: "var(--color-gold, #c6a435)" }}>
                    ⚠ Run an assessment from the dashboard first so the oracle has data to return.
                  </div>
                )}
              </div>

              {/* Step buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Step 1 */}
                <button
                  type="button"
                  className="wallet-button primary"
                  disabled={step.status !== "idle" || !connected}
                  onClick={handleFetchRequirement}
                >
                  {step.status === "fetching_requirement"
                    ? "Fetching payment requirement…"
                    : "Step 1 — Request credit profile (triggers 402)"}
                </button>

                {/* Step 2 */}
                <button
                  type="button"
                  className="wallet-button primary"
                  disabled={step.status !== "requirement_ready"}
                  onClick={handleQueryOracle}
                >
                  {step.status === "sending_proof"
                    ? "Sending payment proof…"
                    : "Step 2 — Pay 1.5 CSPR and query oracle"}
                </button>

                {/* Reset */}
                {step.status !== "idle" && step.status !== "fetching_requirement" && step.status !== "sending_proof" && (
                  <button
                    type="button"
                    className="dash-reassess-btn"
                    onClick={handleReset}
                  >
                    Reset demo
                  </button>
                )}
              </div>
            </article>

            {/* Right: response viewer */}
            <article className="data-card aurora-border">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Response viewer</span>
                <span
                  className={`mini-badge${
                    step.status === "success" ? " green" :
                    step.status === "payment_required" || step.status === "not_found" ? " gold" :
                    step.status === "error" ? "" : ""
                  }`}
                >
                  {step.status === "idle"            ? "Waiting"
                   : step.status === "fetching_requirement" ? "Fetching…"
                   : step.status === "requirement_ready"    ? "HTTP 402"
                   : step.status === "sending_proof"        ? "Sending…"
                   : step.status === "success"              ? "HTTP 200 ✓"
                   : step.status === "payment_required"     ? "HTTP 402"
                   : step.status === "not_found"            ? "HTTP 404"
                   : "Error"}
                </span>
              </div>

              {step.status === "idle" && (
                <p className="chart-note">
                  Click "Step 1" to begin the oracle demo. The protocol first
                  receives a 402 with payment requirements, then sends a proof
                  to unlock the credit profile.
                </p>
              )}

              {(step.status === "fetching_requirement" || step.status === "sending_proof") && (
                <p className="chart-note" style={{ animation: "aurum-pulse 1.2s ease-in-out infinite" }}>
                  {step.status === "fetching_requirement" ? "Calling /oracle/payment-info…" : "Sending x402 proof to /oracle/query…"}
                </p>
              )}

              {(step.status === "requirement_ready" || step.status === "sending_proof") && (
                <div>
                  <div className="dash-dimensions-head" style={{ marginBottom: "0.5rem" }}>
                    HTTP 402 — Payment Required
                  </div>
                  <p className="agent-subtitle" style={{ marginBottom: "0.75rem" }}>
                    A lending protocol sees this when it first calls the oracle without a payment proof. It must pay before getting the data.
                  </p>
                  <pre className="oracle-demo-json">
                    {JSON.stringify(step.requirement, null, 2)}
                  </pre>
                </div>
              )}

              {step.status === "success" && (
                <div>
                  <div className="dash-dimensions-head" style={{ marginBottom: "0.5rem", color: "var(--color-green, #30902b)" }}>
                    HTTP 200 — Credit Profile Returned
                  </div>
                  <p className="agent-subtitle" style={{ marginBottom: "0.75rem" }}>
                    Payment proof verified. The oracle returns the full verified credit profile.
                  </p>
                  <pre className="oracle-demo-json">
                    {JSON.stringify(step.profile, null, 2)}
                  </pre>
                </div>
              )}

              {step.status === "not_found" && (
                <div>
                  <div className="dash-dimensions-head" style={{ marginBottom: "0.5rem", color: "var(--color-gold, #c6a435)" }}>
                    HTTP 404 — No Assessment Found
                  </div>
                  <p className="agent-subtitle">
                    Payment was accepted but no assessment exists for this wallet yet. Go to the dashboard, run an assessment, then try again.
                  </p>
                </div>
              )}

              {step.status === "payment_required" && (
                <div>
                  <div className="dash-dimensions-head" style={{ marginBottom: "0.5rem" }}>
                    HTTP 402 — Proof Rejected
                  </div>
                  <pre className="oracle-demo-json">{step.error}</pre>
                </div>
              )}

              {step.status === "error" && (
                <div className="dash-error-banner">
                  {step.message}
                </div>
              )}
            </article>
          </div>

          {/* Explanation */}
          <article className="data-card aurora-border" style={{ marginTop: "1rem" }}>
            <div>
              <h2>How the x402 oracle works</h2>
              <p className="chart-note">
                Aurum is a credit bureau, not a lender. The oracle is the API
                that lending protocols use to query Aurum's data. The x402
                protocol enforces a per-query micropayment so Aurum earns
                revenue without subscriptions or accounts.
              </p>
            </div>
            <div className="score-bars" style={{ marginTop: "1rem" }}>
              <div className="score-row">
                <strong>Protocol calls GET /oracle/query?wallet=...</strong>
                <div className="agent-subtitle">No auth header → Aurum returns HTTP 402 with payment requirements</div>
              </div>
              <div className="score-row">
                <strong>Protocol sends X-402-Payment-Proof header</strong>
                <div className="agent-subtitle">JSON proof with payer, receiver, amount, nonce, deadline, signature</div>
              </div>
              <div className="score-row">
                <strong>Aurum verifies the proof</strong>
                <div className="agent-subtitle">In mock mode: structural check only. In live mode: on-chain CSPR transfer verification via CSPR.cloud</div>
              </div>
              <div className="score-row">
                <strong>Oracle returns credit profile</strong>
                <div className="agent-subtitle">Score, tier, SHAP values, loan offers, assessed_at — everything the protocol needs to underwrite</div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
