type ShapFactor = {
  label: string;
  impact: number;
  reason: string;
};

export function ShapBreakdown({ factors }: { factors: ShapFactor[] }) {
  const maxImpact = Math.max(...factors.map((factor) => Math.abs(factor.impact)));

  return (
    <article className="data-card aurora-border">
      <div>
        <div className="eyebrow">SHAP weights</div>
        <h2>Latest scoring factors</h2>
        <p className="shap-meta">
          Positive contributions strengthen lending confidence. Negative
          contributions reveal the signals the monitor loop still wants improved.
        </p>
      </div>

      <div className="shap-list">
        {factors.map((factor) => (
          <div
            key={factor.label}
            className={`shap-row${factor.impact < 0 ? " negative" : ""}`}
          >
            <div className="data-label">
              <strong>{factor.label}</strong>
            </div>
            <div className="shap-bar-track">
              <div
                className="shap-bar-fill"
                style={{
                  width: `${(Math.abs(factor.impact) / maxImpact) * 100}%`,
                }}
              />
            </div>
            <div className="shap-value">
              {factor.impact > 0 ? "+" : ""}
              {factor.impact}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
