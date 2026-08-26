import {
  ArrowRight,
  Code2,
  Database,
  FileText,
  Loader2,
  PenLine,
  Search,
  BookOpen,
  Sparkles,
  Wand2,
  Keyboard,
  Cpu,
} from "lucide-react";
import { DOMAINS, EXAMPLES, RIGOR_OPTIONS } from "../lib/constants.js";

const ENGINE_NAMES = { openrouter: "OpenRouter", gemini: "Gemini" };

const DOMAIN_ICONS = {
  general: Sparkles,
  code: Code2,
  write: PenLine,
  analyze: Search,
  research: BookOpen,
  data: Database,
};

export default function InputPanel({
  input,
  setInput,
  domain,
  setDomain,
  rigor,
  setRigor,
  loading,
  onGenerate,
  modelPicker = false,
  modelEngines = [],
  engineChoice = "",
  onEngineChange,
  modelOptions = [],
  modelChoice = "",
  onModelChange,
}) {
  const canGenerate = input.trim().length > 0 && !loading;

  // Show the selected model; if it's not in the curated list (e.g. a custom
  // OPENROUTER_MODEL env default), surface it as the "server default" option.
  const inList = modelOptions.some((o) => o.id === modelChoice);
  const displayModel = inList ? modelChoice : modelOptions[0]?.id || modelChoice;
  const displayOptions =
    inList || !modelChoice
      ? modelOptions
      : [{ id: modelChoice, label: `${modelChoice} (server default)` }, ...modelOptions];

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onGenerate();
    }
  }

  return (
    <section
      className="panel glass"
      aria-label="Task input"
    >
      <div className="panel-tab">
        <span className="panel-tab-left">
          <span className="tab-dot amber" />
          intent.txt
        </span>
        <span className="tab-meta">
          <FileText size={12} />
          {input.length.toLocaleString()} chars
        </span>
      </div>

      <div className="panel-body">
        {/* Examples */}
        <div>
          <div
            className="input-hint"
            style={{ marginBottom: 8, textTransform: "none", letterSpacing: 0 }}
          >
            <Sparkles size={12} /> Try an example
          </div>
          <div className="chip-row">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                className="chip"
                onClick={() => setInput(ex.text)}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Domains */}
        <div>
          <div
            className="input-hint"
            style={{ marginBottom: 8, textTransform: "none", letterSpacing: 0 }}
          >
            <Wand2 size={12} /> Task type
          </div>
          <div className="chip-row">
            {DOMAINS.map((d) => {
              const Icon = DOMAIN_ICONS[d.id];
              const active = domain === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`chip ${active ? "active" : ""}`}
                  onClick={() => setDomain(d.id)}
                >
                  <span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 5 }}>
                    <Icon size={12} />
                  </span>
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          className="forge-input"
          rows={7}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. help me write a follow-up email to a recruiter who went quiet after my interview"
          aria-label="Describe your task in plain language"
        />

        {/* Model picker — shown when an API-keyed engine is configured */}
        {modelPicker && (
          <div className="model-row">
            {modelEngines.length > 1 && (
              <label className="model-field">
                <span className="model-label">
                  <Cpu size={11} /> Engine
                </span>
                <select
                  className="model-select"
                  value={engineChoice}
                  onChange={(e) => onEngineChange(e.target.value)}
                  aria-label="Engine"
                >
                  {modelEngines.map((id) => (
                    <option key={id} value={id}>
                      {ENGINE_NAMES[id] || id}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="model-field">
              <span className="model-label">
                <Cpu size={11} /> Model
              </span>
              <select
                className="model-select"
                value={displayModel}
                onChange={(e) => onModelChange(e.target.value)}
                aria-label="Model"
              >
                {displayOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* Footer controls */}
        <div className="input-footer">
          <div className="segmented" role="group" aria-label="Optimization depth">
            {RIGOR_OPTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={rigor === r.id ? "active" : ""}
                onClick={() => setRigor(r.id)}
                title={r.id === "quick" ? "Minimal prompt — role, objective, scope" : r.id === "deep" ? "Adds step-by-step reasoning and edge cases" : "Balanced structure with constraints and format"}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-primary"
            disabled={!canGenerate}
            onClick={onGenerate}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="spin" /> Forging
              </>
            ) : (
              <>
                Generate Prompt <ArrowRight size={15} className="arrow" />
              </>
            )}
          </button>
        </div>

        <span className="input-hint">
          <Keyboard size={12} />
          <span className="kbd">Ctrl</span> + <span className="kbd">Enter</span> to generate
        </span>
      </div>
    </section>
  );
}
