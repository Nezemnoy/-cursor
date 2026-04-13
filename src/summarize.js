import "dotenv/config";
import { ai, MODEL, withRetry } from "./aiClient.js";

// Summarizes a single article using the configured OpenRouter model.
// Returns enriched article with `summary` and `whyItMatters` fields.
export async function summarizeArticle(article) {
  const prompt = `Summarize this AI news article for a daily digest email.

Title: ${article.title}
Source: ${article.source}
Content: ${article.body.slice(0, 1500)}

Respond ONLY with a valid JSON object in this exact format:
{"summary":"2-3 sentence summary of the article.","whyItMatters":"One sentence on why this matters for the AI field."}`;

  try {
    const response = await withRetry(() =>
      ai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      })
    );
    const text = response.choices[0].message.content.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response");
    const { summary, whyItMatters } = JSON.parse(jsonMatch[0]);
    return { ...article, summary, whyItMatters };
  } catch (err) {
    console.error(`Summarization failed for "${article.title}":`, err.message.split("\n")[0]);
    const fallback = article.body.split(".")[0].trim() + ".";
    return { ...article, summary: fallback, whyItMatters: "" };
  }
}

const INTER_REQUEST_DELAY_MS = 2000;

// Summarizes all articles sequentially with a small delay between calls.
export async function summarizeAll(articles) {
  const results = [];
  for (let i = 0; i < articles.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, INTER_REQUEST_DELAY_MS));
    results.push(await summarizeArticle(articles[i]));
  }
  return results;
}
