import "dotenv/config";
import { ai, MODEL, withRetry } from "./aiClient.js";

// Summarizes a single article using the configured OpenRouter model.
// Returns enriched article with `summary`, `strategicTake`, and `actionSignal` fields.
export async function summarizeArticle(article) {
  const prompt = `You are a senior technology advisor writing a daily brief for a CTO.

Title: ${article.title}
Source: ${article.source}
Content: ${article.body.slice(0, 1500)}

Respond ONLY with a valid JSON object in this exact format:
{"summary":"2-3 sentence factual summary of the article.","strategicTake":"1-2 sentences on architecture, vendor, hiring, or competitive implications for a technology leader.","actionSignal":"Monitor"}

actionSignal must be exactly one of: "Act Now", "Evaluate", "Monitor"`;

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
    const { summary, strategicTake, actionSignal } = JSON.parse(jsonMatch[0]);
    return { ...article, summary, strategicTake, actionSignal };
  } catch (err) {
    console.error(`Summarization failed for "${article.title}":`, err.message.split("\n")[0]);
    const fallback = article.body.split(".")[0].trim() + ".";
    return { ...article, summary: fallback, strategicTake: "", actionSignal: "" };
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

// Synthesizes a CTO-level brief across all summarized articles.
// Returns { themes, recommendation } or null on failure.
export async function synthesizeDigest(articles) {
  const articleList = articles
    .map((a, i) => `${i + 1}. [${a.actionSignal ?? ""}] ${a.title}\n   ${a.strategicTake ?? a.summary}`)
    .join("\n\n");

  const prompt = `You are a senior technology advisor. Based on today's AI news summaries below, write a brief CTO digest header.

Articles:
${articleList}

Respond ONLY with a valid JSON object in this exact format:
{"themes":"2-3 key strategic themes visible across today's articles, in 2-3 sentences.","recommendation":"One concrete, actionable recommendation for a CTO this week, in 1-2 sentences."}`;

  try {
    const response = await withRetry(() =>
      ai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      })
    );
    const text = response.choices[0].message.content.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response");
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Digest synthesis failed:", err.message.split("\n")[0]);
    return null;
  }
}
