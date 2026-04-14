import OpenAI from "openai";
import { getConfig } from "./config.js";

export function getAiClient(baseURL, apiKey) {
  return new OpenAI({
    baseURL,
    apiKey,
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
  return (
    msg.includes("insufficient_credits") ||
    msg.includes("no endpoints") ||
    msg.includes("context_length_exceeded") ||
    msg.includes("quota") ||
    msg.includes("credits")
  );
}

function isProviderError(err) {
  // Treat auth errors and provider-level failures as "skip provider"
  if (err?.status === 401 || err?.status === 403) return true;
  const msg = (err?.message ?? "").toLowerCase();
  return msg.includes("invalid api key") || msg.includes("authentication");
}

// Retries fn() on 429 rate-limit errors for a single model.
export async function withRetry(fn, maxRetries) {
  const retries = maxRetries ?? getConfig().maxRetries;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes("429");
      if (!is429 || attempt === retries) throw err;

      const retryAfter = err?.headers?.["retry-after"];
      const waitSec = retryAfter ? parseInt(retryAfter, 10) : Math.pow(2, attempt + 1) * 5;
      console.warn(`  Rate-limited; retrying in ${waitSec}s... (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
    }
  }
}

// Iterates enabled providers (by priority), then models within each provider.
// On quota/unavailability: try next model → then next provider.
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
      console.log(`  [${provider.name}] model: ${model}`);
      try {
        return await withRetry(() => fn(ai, model));
      } catch (err) {
        if (isProviderError(err)) {
          console.warn(`  Provider "${provider.name}" auth failed, switching provider…`);
          break; // try next provider
        }
        if (isQuotaError(err)) {
          if (i < models.length - 1) {
            console.warn(`  [${provider.name}] Model "${model}" unavailable, trying "${models[i + 1]}"…`);
            continue;
          }
          console.warn(`  [${provider.name}] All models exhausted, switching provider…`);
          break; // try next provider
        }
        throw err; // unexpected error — surface it
      }
    }
  }

  throw new Error("All providers and models exhausted — check API keys and model availability");
}
