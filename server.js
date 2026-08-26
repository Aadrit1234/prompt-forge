import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  MODEL_CATALOG,
  forgeLocally,
  forgeWithAnthropic,
  forgeWithGemini,
  forgeWithOllama,
  forgeWithOpenRouter,
  ollamaAvailable,
} from "./src/lib/forge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal .env loader (no dependency). Existing env vars win.
try {
  const envFile = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
} catch {
  /* no .env file — env vars must come from the environment (e.g. Vercel) */
}

const app = express();
const PORT = process.env.PORT || 3001;

/* ------------------------------------------------------------------ */
/* Engine registry                                                     */
/* Precedence when multiple keys are set: openrouter → gemini →        */
/* anthropic → ollama → local. Set FORGE_ENGINE to force one engine.   */
/* ------------------------------------------------------------------ */

const ENGINES = {
  openrouter: {
    label: "OpenRouter",
    available: () => Boolean(process.env.OPENROUTER_API_KEY),
    run: ({ input, domain, rigor }) =>
      forgeWithOpenRouter({ input, domainLabel: domain, rigor }),
  },
  gemini: {
    label: "Gemini",
    available: () => Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY),
    run: ({ input, domain, rigor }) =>
      forgeWithGemini({ input, domainLabel: domain, rigor }),
  },
  anthropic: {
    label: "Anthropic",
    available: () => Boolean(process.env.ANTHROPIC_API_KEY),
    run: ({ input, domain, rigor }) =>
      forgeWithAnthropic({ input, domainLabel: domain, rigor }),
  },
  ollama: {
    label: "Ollama (local)",
    available: () => ollamaAvailable(),
    run: ({ input, domain, rigor }) =>
      forgeWithOllama({ input, domainLabel: domain, rigor }),
  },
  local: {
    label: "built-in engine",
    available: () => true,
    run: ({ input, domain, rigor }) =>
      forgeLocally({ input, domainLabel: domain, rigor }),
  },
};

// Engines the user explicitly configures with a key — if one of these is
// chosen and its call fails, surface the error instead of silently
// degrading to a weaker engine.
const KEYED_ENGINES = ["openrouter", "gemini", "anthropic"];
const DEFAULT_ORDER = ["openrouter", "gemini", "anthropic", "ollama", "local"];

function engineOrder() {
  const requested = (process.env.FORGE_ENGINE || "").toLowerCase().trim();
  if (requested && DEFAULT_ORDER.includes(requested)) {
    return [requested, ...DEFAULT_ORDER.filter((e) => e !== requested)];
  }
  return DEFAULT_ORDER;
}

/** Return the name of the first available engine in the current order. */
async function pickEngine() {
  for (const name of engineOrder()) {
    const engine = ENGINES[name];
    let available = false;
    try {
      available = await engine.available();
    } catch {
      available = false;
    }
    if (available) return name;
  }
  return "local";
}

app.use(express.json({ limit: "1mb" }));

function keyedEngineConfigured(name) {
  if (name === "openrouter") return Boolean(process.env.OPENROUTER_API_KEY);
  if (name === "gemini") return Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
  if (name === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  return false;
}

app.get("/api/health", async (_req, res) => {
  const ollama = await ollamaAvailable();
  res.json({
    ok: true,
    active: await pickEngine(),
    engines: {
      openrouter: keyedEngineConfigured("openrouter"),
      gemini: keyedEngineConfigured("gemini"),
      anthropic: keyedEngineConfigured("anthropic"),
      ollama,
      local: true,
    },
    models: {
      openrouter: {
        ...MODEL_CATALOG.openrouter,
        configured: keyedEngineConfigured("openrouter"),
        model: process.env.OPENROUTER_MODEL || MODEL_CATALOG.openrouter.default,
      },
      gemini: {
        ...MODEL_CATALOG.gemini,
        configured: keyedEngineConfigured("gemini"),
        model: process.env.GEMINI_MODEL || MODEL_CATALOG.gemini.default,
      },
    },
  });
});

app.post("/api/generate", async (req, res) => {
  const {
    input,
    domain = "General",
    rigor = "standard",
    engine: requestedEngine,
    model: requestedModel,
  } = req.body || {};

  if (!input || typeof input !== "string" || !input.trim()) {
    return res.status(400).json({ error: "Please describe a task first." });
  }

  const cleanInput = input.trim();

  // Per-request engine override (from the UI model picker). Only honored for
  // keyed engines that are actually configured; otherwise normal precedence.
  let order = engineOrder();
  if (
    typeof requestedEngine === "string" &&
    KEYED_ENGINES.includes(requestedEngine) &&
    keyedEngineConfigured(requestedEngine)
  ) {
    order = [requestedEngine, ...DEFAULT_ORDER.filter((e) => e !== requestedEngine)];
  }

  // Per-request model override (from the UI model picker).
  const modelOverride =
    typeof requestedModel === "string" && requestedModel.trim().length > 0 && requestedModel.trim().length <= 200
      ? requestedModel.trim()
      : undefined;

  for (const name of order) {
    const engine = ENGINES[name];

    let available = false;
    try {
      available = await engine.available();
    } catch {
      available = false;
    }
    if (!available) continue;

    try {
      const forged = await engine.run({ input: cleanInput, domain, rigor, model: modelOverride });
      return res.json({ engine: name, ...forged });
    } catch (err) {
      console.error(`[forge] ${name} failed:`, err.message);
      if (KEYED_ENGINES.includes(name)) {
        const status = err.status === 401 ? 502 : err.status || 502;
        const keyVar = {
          openrouter: "OPENROUTER_API_KEY",
          gemini: "GOOGLE_API_KEY (or GEMINI_API_KEY)",
          anthropic: "ANTHROPIC_API_KEY",
        }[name];
        const message =
          err.status === 401
            ? `${engine.label} rejected the API key. Check ${keyVar} on the server.`
            : err.name === "TimeoutError"
              ? `${engine.label} timed out waiting for the model. Try again in a moment.`
              : err.reason === "truncated"
                ? "The model's response was cut off before it finished. Try again."
                : err.reason === "malformed"
                  ? "The model returned an unparseable response. Try again."
                  : `The model call failed (${err.status || "network error"}). Try again in a moment.`;
        return res.status(status).json({ error: message });
      }
      // Ollama failed — fall through to the next engine (usually local).
    }
  }

  // Unreachable in practice (local is always available), but keep a safety net.
  const forged = forgeLocally({ input: cleanInput, domainLabel: domain, rigor });
  res.json({ engine: "local", ...forged });
});

// Serve the built client in production.
const distDir = path.join(__dirname, "dist");
app.use(express.static(distDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distDir, "index.html"), (err) => {
    if (err) next();
  });
});

export default app;

// On Vercel this file is imported as a serverless function (api/index.js)
// and must not bind a port; Vercel sets VERCEL=1 in that environment.
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`[forge] Prompt Forge listening on http://localhost:${PORT}`);
    console.log(
      `[forge] engines: openrouter=${process.env.OPENROUTER_API_KEY ? "yes" : "no"} · gemini=${process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY ? "yes" : "no"} · anthropic=${process.env.ANTHROPIC_API_KEY ? "yes" : "no"} · ollama=auto · local=always`
    );
  });
}
