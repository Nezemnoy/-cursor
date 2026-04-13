import OpenAI from "openai";
import "dotenv/config";

export const MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-exp:free";

export const ai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/ai-news-digest",
    "X-Title": "AI News Digest",
  },
});

// Calls fn() and retries on 429, waiting the suggested delay from the response.
export async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes("429");
      if (!is429 || attempt === maxRetries) throw err;

      // Honour the Retry-After header if present, otherwise back off exponentially.
      const retryAfter = err?.headers?.["retry-after"];
      const waitSec = retryAfter ? parseInt(retryAfter, 10) : Math.pow(2, attempt + 1) * 5;

      console.warn(`  Rate-limited; retrying in ${waitSec}s... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
    }
  }
}
