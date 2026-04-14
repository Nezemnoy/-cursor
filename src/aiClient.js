import OpenAI from "openai";
import { getConfig } from "./config.js";

export function getAiClient(baseURL, apiKey) {
  return new OpenAI({
    baseURL,
    apiKey,
    timeout: 45000, // 45s max per request (SDK default is 600s)
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/ai-news-digest",
      "X-Title": "AI News Digest",
    },
  });
}

function isQuotaError(err) {
  if (err?.status === 402) return true;
  if (err?.status === 404) return true; // model not found / no endpoints
  if (err?.status === 429) return true; // daily/rate limit exhausted — try next model
  if (err?.status === 400) return true; // context length / unsupported params — try next model
  const msg = (err?.message ?? "").toLowerCase();
  if (msg.includes("timeout") || msg.includes("timed out") || err?.code === "ETIMEDOUT") return true;
  return (
    msg.includes("insufficient_credits") ||
    msg.includes("no endpoints") ||
    msg.includes("context_length_exceeded") ||
    msg.includes("quota") ||
    msg.includes("credits")
  );
}

// Returns true when the daily/total free quota is gone — retrying won't help.
function isDailyLimitError(err) {
  const msg = (err?.message ?? "").toLowerCase();
  return (
    msg.includes("per-day") ||
    msg.includes("per_day") ||
    msg.includes("daily") ||
    msg.includes("free-models-per-day") ||
    msg.includes("tokens per day") ||
    msg.includes("requests per day")
  );
}

function quotaReason(err) {
  if (isDailyLimitError(err))          return "daily limit exhausted";
  if (err?.status === 404)             return "model not found / no endpoints";
  if (err?.status === 400)             return "context too long / unsupported params";
  if (err?.status === 402)             return "insufficient credits";
  return "quota/credits exhausted";
}

function isProviderError(err) {
  if (err?.status === 401 || err?.status === 403) return true;
  const msg = (err?.message ?? "").toLowerCase();
  return msg.includes("invalid api key") || msg.includes("authentication");
}

// Retries fn() on temporary (per-minute) 429 rate-limit errors.
// Daily limit errors are thrown immediately — no point waiting.
export async function withRetry(fn, maxRetries) {
  const retries = maxRetries ?? getConfig().maxRetries;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes("429");
      if (!is429 || isDailyLimitError(err) || attempt === retries) throw err;

      const retryAfter = err?.headers?.["retry-after"];
      const waitSec = retryAfter ? parseInt(retryAfter, 10) : Math.pow(2, attempt + 1) * 5;
      console.warn(`  Rate-limited (per-minute); retrying in ${waitSec}s… (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
    }
  }
}

// Models that hit quota/credits this pipeline run — skipped on subsequent calls.
// Reset automatically on each new run (fresh process).
const _exhausted = new Set();

// Iterates enabled providers (by priority), then models within each provider.
// On quota/unavailability: marks model exhausted for this run, tries next.
export async function withModelFallback(fn) {
  const { providers, models, apiKey: globalApiKey } = getConfig();

  const enabledProviders = providers.filter((p) => p.enabled);
  if (enabledProviders.length === 0) throw new Error("No enabled providers configured");

  for (const provider of enabledProviders) {
    const apiKey = provider.apiKey || (provider.name === "OpenRouter" ? globalApiKey : "");
    if (!apiKey) {
      console.warn(`  Provider "${provider.name}" skipped — no API key set`);
      continue;
    }

    const ai = getAiClient(provider.baseUrl, apiKey);

    for (let i = 0; i < models.length; i++) {
      const model = models[i];

      if (_exhausted.has(`${provider.name}:${model}`)) {
        console.log(`  [${provider.name}] skipping "${model}" — exhausted this run`);
        continue;
      }

      console.log(`  [${provider.name}] trying: ${model}`);
      try {
        return await withRetry(() => fn(ai, model));
      } catch (err) {
        if (isProviderError(err)) {
          console.warn(`  [${provider.name}] auth failed — switching provider…`);
          break;
        }
        if (isQuotaError(err)) {
          const reason = quotaReason(err);
          _exhausted.add(`${provider.name}:${model}`);
          if (i < models.length - 1) {
            console.warn(`  [${provider.name}] "${model}" — ${reason}, trying next model…`);
            continue;
          }
          console.warn(`  [${provider.name}] "${model}" — ${reason}, all models exhausted, switching provider…`);
          break;
        }
        throw err;
      }
    }
  }

  throw new Error("All providers and models exhausted — check API keys and model availability");
}
