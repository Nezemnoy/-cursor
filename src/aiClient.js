import OpenAI from "openai";
import { getConfig } from "./config.js";

export function getAiClient(apiKey) {
  const key = apiKey ?? getConfig().apiKey;
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/ai-news-digest",
      "X-Title": "AI News Digest",
    },
  });
}

function isQuotaError(err) {
  if (err?.status === 402) return true;
  if (err?.status === 404) return true; // model not found / no endpoints
  const msg = (err?.message ?? "").toLowerCase();
  return (
    msg.includes("insufficient_credits") ||
    msg.includes("no endpoints") ||
    msg.includes("context_length_exceeded") ||
    msg.includes("quota") ||
    msg.includes("credits")
  );
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

// Iterates through configured models in priority order.
// Moves to the next model on quota/credits errors; re-raises other errors.
export async function withModelFallback(fn) {
  const { models, apiKey } = getConfig();
  const ai = getAiClient(apiKey);

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      return await withRetry(() => fn(ai, model));
    } catch (err) {
      if (isQuotaError(err) && i < models.length - 1) {
        console.warn(`  Model "${model}" quota/credits exhausted, switching to "${models[i + 1]}"…`);
        continue;
      }
      throw err;
    }
  }
}
