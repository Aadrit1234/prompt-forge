import {
  AlertCircle,
  Check,
  Copy,
  Cpu,
  Download,
  FileText,
  Gauge,
  Loader2,
  RotateCcw,
  Tag,
} from "lucide-react";
import { LOADING_STEPS, PLAN_PRESETS } from "../lib/constants.js";
import { formatPercent, useTilt } from "../lib/utils.js";

export default function OutputPanel({
  loading,
  logStep,
  result,
  error,
  onRetry,
  plan,
  setPlan,
  activePlan,
  tokenCount,
  usagePercent,
  copied,
  onCopy,
  onDownload,
  engineLabel,
}) {
  const tilt = useTilt(6, 1.015);

  return (
    <section
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="panel glass tilt"
      aria-label="Generated prompt"
    >
      <div className="panel-tab">
        <span className="panel-tab-left">
          <span className="tab-dot teal" />
          prompt.md
        </span>
        <span className="tab-meta">
          <FileText size={12} />
          {result ? `${tokenCount.toLocaleString()} tokens` : "ready"}
        </span>
      </div>

      <div className="panel-body">
        {!loading && !result && !error && (
          <div className="empty-state">
            <span>
              awaiting input<span className="cursor" />
            </span>
            <span style={{ opacity: 0.7 }}>your forged prompt will appear here</span>
          </div>
        )}

        {loading && (
          <div className="log-lines">
            {LOADING_STEPS.map((step, idx) => {
              if (idx >= logStep) return null;
              const isCurrent = idx === logStep - 1;
              return (
                <div key={step} className="log-line" style={{ animationDelay: `${idx * 40}ms` }}>
                  <span className="status">
                    {isCurrent ? (
                      <Loader2 size={14} className="spin running" />
                    ) : (
                      <Check size={14} className="done" />
                    )}
                  </span>
                  <span>
                    <span className="idx">[{idx + 1}]</span> {step}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {error && !loading && (
          <div className="error-box" role="alert">
            <AlertCircle size={17} />
            <div>
              <p style={{ margin: 0 }}>{error}</p>
              <button type="button" className="btn-ghost retry" onClick={onRetry}>
                <RotateCcw size={13} /> Retry
              </button>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="result" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="result-domain">
                <Tag size={12} />
                {result.domain || "general"}
              </span>
              {engineLabel && (
                <span className="result-engine">
                  <Cpu size={12} />
                  {engineLabel}
                </span>
              )}
            </div>

            {(result.techniques_applied || []).length > 0 && (
              <div className="techniques">
                {(result.techniques_applied || []).map((t, idx) => (
                  <div key={idx} className="technique" style={{ animationDelay: `${idx * 70}ms` }}>
                    <div className="technique-top">
                      <span className="check">
                        <Check size={14} />
                      </span>
                      <span>
                        <span className="idx">[{idx + 1}]</span> {t.name}
                      </span>
                    </div>
                    {t.why && <p className="technique-why">{t.why}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="prompt-box-wrap">
              <div className="prompt-box">{result.optimized_prompt}</div>
              <div className="prompt-box-actions">
                <button
                  type="button"
                  className={`icon-btn ${copied ? "success" : ""}`}
                  onClick={onCopy}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button type="button" className="icon-btn" onClick={onDownload} title="Download as .md">
                  <Download size={13} />
                </button>
              </div>
            </div>

            <UsageCard
              plan={plan}
              setPlan={setPlan}
              activePlan={activePlan}
              tokenCount={tokenCount}
              usagePercent={usagePercent}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function UsageCard({ plan, setPlan, activePlan, tokenCount, usagePercent }) {
  return (
    <div className="usage-card">
      <div className="usage-head">
        <Gauge size={14} />
        usage estimate
      </div>

      <div className="chip-row">
        {PLAN_PRESETS.map((p) => {
          const active = plan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`chip ${active ? "active" : ""}`}
              onClick={() => setPlan(p.id)}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="usage-row">
        <span className="tokens">≈ {tokenCount.toLocaleString()} tokens</span>
        <span className="pct">
          {formatPercent(usagePercent)} of {activePlan.label} daily estimate
        </span>
      </div>

      <div className="bar">
        <div className="bar-fill" style={{ width: `${Math.min(usagePercent, 100)}%` }} />
      </div>

      <p className="usage-note">
        Rough estimate from prompt length only (~4 characters per token). Real limits are dynamic
        and change over time.{" "}
        <a
          href="https://support.claude.com/en/articles/8325606-what-is-the-pro-plan"
          target="_blank"
          rel="noopener noreferrer"
        >
          Check current limits
        </a>
        .
      </p>
    </div>
  );
}
