import { useEffect, useRef, useState } from "react";
import {
  Terminal,
  Wand2,
  Layers,
  ShieldCheck,
  Zap,
  ArrowRight,
  Lock,
  Cpu,
} from "lucide-react";
import { DOMAINS, LOADING_STEPS, PLAN_PRESETS } from "./lib/constants.js";
import { estimateTokens, formatPercent, copyText } from "./lib/utils.js";
import InputPanel from "./components/InputPanel.jsx";
import OutputPanel from "./components/OutputPanel.jsx";
import HistorySection from "./components/HistorySection.jsx";

const HISTORY_KEY = "prompt-forge-history";

const KEYED_ENGINE_IDS = ["openrouter", "gemini"];
const ENGINE_LABELS = {
  openrouter: "OpenRouter",
  gemini: "Gemini",
  anthropic: "Anthropic",
  ollama: "Ollama (local)",
  local: "built-in engine",
};

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [input, setInput] = useState("");
  const [domain, setDomain] = useState("general");
  const [rigor, setRigor] = useState("standard");
  const [plan, setPlan] = useState("pro");
  const [loading, setLoading] = useState(false);
  const [logStep, setLogStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [engineInfo, setEngineInfo] = useState(null);
  const [engineChoice, setEngineChoice] = useState("");
  const [modelChoice, setModelChoice] = useState("");
  const intervalRef = useRef(null);
  const copiedTimer = useRef(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((info) => {
        setEngineInfo(info);
        const keyed = KEYED_ENGINE_IDS.filter((id) => info?.engines?.[id] && info?.models?.[id]);
        if (keyed.length > 0) {
          const activeKeyed = keyed.includes(info?.active) ? info.active : keyed[0];
          setEngineChoice((prev) => prev || activeKeyed);
          setModelChoice((prev) => prev || info.models?.[activeKeyed]?.model || "");
        }
      })
      .catch(() => setEngineInfo(null));
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(copiedTimer.current);
    };
  }, []);

  function saveHistory(next) {
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — non-critical */
    }
  }

  async function handleGenerate() {
    if (!input.trim() || loading) return;
    setError(null);
    setResult(null);
    setCopied(false);
    setLoading(true);
    setLogStep(0);

    let i = 0;
    intervalRef.current = setInterval(() => {
      i += 1;
      setLogStep(i);
      if (i >= LOADING_STEPS.length) clearInterval(intervalRef.current);
    }, 460);

    const domainLabel = DOMAINS.find((d) => d.id === domain)?.label || "General";

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: input.trim(),
          domain: domainLabel,
          rigor,
          ...(engineChoice ? { engine: engineChoice } : {}),
          ...(modelChoice ? { model: modelChoice } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Generation failed. Try again.");

      setResult(data);

      const entry = {
        id: Date.now().toString(),
        input: input.trim(),
        domain: data.domain || domainLabel,
        techniques: data.techniques_applied || [],
        output: data.optimized_prompt,
        ts: Date.now(),
      };
      saveHistory([entry, ...history].slice(0, 20));
    } catch (e) {
      setError(e.message || "Generation failed. Try again.");
    } finally {
      clearInterval(intervalRef.current);
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    const ok = await copyText(result.optimized_prompt);
    if (ok) {
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1800);
    }
  }

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([result.optimized_prompt], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompt.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadHistoryItem(item) {
    setInput(item.input);
    setResult({
      optimized_prompt: item.output,
      techniques_applied: item.techniques,
      domain: item.domain,
    });
    setError(null);
    setCopied(false);
  }

  function deleteHistoryItem(id) {
    saveHistory(history.filter((h) => h.id !== id));
  }

  const activePlan = PLAN_PRESETS.find((p) => p.id === plan) || PLAN_PRESETS[1];
  const tokenCount = result ? estimateTokens(result.optimized_prompt) : 0;
  const usagePercent = result ? (tokenCount / activePlan.dailyTokenBudget) * 100 : 0;

  // Model picker: shown only when a keyed engine (OpenRouter/Gemini) is configured.
  const keyedEngines = KEYED_ENGINE_IDS.filter(
    (id) => engineInfo?.engines?.[id] && engineInfo?.models?.[id]
  );
  const activeEngine = result?.engine || engineInfo?.active || "";
  const engineLabel = ENGINE_LABELS[activeEngine] || "";
  const serverKeyed = KEYED_ENGINE_IDS.includes(activeEngine);
  const currentEngine = engineChoice || keyedEngines[0] || "";
  const currentModelInfo = engineInfo?.models?.[currentEngine] || null;
  const modelOptions = currentModelInfo?.options || [];
  const effectiveModel =
    modelChoice && modelOptions.some((o) => o.id === modelChoice) ? modelChoice : "";

  function handleEngineChange(id) {
    setEngineChoice(id);
    setModelChoice(engineInfo?.models?.[id]?.model || "");
  }

  return (
    <div className="wrap">
      <div className="bg-layer" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />

      {/* Hero */}
      <header className="hero">
        <div className="reveal" style={{ animationDelay: "0ms" }}>
          <span className="badge">
            <span className="dot" />
            <Terminal size={13} strokeWidth={2.2} />
            $ forge --generate
          </span>
        </div>
        <h1 className="hero-title reveal" style={{ animationDelay: "80ms" }}>
          Say the task. Get the prompt that <span className="grad">actually works</span>.
        </h1>
        <p className="hero-sub reveal" style={{ animationDelay: "160ms" }}>
          Describe what you want in plain language. Prompt Forge turns it into a precise,
          structured prompt using the techniques that actually move model output.
        </p>
        <div className="hero-features reveal" style={{ animationDelay: "240ms" }}>
          <span className="feature-chip">
            <Wand2 size={14} /> Role &amp; context binding
          </span>
          <span className="feature-chip">
            <Layers size={14} /> Structure &amp; output format
          </span>
          <span className="feature-chip">
            <ShieldCheck size={14} /> Edge cases &amp; constraints
          </span>
          <span className="feature-chip">
            <Zap size={14} /> Ready to paste, in seconds
          </span>
        </div>
      </header>

      {/* Panels */}
      <div className="grid">
        <div className="reveal" style={{ animationDelay: "300ms" }}>
          <InputPanel
            input={input}
            setInput={setInput}
            domain={domain}
            setDomain={setDomain}
            rigor={rigor}
            setRigor={setRigor}
            loading={loading}
            onGenerate={handleGenerate}
            modelPicker={keyedEngines.length > 0}
            modelEngines={keyedEngines}
            engineChoice={currentEngine}
            onEngineChange={handleEngineChange}
            modelOptions={modelOptions}
            modelChoice={effectiveModel}
            onModelChange={setModelChoice}
          />
        </div>
        <div className="reveal" style={{ animationDelay: "380ms" }}>
          <OutputPanel
            loading={loading}
            logStep={logStep}
            result={result}
            error={error}
            onRetry={handleGenerate}
            plan={plan}
            setPlan={setPlan}
            activePlan={activePlan}
            tokenCount={tokenCount}
            usagePercent={usagePercent}
            copied={copied}
            onCopy={handleCopy}
            onDownload={handleDownload}
            engineLabel={engineLabel}
          />
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <HistorySection history={history} onLoad={loadHistoryItem} onDelete={deleteHistoryItem} />
      )}

      {/* Footer */}
      <footer className="footer">
        <span className="trust">
          {serverKeyed ? (
            <>
              <Lock size={12} /> Your API key never leaves the server
            </>
          ) : (
            <>
              <Cpu size={12} /> No API key needed — {engineLabel || "local"} handles it
            </>
          )}
        </span>
        <span>
          forge v1.0 <ArrowRight size={11} style={{ verticalAlign: "-1px" }} /> {engineLabel || "ready"}
        </span>
      </footer>
    </div>
  );
}
