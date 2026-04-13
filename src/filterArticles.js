import "dotenv/config";
import { ai, MODEL, withRetry } from "./aiClient.js";

const TOPIC_FILTERS = process.env.TOPIC_FILTERS
  ?? "AI research, LLM releases, AI policy, AI products, robotics, AI safety";
const MIN_SCORE = Number(process.env.MIN_RELEVANCE_SCORE ?? 6);
const TOP_N = Number(process.env.TOP_N_ARTICLES ?? 8);

// Sends a batch of articles to the model for relevance scoring.
// Returns articles sorted by score, filtered to MIN_SCORE+, capped at TOP_N.
export async function filterArticles(articles) {
  if (articles.length === 0) return [];

  const numbered = articles
    .map((a, i) => `${i + 1}. [${a.source}] ${a.title}\n${a.body.slice(0, 200)}`)
    .join("\n\n");

  const prompt = `You are a news curator for a daily AI digest.

Rate each article below on a scale from 1 to 10 for relevance to these topics: ${TOPIC_FILTERS}.

Rules:
- 9-10: major breakthrough, product launch, or policy event directly about AI
- 7-8: significant AI news, research, or tool
- 5-6: tangentially related to AI
- 1-4: not about AI or low interest

Respond ONLY with a valid JSON array of objects, one per article, in this exact format:
[{"index":1,"score":8},{"index":2,"score":3}, ...]

Articles:
${numbered}`;

  let scores;
  try {
    const response = await withRetry(() =>
      ai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      })
    );
    const text = response.choices[0].message.content.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response");
    scores = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("AI filtering failed, falling back to recency order:", err.message.split("\n")[0]);
    return articles.slice(0, TOP_N);
  }

  const scoreMap = new Map(scores.map(({ index, score }) => [index - 1, score]));

  return articles
    .map((article, i) => ({ ...article, relevanceScore: scoreMap.get(i) ?? 0 }))
    .filter((a) => a.relevanceScore >= MIN_SCORE)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, TOP_N);
}
