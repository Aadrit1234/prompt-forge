# Prompt Forge

> Say the task. Get the prompt that actually works.

Prompt Forge turns a plain-language description of what you want into a precise, structured
prompt that reliably produces better results from any AI model. It applies real prompt-engineering
techniques — role & context binding, explicit constraints, output format, step-by-step reasoning,
edge-case handling — but only where they genuinely help. A one-line request gets a tight prompt,
not a padded template.

## Features

- **Two-panel forge** — describe your task in `intent.txt`, get a ready-to-paste prompt in `prompt.md`
- **Model picker** — when an OpenRouter/Gemini key is configured, choose the engine and model per request in the UI (or leave it on the server default)
- **Domain hints** (General, Code, Write, Analyze, Research, Data) and **Standard / Deep** depth toggle
- **Techniques report** — the prompt comes with a list of what was applied and why
- **Usage estimate** — token count and rough daily-budget percentage (Free / Pro / Max 5x / Max 20x)
- **History** — your last 20 forges, stored locally in the browser
- **One-click copy, .md download, and Ctrl/Cmd + Enter** to generate
- Light, minimal, animated UI with Lucide icons

## Architecture

- `server.js` — Express server. Routes `/api/generate` through the best available engine and
  serves the built client in production.
- `src/lib/forge.js` — the forge engines: OpenRouter, Gemini (Google AI Studio), Anthropic,
  Ollama, and the built-in local engine that needs no key at all.
- `api/index.js` + `vercel.json` — Vercel serverless entry point and routing.
- `src/` — Vite + React client.

## Setup

**No key required.** Prompt Forge works out of the box with its built-in local engine:

```bash
npm install
npm start          # then open http://localhost:3001
```

Optionally drop a `.env` file in the project root (the server auto-loads it, existing env vars win):

| Env var                 | Default               | Description                                      |
| ----------------------- | --------------------- | ------------------------------------------------ |
| `OPENROUTER_API_KEY`    | — (optional)          | Enables the OpenRouter backend                   |
| `OPENROUTER_MODEL`      | `openrouter/auto`     | Model used by OpenRouter (any model it offers)   |
| `GOOGLE_API_KEY`        | — (optional)          | Enables the Gemini backend (AI Studio key)       |
| `GEMINI_API_KEY`        | — (optional)          | Alias for `GOOGLE_API_KEY`                       |
| `GEMINI_MODEL`          | `gemini-2.0-flash`    | Gemini model used to forge prompts               |
| `ANTHROPIC_API_KEY`     | — (optional)          | Enables the Anthropic backend                    |
| `ANTHROPIC_MODEL`       | `claude-sonnet-4-5`   | Anthropic model used to forge prompts            |
| `FORGE_ENGINE`          | — (optional)          | Force an engine: `openrouter`, `gemini`, `anthropic`, `ollama`, or `local` |
| `PORT`                  | `3001`                | Port for the API / production server             |
| `OLLAMA_URL`            | `http://localhost:11434` | Used automatically if Ollama is running       |

If several keys are set, the server picks one in this order:
`OpenRouter → Gemini → Anthropic → Ollama → local`. Set `FORGE_ENGINE` to override.

## Development

```bash
npm run dev     # Express API on :3001 + Vite dev server on :5173 (proxies /api)
```

## Production

```bash
npm run build   # builds the client into dist/
npm start       # serves API + dist on :3001
```

## How it works

1. You describe a task in plain language and pick a domain + depth.
2. The server picks the best available engine:
   - **OpenRouter** — if `OPENROUTER_API_KEY` is set (one key, many models)
   - **Gemini** — if `GOOGLE_API_KEY` / `GEMINI_API_KEY` is set (Google AI Studio)
   - **Anthropic** — if `ANTHROPIC_API_KEY` is set
   - **Ollama** — if a local Ollama instance is running (LLM-quality, no key)
   - **Built-in local engine** — always available, zero setup, needs nothing

   When a keyed engine is configured, the UI shows a model picker (engine + model).
   Whatever is selected there overrides the server default for that request only;
   leave it untouched to use the env-var default.
3. The engine returns an optimized prompt, the techniques it applied (each with a "why"), and
   a domain label. The active engine is shown in the result.
4. The UI shows the prompt with copy/download, the techniques report, and a usage estimate.

With any keyed backend (OpenRouter, Gemini, Anthropic), your key never leaves the server — the
browser only ever talks to `/api/generate` on this server. The local and Ollama engines never
send anything off your machine.

## Deploy to Vercel

1. Push this repo to GitHub (or use the Vercel CLI: `vercel`).
2. In Vercel, **Import Project** — Vite is auto-detected, so no build settings are needed.
   - Build command: `npm run build` (default)
   - Output directory: `dist` (default)
3. Add your keys in **Project → Settings → Environment Variables**:
   - `OPENROUTER_API_KEY=sk-or-...` and/or `GOOGLE_API_KEY=AIza...` (and optionally `FORGE_ENGINE`)
4. Deploy. Requests to `/api/*` run in the serverless function (`api/index.js`); the built
   client is served as static files with an SPA fallback (`vercel.json`).
5. Local testing against the same setup: `vercel dev` (or `npm run dev`).
