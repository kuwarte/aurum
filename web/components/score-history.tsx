type ScoreHistoryPoint = {
  label: string;
  score: number;
};

export function ScoreHistory({ history }: { history: ScoreHistoryPoint[] }) {
  const maxScore = Math.max(...history.map((point) => point.score));

  return (
    <article className="data-card aurora-border">
      <div>
        <h2>Score history</h2>
        <p className="chart-note">
          A compact progression of how the wallet score has matured across recent
          assessment cycles.
        </p>
      </div>

      <div className="score-bars">
        {history.map((point) => (
          <div key={point.label} className="score-row">
            <header>
              <span>{point.label}</span>
              <strong>{point.score}</strong>
            </header>
            <div className="score-bar-track">
              <div
                className="score-bar-fill"
                style={{ width: `${(point.score / maxScore) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
