/* ------------------------------------------------------------------ */
/* Prompt Forge — forge engine (server-side)                           */
/* ------------------------------------------------------------------ */

/* Model catalog exposed via /api/health so the client can offer a model picker.
   These are the curated options shown in the UI; any model string is still
   accepted by the server, so the env vars remain the fallback defaults. */
export const MODEL_CATALOG = {
  openrouter: {
    default: "openrouter/auto",
    options: [
      { id: "openrouter/auto", label: "Auto (best available)" },
      { id: "openai/gpt-4o-mini", label: "OpenAI GPT-4o mini" },
      { id: "openai/gpt-4o", label: "OpenAI GPT-4o" },
      { id: "anthropic/claude-sonnet-4.5", label: "Anthropic Claude Sonnet 4.5" },
      { id: "google/gemini-2.5-flash", label: "Google Gemini 2.5 Flash" },
      { id: "deepseek/deepseek-chat", label: "DeepSeek V3" },
    ],
  },
  gemini: {
    // Older 2.x models are no longer available to new accounts; 3.x is the
    // current generation that works out of the box.
    default: "gemini-3.6-flash",
    options: [
      { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
      { id: "gemini-flash-latest", label: "Gemini Flash (latest)" },
      { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
    ],
  },
};

export const SYSTEM_PROMPT = `You are an expert prompt engineer. A user will describe, in casual natural language, a task they want an AI model to complete. Your job is to transform their description into a single, complete, ready-to-use prompt that will reliably produce the best possible result when given to an AI model.

Guidelines:
- Infer the user's true goal even if their description is vague, and make reasonable assumptions explicit within the prompt rather than leaving them ambiguous.
- Apply prompt-engineering techniques ONLY where they genuinely improve the outcome for this specific task: assigning a role or persona, stating the objective and audience, providing necessary context and constraints, specifying output format/length/structure, requesting step-by-step reasoning for complex or multi-step tasks, including a short illustrative example when it would remove ambiguity, and stating what to avoid or how to handle edge cases.
- Do not over-engineer a simple task. A one-line request deserves a tight, precise prompt, not a padded template.
- If the optimization depth hint is "deep", be more thorough: add relevant examples, explicit reasoning steps, and edge-case handling where appropriate.
- Write the optimized prompt as if the user is speaking directly to the AI model (first person imperative instructions), ready to paste and send as-is.
- Never include placeholder brackets like [insert X] unless the user's own task genuinely requires a variable input; prefer being concrete.

Respond with ONLY valid JSON, no markdown code fences, no preamble, no trailing text, in exactly this shape:
{"optimized_prompt": "the full optimized prompt as a single string, using \\n for line breaks", "techniques_applied": [{"name": "short technique name", "why": "one short sentence on why it helps for this task"}], "domain": "a short 1-3 word label for the task domain"}

Include 2 to 5 entries in techniques_applied, chosen only from techniques you actually used.`;

export function buildUserMessage(input, domain, rigor) {
  return `Task type hint: ${domain}\nOptimization depth: ${rigor}\n\nUser's plain-language task description:\n"""\n${input}\n"""`;
}

/** Parse a JSON object out of a model's raw text response. Returns null on failure. */
export function extractJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(clean.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Local heuristic engine — no API key required                        */
/* ------------------------------------------------------------------ */

const DOMAIN_PROFILES = {
  general: {
    role: "You are a meticulous, adaptable assistant who delivers exactly what was asked — no more, no less.",
    context:
      "Approach the task pragmatically and proportionally — match the depth of your answer to the complexity of the request.",
    requirements: [
      "Address the request directly and completely.",
      "Use clear, precise language and avoid filler.",
      "If key information is missing, state a reasonable assumption and proceed.",
    ],
    outputFormat:
      "Give a clear, well-organized answer, using short sections or bullets when the topic benefits from structure.",
    process: [
      "Restate the task in your own words to confirm understanding.",
      "Work through the steps in order, then review the final answer once for accuracy and completeness.",
    ],
    edgeCases: [
      "If parts of the request are ambiguous or contradictory, state your interpretation explicitly.",
      "If the answer depends on unstated conditions, name them rather than silently assuming.",
    ],
  },
  code: {
    role: "You are a senior software engineer who writes clean, correct, idiomatic code and explains it clearly.",
    context: "Assume a modern, standard setup for the language and tooling in question.",
    requirements: [
      "Write correct, idiomatic code that follows the language's conventions.",
      "Handle edge cases and invalid inputs gracefully.",
      "Prefer the standard library and widely supported tools over unnecessary dependencies.",
      "Prioritize readability and clarity over cleverness.",
    ],
    outputFormat:
      "Provide the code in a single block, then a short explanation of how it works, any trade-offs, and how to run or test it.",
    process: [
      "Restate the problem and your chosen approach in a few sentences before writing code.",
      "Implement the solution, then review it once for correctness, performance, and edge cases.",
      "Include a minimal usage example.",
    ],
    edgeCases: [
      "Consider empty input, boundary values, and failure states.",
      "If requirements are ambiguous, choose the most reasonable interpretation and state it.",
    ],
  },
  write: {
    role: "You are an expert editor and writer with a sharp sense of tone, clarity, and structure.",
    context:
      "Match the tone, audience, and format implied by the request; when unspecified, default to clear and professional.",
    requirements: [
      "Be concise — every sentence should earn its place.",
      "Use active voice and concrete, specific language.",
      "Respect the intended audience and purpose of the piece.",
    ],
    outputFormat:
      "Deliver the finished text first. If helpful, add a brief note on the structural or tonal choices you made.",
    process: [
      "Draft the piece, then revise it once for clarity, rhythm, and flow.",
      "Vary sentence length to keep the writing engaging.",
      "Cut anything that does not serve the piece's purpose.",
    ],
    edgeCases: [
      "Avoid clichés, filler phrases, and overly formal constructions.",
      "If the desired length is unclear, choose a proportionate length and note it.",
    ],
  },
  analyze: {
    role: "You are a sharp analyst who reasons rigorously, weighs evidence, and avoids jumping to conclusions.",
    context: "Treat the question as the full scope of the work; do not expand it beyond what is asked.",
    requirements: [
      "Separate facts, assumptions, and opinions clearly.",
      "Weigh supporting and opposing considerations before reaching a conclusion.",
      "Quantify or cite evidence wherever possible.",
    ],
    outputFormat:
      "Organize the answer as: summary, key points, trade-offs, and a clear recommendation.",
    process: [
      "For each key claim, note the supporting evidence and the strongest counterargument.",
      "Flag confidence levels for conclusions that are uncertain.",
    ],
    edgeCases: [
      "Guard against confirmation bias — actively consider the strongest opposing view.",
      "If the question is ambiguous, state your interpretation of it first.",
    ],
  },
  research: {
    role: "You are a thorough researcher who verifies information, cites sources, and separates established fact from speculation.",
    context: "Assume the request concerns current information; note the time-sensitivity of findings.",
    requirements: [
      "Scope the question tightly before gathering information.",
      "Prefer reliable, primary sources over secondary summaries.",
      "Distinguish established facts from emerging or contested findings.",
    ],
    outputFormat:
      "Summarize the findings with source attribution, then list any open questions or gaps in the evidence.",
    process: [
      "Verify each major claim against at least two independent sources where possible.",
      "Note the date and reliability of the key sources.",
    ],
    edgeCases: [
      "If sources conflict, present the disagreement rather than picking a side silently.",
      "If the answer cannot be known with confidence, say so directly.",
    ],
  },
  data: {
    role: "You are a careful data scientist who works with numbers precisely and communicates findings plainly.",
    context: "State any assumptions you make about the data, its schema, and its quality.",
    requirements: [
      "Handle missing values and outliers explicitly rather than ignoring them.",
      "Prefer reproducible steps over ad-hoc analysis.",
      "Distinguish correlation from causation in any conclusions.",
    ],
    outputFormat:
      "Separate the method, the code or calculation, and the result into clearly labeled blocks.",
    process: [
      "Validate the result with sanity checks such as row counts and expected ranges.",
      "Explain what the numbers do and do not imply.",
    ],
    edgeCases: [
      "Watch for common data pitfalls: empty columns, type mismatches, and skewed distributions.",
      "If the data is incomplete, state the limitation alongside the result.",
    ],
  },
};

const DOMAIN_KEYS = {
  General: "general",
  Code: "code",
  Write: "write",
  Analyze: "analyze",
  Research: "research",
  Data: "data",
};

const TECHNIQUES = {
  role: { name: "Role assignment", why: "A defined persona sets the expertise and tone the response needs." },
  objective: { name: "Explicit objective", why: "Stating the goal precisely removes ambiguity about what success looks like." },
  assumptions: { name: "Stated assumptions", why: "Making inferred context explicit stops the model from guessing wrong." },
  constraints: { name: "Constraint list", why: "Naming the rules keeps the result focused and on-target." },
  format: { name: "Output format spec", why: "Defining structure and length controls how the answer is organized." },
  reasoning: { name: "Step-by-step reasoning", why: "Sequencing the work improves accuracy on multi-part tasks." },
  edges: { name: "Edge-case handling", why: "Pre-empting edge cases avoids common failure modes." },
  scope: { name: "Concise scope", why: "A tight prompt prevents padding on simple tasks." },
};

/** Build a ready-to-use prompt locally, no model required. */
export function forgeLocally({ input, domainLabel = "General", rigor = "standard" }) {
  const task = input.trim();
  const key = DOMAIN_KEYS[domainLabel] || "general";
  const profile = DOMAIN_PROFILES[key];
  const deep = rigor === "deep";

  const bullets = (items) => items.map((item) => `- ${item}`).join("\n");
  const compact = task.length < 80;

  let optimizedPrompt;
  let techniqueKeys;

  if (compact) {
    optimizedPrompt = [
      profile.role,
      "",
      "Objective",
      task,
      "",
      "Keep the response focused and proportionate to the request — thorough where needed, brief where not.",
    ].join("\n");
    techniqueKeys = ["role", "objective", "scope"];
  } else {
    const sections = [
      profile.role,
      "",
      "Objective",
      task,
      "",
      "Context",
      bullets([
        "Treat the objective above as the full scope of work; do not silently expand it.",
        profile.context,
        "If an assumption is wrong, flag it and adjust rather than guessing silently.",
      ]),
      "",
      "Requirements",
      bullets(profile.requirements),
      "",
      "Output format",
      `- ${profile.outputFormat}`,
    ];

    if (deep) {
      sections.push("", "Process", bullets(profile.process), "", "Edge cases", bullets(profile.edgeCases));
    }

    optimizedPrompt = sections.join("\n");
    techniqueKeys = ["role", "objective", "assumptions", "constraints", "format"];
    if (deep) techniqueKeys.push("reasoning", "edges");
  }

  return {
    optimized_prompt: optimizedPrompt,
    techniques_applied: techniqueKeys.map((k) => ({ ...TECHNIQUES[k] })),
    domain: domainLabel,
  };
}

/* ------------------------------------------------------------------ */
/* Ollama — optional local LLM backend (no key required)               */
/* ------------------------------------------------------------------ */

const ollamaUrl = () => process.env.OLLAMA_URL || "http://localhost:11434";

export async function ollamaAvailable() {
  try {
    const res = await fetch(`${ollamaUrl()}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data.models) && data.models.length > 0;
  } catch {
    return false;
  }
}

function pickOllamaModel(models) {
  const names = models.map((m) => m.name);
  const chatLike = names.filter(
    (n) => !/embed|bge|nomic|mxbai/i.test(n) && /qwen|llama|mistral|gemma|phi|deepseek|command|dolphin/i.test(n)
  );
  const pool = chatLike.length ? chatLike : names.filter((n) => !/embed|bge|nomic|mxbai/i.test(n));
  return (pool[0] || names[0] || "").split(":")[0];
}

export async function forgeWithOllama({ input, domainLabel = "General", rigor = "standard" }) {
  const tagsRes = await fetch(`${ollamaUrl()}/api/tags`, { signal: AbortSignal.timeout(2000) });
  if (!tagsRes.ok) throw new Error("ollama unavailable");
  const tags = await tagsRes.json();
  const model = pickOllamaModel(tags.models || []);
  if (!model) throw new Error("no ollama model");

  const res = await fetch(`${ollamaUrl()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(90000),
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0.3 },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(input.trim(), domainLabel, rigor) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = await res.json();
  const text = data?.message?.content || "";
  const parsed = extractJson(text);
  const result = normalizeModelResult(parsed, domainLabel);
  if (!result) throw new Error("malformed ollama response");
  return result;
}

/* ------------------------------------------------------------------ */
/* Anthropic — LLM backend (ANTHROPIC_API_KEY)                         */
/* ------------------------------------------------------------------ */

export async function forgeWithAnthropic({ input, domainLabel = "General", rigor = "standard", model }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(90000),
    body: JSON.stringify({
      model: model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(input.trim(), domainLabel, rigor) }],
    }),
  });

  if (!res.ok) throw await upstreamError("anthropic", res);

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const result = normalizeModelResult(extractJson(text), domainLabel);
  if (!result) throw new Error("malformed anthropic response");
  return result;
}

/* ------------------------------------------------------------------ */
/* OpenRouter — one key, many models (OPENROUTER_API_KEY)              */
/* OpenAI-compatible chat completions endpoint.                        */
/* ------------------------------------------------------------------ */

export async function forgeWithOpenRouter({ input, domainLabel = "General", rigor = "standard", model }) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    signal: AbortSignal.timeout(90000),
    body: JSON.stringify({
      model: model || process.env.OPENROUTER_MODEL || MODEL_CATALOG.openrouter.default,
      max_tokens: 1200,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(input.trim(), domainLabel, rigor) },
      ],
    }),
  });

  if (!res.ok) throw await upstreamError("openrouter", res);

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  const result = normalizeModelResult(extractJson(text), domainLabel);
  if (!result) throw new Error("malformed openrouter response");
  return result;
}

/* ------------------------------------------------------------------ */
/* Google Gemini (Google AI Studio key) — GOOGLE_API_KEY / GEMINI_API_KEY */
/* ------------------------------------------------------------------ */

export async function forgeWithGemini({ input, domainLabel = "General", rigor = "standard", model: modelOverride }) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  const requested =
    modelOverride || process.env.GEMINI_MODEL || MODEL_CATALOG.gemini.default;

  // Try the requested model first, then the rest of the catalog, so transient
  // "high demand" or per-model availability errors (404/429/5xx) fall back
  // gracefully instead of failing the request.
  const candidates = [
    requested,
    ...MODEL_CATALOG.gemini.options.map((o) => o.id).filter((id) => id !== requested),
  ];

  let lastError = null;
  for (const model of candidates) {
    try {
      return await geminiGenerate({ apiKey, model, input, domainLabel, rigor });
    } catch (err) {
      lastError = err;
      if (![404, 429, 500, 503].includes(err.status)) throw err;
    }
  }
  throw lastError;
}

async function geminiGenerate({ apiKey, model, input, domainLabel, rigor }) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildUserMessage(input.trim(), domainLabel, rigor) }] }],
        generationConfig: { maxOutputTokens: 1200, temperature: 0.3 },
      }),
    }
  );

  if (!res.ok) throw await upstreamError("gemini", res);

  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("\n");
  const result = normalizeModelResult(extractJson(text), domainLabel);
  if (!result) throw new Error("malformed gemini response");
  return result;
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Validate a parsed model response and normalize it to the API shape. Returns null on failure. */
function normalizeModelResult(parsed, fallbackDomain) {
  if (!parsed || typeof parsed.optimized_prompt !== "string" || !parsed.optimized_prompt.trim()) {
    return null;
  }
  return {
    optimized_prompt: parsed.optimized_prompt,
    techniques_applied: Array.isArray(parsed.techniques_applied)
      ? parsed.techniques_applied.slice(0, 5)
      : [],
    domain: typeof parsed.domain === "string" ? parsed.domain : fallbackDomain,
  };
}

/** Build an Error carrying the upstream status + detail so the server can respond helpfully. */
async function upstreamError(provider, res) {
  let detail = "";
  try {
    const body = await res.json();
    detail =
      body?.error?.message ||
      body?.error?.type ||
      body?.error?.code ||
      (typeof body?.error === "string" ? body.error : "");
  } catch {
    /* response body isn't JSON — keep detail empty */
  }
  const err = new Error(`${provider} ${res.status}${detail ? `: ${detail}` : ""}`);
  err.provider = provider;
  err.status = res.status;
  err.detail = detail;
  return err;
}
