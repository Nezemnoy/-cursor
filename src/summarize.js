import { getConfig } from "./config.js";
import { withModelFallback } from "./aiClient.js";

export async function summarizeArticle(article) {
  const { temperatures, prompts } = getConfig();

  const prompt = prompts.summarize
    .replace("{{TITLE}}",   article.title)
    .replace("{{SOURCE}}",  article.source)
    .replace("{{CONTENT}}", article.body.slice(0, 1500));

  try {
    const response = await withModelFallback((ai, model) =>
      ai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: temperatures.summarize,
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

export async function summarizeAll(articles) {
  const { delay } = getConfig();
  const results = [];
  for (let i = 0; i < articles.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, delay));
    results.push(await summarizeArticle(articles[i]));
  }
  return results;
}

export async function synthesizeDigest(articles) {
  const { temperatures, prompts } = getConfig();

  const articleList = articles
    .map((a, i) => `${i + 1}. [${a.actionSignal ?? ""}] ${a.title}\n   ${a.strategicTake ?? a.summary}`)
    .join("\n\n");

  const prompt = prompts.synthesize.replace("{{ARTICLES}}", articleList);

  try {
    const response = await withModelFallback((ai, model) =>
      ai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: temperatures.synthesize,
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
