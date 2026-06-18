import { agentStatuses } from "@/lib/aurum-data";

export function AgentStatus() {
  return (
    <article className="data-card aurora-border">
      <div>
        <h2>Monitoring agents</h2>
        <p className="chart-note">
          Parallel evaluators keep the score fresh by tracking wallet events,
          collateral state, oracle drift, and loan posture.
        </p>
      </div>

      <div className="agent-list">
        {agentStatuses.map((agent) => (
          <div key={agent.name} className="agent-row">
            <div className="agent-header">
              <div>
                <div className="agent-name">{agent.name}</div>
                <div className="agent-subtitle">{agent.summary}</div>
              </div>
              <span className="mini-badge">{agent.state}</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${agent.confidence}%` }}
              />
            </div>
            <div className="agent-subtitle">
              Confidence {agent.confidence}% - Updated {agent.updatedAt}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
