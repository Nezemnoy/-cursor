import { getConfig } from "./config.js";
import { withModelFallback } from "./aiClient.js";

export async function filterArticles(articles) {
  if (articles.length === 0) return [];

  const { topics, minScore, topN, temperatures, prompts } = getConfig();

  const numbered = articles
    .map((a, i) => `${i + 1}. [${a.source}] ${a.title}\n${a.body.slice(0, 200)}`)
    .join("\n\n");

  const prompt = prompts.filter
    .replace("{{TOPICS}}",   topics)
    .replace("{{ARTICLES}}", numbered);

  let scores;
  try {
    const response = await withModelFallback((ai, model) =>
      ai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: temperatures.filter,
      })
    );
    const text = response.choices[0].message.content.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response");
    scores = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("AI filtering failed, falling back to recency order:", err.message.split("\n")[0]);
    return articles.slice(0, topN);
  }

  const scoreMap = new Map(scores.map(({ index, score }) => [index - 1, score]));

  return articles
    .map((article, i) => ({ ...article, relevanceScore: scoreMap.get(i) ?? 0 }))
    .filter((a) => a.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, topN);
}
