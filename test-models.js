import "dotenv/config";
import { getConfig } from "./src/config.js";
import { getAiClient } from "./src/aiClient.js";

const { models, apiKey } = getConfig();
const ai = getAiClient(apiKey);

console.log(`Testing ${models.length} models...\n`);

for (const model of models) {
  process.stdout.write(`  ${model.padEnd(50)} `);
  const start = Date.now();
  try {
    const res = await ai.chat.completions.create({
      model,
      messages: [{ role: "user", content: 'Reply with just "ok"' }],
      max_tokens: 5,
    });
    const ms = Date.now() - start;
    const reply = res.choices[0]?.message?.content?.trim() ?? "(empty)";
    console.log(`✓  ${ms}ms  "${reply}"`);
  } catch (err) {
    const ms = Date.now() - start;
    console.log(`✗  ${ms}ms  ${err.status ?? ""} ${err.message.split("\n")[0]}`);
  }
}
