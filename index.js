import "dotenv/config";
import { fetchArticles } from "./src/fetchArticles.js";
import { filterArticles } from "./src/filterArticles.js";
import { summarizeAll, synthesizeDigest } from "./src/summarize.js";
import { prepareEmail } from "./src/prepareEmail.js";
import { sendEmail } from "./src/sendEmail.js";

const dryRun = process.argv.includes("--dry-run");

console.log("Fetching articles...");
const articles = await fetchArticles();
console.log(`  ${articles.length} articles fetched from RSS feeds`);

console.log("Filtering with AI...");
const filtered = await filterArticles(articles);
console.log(`  ${filtered.length} articles passed relevance filter`);

console.log("Summarizing with AI...");
const summarized = await summarizeAll(filtered);

console.log("Synthesizing CTO brief...");
const brief = await synthesizeDigest(summarized);

const email = prepareEmail(summarized, brief);

if (dryRun) {
  console.log("\n--- DRY RUN: email not sent ---\n");
  console.log(email.text);
} else {
  console.log("Sending email...");
  await sendEmail(email);
  console.log("Done.");
}
