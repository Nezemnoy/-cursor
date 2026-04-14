import "dotenv/config";
import { fetchArticles } from "./src/fetchArticles.js";
import { filterArticles } from "./src/filterArticles.js";
import { summarizeAll, synthesizeDigest } from "./src/summarize.js";
import { prepareEmail } from "./src/prepareEmail.js";
import { sendEmail } from "./src/sendEmail.js";

const dryRun = process.argv.includes("--dry-run");

function ts() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function log(msg)  { console.log(`[${ts()}] ${msg}`); }
function warn(msg) { console.warn(`[${ts()}] ⚠  ${msg}`); }

// ── Fetch ────────────────────────────────────────────────────────────────────

log("Fetching articles from RSS feeds…");
const articles = await fetchArticles();
log(`  ✓ ${articles.length} articles fetched`);

if (articles.length === 0) {
  warn("No articles found — check feeds and hoursBack setting. Exiting.");
  process.exit(0);
}

// ── Filter ───────────────────────────────────────────────────────────────────

log("Filtering with AI…");
const t0 = Date.now();
const filtered = await filterArticles(articles);
const filterSec = ((Date.now() - t0) / 1000).toFixed(1);
log(`  ✓ ${filtered.length} / ${articles.length} articles passed relevance filter (${filterSec}s)`);

if (filtered.length === 0) {
  warn("All articles filtered out. Exiting.");
  process.exit(0);
}

// ── Summarize ────────────────────────────────────────────────────────────────

log(`Summarizing ${filtered.length} articles…`);
const t1 = Date.now();
const summarized = await summarizeAll(filtered);
const sumSec = ((Date.now() - t1) / 1000).toFixed(1);
log(`  ✓ Summarization done (${sumSec}s)`);

// ── Synthesize ───────────────────────────────────────────────────────────────

log("Synthesizing CTO brief…");
const t2 = Date.now();
const brief = await synthesizeDigest(summarized);
const synSec = ((Date.now() - t2) / 1000).toFixed(1);
log(`  ✓ Brief synthesized (${synSec}s)`);

// ── Send ─────────────────────────────────────────────────────────────────────

const email = prepareEmail(summarized, brief);

if (dryRun) {
  log("DRY RUN — email not sent");
  console.log("\n" + email.text);
} else {
  log("Sending email…");
  await sendEmail(email);
  log("  ✓ Done.");
}
