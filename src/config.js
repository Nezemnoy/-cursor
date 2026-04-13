import "dotenv/config";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data");
const DB_PATH = join(DATA_DIR, "config.db");

const DEFAULT_FEEDS = [
  { url: "https://openai.com/news/rss.xml",                            name: "OpenAI" },
  { url: "https://www.anthropic.com/rss.xml",                          name: "Anthropic" },
  { url: "https://deepmind.google/blog/rss.xml",                       name: "DeepMind" },
  { url: "https://ai.meta.com/blog/feed/",                             name: "Meta AI" },
  { url: "https://huggingface.co/blog/feed.xml",                       name: "Hugging Face" },
  { url: "https://www.deeplearning.ai/the-batch/feed/",                name: "The Batch" },
  { url: "https://importai.substack.com/feed",                         name: "Import AI" },
  { url: "https://www.interconnects.ai/feed",                          name: "Interconnects" },
  { url: "https://simonwillison.net/atom/everything/",                  name: "Simon Willison" },
  { url: "https://venturebeat.com/category/ai/feed/",                  name: "VentureBeat AI" },
  { url: "https://the-decoder.com/feed/",                              name: "The Decoder" },
  { url: "https://www.wired.com/feed/tag/artificial-intelligence/rss", name: "Wired AI" },
  { url: "https://www.technologyreview.com/feed/",                     name: "MIT Tech Review" },
];

const DEFAULT_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
];

// Models known to be unavailable — replaced automatically on startup
const DEAD_MODELS = new Set([
  "google/gemma-3-12b-it:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-4-maverick:free",
  "deepseek/deepseek-r1:free",
]);

export const DEFAULT_PROMPTS = {
  filter: `You are a news curator for a daily AI digest.

Rate each article below on a scale from 1 to 10 for relevance to these topics: {{TOPICS}}.

Rules:
- 9-10: major breakthrough, product launch, or policy event directly about AI
- 7-8: significant AI news, research, or tool
- 5-6: tangentially related to AI
- 1-4: not about AI or low interest

Respond ONLY with a valid JSON array of objects, one per article, in this exact format:
[{"index":1,"score":8},{"index":2,"score":3}, ...]

Articles:
{{ARTICLES}}`,

  summarize: `You are a senior technology advisor writing a daily brief for a CTO.

Title: {{TITLE}}
Source: {{SOURCE}}
Content: {{CONTENT}}

Respond ONLY with a valid JSON object in this exact format:
{"summary":"2-3 sentence factual summary of the article.","strategicTake":"1-2 sentences on architecture, vendor, hiring, or competitive implications for a technology leader.","actionSignal":"Monitor"}

actionSignal must be exactly one of: "Act Now", "Evaluate", "Monitor"`,

  synthesize: `You are a senior technology advisor. Based on today's AI news summaries below, write a brief CTO digest header.

Articles:
{{ARTICLES}}

Respond ONLY with a valid JSON object in this exact format:
{"themes":"2-3 key strategic themes visible across today's articles, in 2-3 sentences.","recommendation":"One concrete, actionable recommendation for a CTO this week, in 1-2 sentences."}`,
};

const DEFAULTS = {
  hoursBack:        "24",
  topics:           "AI research,LLM releases,AI policy,AI products,robotics,AI safety",
  minScore:         "6",
  topN:             "8",
  model:            DEFAULT_MODELS[0],
  apiKey:           "",
  tempFilter:       "0",
  tempSummarize:    "0.3",
  tempSynthesize:   "0.4",
  delay:            "2000",
  maxRetries:       "3",
  smtpHost:         "",
  smtpPort:         "587",
  smtpSecure:       "false",
  smtpUser:         "",
  smtpPass:         "",
  digestFrom:       "",
  subjectPrefix:    "AI News Digest",
  cronSchedule:     "0 7 * * *",
  schedulerEnabled: "true",
  promptFilter:     DEFAULT_PROMPTS.filter,
  promptSummarize:  DEFAULT_PROMPTS.summarize,
  promptSynthesize: DEFAULT_PROMPTS.synthesize,
};

export function openAndInit() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS feeds (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      url     TEXT NOT NULL,
      name    TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS models (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      enabled  INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS recipients (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      email   TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS runs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at    TEXT NOT NULL,
      finished_at   TEXT,
      status        TEXT NOT NULL DEFAULT 'running',
      article_count INTEGER,
      log           TEXT NOT NULL DEFAULT ''
    );
  `);

  // Seed settings on first boot
  const settingsCount = db.prepare("SELECT COUNT(*) AS n FROM settings").get().n;
  if (settingsCount === 0) {
    const stmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
    db.transaction((entries) => { for (const [k, v] of entries) stmt.run(k, v); })(
      Object.entries({
        ...DEFAULTS,
        apiKey:       process.env.OPENROUTER_API_KEY  ?? DEFAULTS.apiKey,
        model:        process.env.OPENROUTER_MODEL    ?? DEFAULTS.model,
        smtpHost:     process.env.SMTP_HOST           ?? DEFAULTS.smtpHost,
        smtpPort:     process.env.SMTP_PORT           ?? DEFAULTS.smtpPort,
        smtpSecure:   process.env.SMTP_SECURE         ?? DEFAULTS.smtpSecure,
        smtpUser:     process.env.SMTP_USER           ?? DEFAULTS.smtpUser,
        smtpPass:     process.env.SMTP_PASS           ?? DEFAULTS.smtpPass,
        digestFrom:   process.env.DIGEST_FROM         ?? DEFAULTS.digestFrom,
        topics:       process.env.TOPIC_FILTERS       ?? DEFAULTS.topics,
        minScore:     process.env.MIN_RELEVANCE_SCORE ?? DEFAULTS.minScore,
        topN:         process.env.TOP_N_ARTICLES      ?? DEFAULTS.topN,
        cronSchedule: process.env.CRON_SCHEDULE       ?? DEFAULTS.cronSchedule,
      })
    );
  } else {
    // Migrate: add prompt keys if missing (for existing DBs)
    for (const [key, val] of [
      ["promptFilter",     DEFAULTS.promptFilter],
      ["promptSummarize",  DEFAULTS.promptSummarize],
      ["promptSynthesize", DEFAULTS.promptSynthesize],
    ]) {
      const exists = db.prepare("SELECT 1 FROM settings WHERE key = ?").get(key);
      if (!exists) db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(key, val);
    }
  }

  // Seed feeds on first boot
  const feedsCount = db.prepare("SELECT COUNT(*) AS n FROM feeds").get().n;
  if (feedsCount === 0) {
    const stmt = db.prepare("INSERT INTO feeds (url, name, enabled) VALUES (?, ?, 1)");
    db.transaction((feeds) => { for (const f of feeds) stmt.run(f.url, f.name); })(DEFAULT_FEEDS);
  }

  // Seed models — migrate from settings.model if available
  const modelsCount = db.prepare("SELECT COUNT(*) AS n FROM models").get().n;
  if (modelsCount === 0) {
    const existingModel = db.prepare("SELECT value FROM settings WHERE key = 'model'").get()?.value;
    const seedModels = existingModel && !DEAD_MODELS.has(existingModel)
      ? [existingModel, ...DEFAULT_MODELS.filter((m) => m !== existingModel)]
      : DEFAULT_MODELS;
    const stmt = db.prepare("INSERT INTO models (model_id, priority, enabled) VALUES (?, ?, 1)");
    db.transaction((models) => { models.forEach((m, i) => stmt.run(m, i)); })(seedModels);
  } else {
    // Remove known-dead models
    for (const dead of DEAD_MODELS) {
      db.prepare("DELETE FROM models WHERE model_id = ?").run(dead);
    }
    // Add any missing default models
    const existing = new Set(
      db.prepare("SELECT model_id FROM models").all().map((r) => r.model_id)
    );
    const maxPriority = db.prepare("SELECT COALESCE(MAX(priority), -1) AS m FROM models").get().m;
    const stmt = db.prepare("INSERT INTO models (model_id, priority, enabled) VALUES (?, ?, 1)");
    DEFAULT_MODELS.forEach((m, i) => {
      if (!existing.has(m)) stmt.run(m, maxPriority + 1 + i);
    });
  }

  // Seed recipients — migrate from settings.recipients if available
  const recipientsCount = db.prepare("SELECT COUNT(*) AS n FROM recipients").get().n;
  if (recipientsCount === 0) {
    const existing = db.prepare("SELECT value FROM settings WHERE key = 'recipients'").get()?.value
      ?? process.env.DIGEST_RECIPIENTS ?? "";
    const emails = existing.split(/[,\n]+/).map((e) => e.trim()).filter(Boolean);
    if (emails.length > 0) {
      const stmt = db.prepare("INSERT INTO recipients (email, enabled) VALUES (?, 1)");
      db.transaction((list) => { for (const e of list) stmt.run(e); })(emails);
    }
  } else {
    // Fix any existing rows that accidentally contain multiple addresses in one field
    const bad = db.prepare("SELECT id, email FROM recipients WHERE email LIKE '%\n%' OR email LIKE '%,%'").all();
    if (bad.length > 0) {
      const del = db.prepare("DELETE FROM recipients WHERE id = ?");
      const ins = db.prepare("INSERT INTO recipients (email, enabled) VALUES (?, 1)");
      db.transaction(() => {
        for (const r of bad) {
          del.run(r.id);
          for (const e of r.email.split(/[,\n]+/).map((x) => x.trim()).filter(Boolean)) ins.run(e);
        }
      })();
    }
  }

  return db;
}

let _cache = null;

export function getConfig() {
  if (_cache) return _cache;

  let db;
  try {
    db = openAndInit();
    const rows  = db.prepare("SELECT key, value FROM settings").all();
    const s     = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const feeds = db
      .prepare("SELECT url, name FROM feeds WHERE enabled = 1 ORDER BY id")
      .all()
      .map((f) => ({ url: f.url, source: f.name }));

    const models = db
      .prepare("SELECT model_id FROM models WHERE enabled = 1 ORDER BY priority ASC")
      .all()
      .map((r) => r.model_id);

    const recipients = db
      .prepare("SELECT email FROM recipients WHERE enabled = 1 ORDER BY id")
      .all()
      .map((r) => r.email);

    _cache = build(s, feeds, models, recipients);
  } catch (err) {
    console.warn("SQLite config unavailable, using env defaults:", err.message);
    _cache = build(
      {},
      DEFAULT_FEEDS.map((f) => ({ url: f.url, source: f.name })),
      [process.env.OPENROUTER_MODEL ?? DEFAULT_MODELS[0]],
      (process.env.DIGEST_RECIPIENTS ?? "").split(",").map((r) => r.trim()).filter(Boolean),
    );
  } finally {
    db?.close();
  }

  return _cache;
}

function build(s, feeds, models, recipients) {
  return {
    feeds,
    models:     models.length > 0 ? models : [s.model ?? process.env.OPENROUTER_MODEL ?? DEFAULTS.model],
    recipients: recipients.length > 0 ? recipients
      : (s.recipients ?? process.env.DIGEST_RECIPIENTS ?? "").split(",").map((r) => r.trim()).filter(Boolean),
    hoursBack:  Number(s.hoursBack  ?? process.env.HOURS_BACK            ?? DEFAULTS.hoursBack),
    topics:            s.topics     ?? process.env.TOPIC_FILTERS          ?? DEFAULTS.topics,
    minScore:   Number(s.minScore   ?? process.env.MIN_RELEVANCE_SCORE    ?? DEFAULTS.minScore),
    topN:       Number(s.topN       ?? process.env.TOP_N_ARTICLES         ?? DEFAULTS.topN),
    apiKey:            s.apiKey     ?? process.env.OPENROUTER_API_KEY     ?? "",
    temperatures: {
      filter:     Number(s.tempFilter     ?? DEFAULTS.tempFilter),
      summarize:  Number(s.tempSummarize  ?? DEFAULTS.tempSummarize),
      synthesize: Number(s.tempSynthesize ?? DEFAULTS.tempSynthesize),
    },
    delay:      Number(s.delay      ?? DEFAULTS.delay),
    maxRetries: Number(s.maxRetries ?? DEFAULTS.maxRetries),
    smtp: {
      host:   s.smtpHost ?? process.env.SMTP_HOST  ?? "",
      port:   Number(s.smtpPort ?? process.env.SMTP_PORT ?? "587"),
      secure: (s.smtpSecure ?? process.env.SMTP_SECURE ?? "false") === "true",
      user:   s.smtpUser  ?? process.env.SMTP_USER  ?? "",
      pass:   s.smtpPass  ?? process.env.SMTP_PASS  ?? "",
    },
    from:        s.digestFrom  || process.env.DIGEST_FROM || s.smtpUser || process.env.SMTP_USER || "",
    subjectPrefix:    s.subjectPrefix    ?? DEFAULTS.subjectPrefix,
    cronSchedule:     s.cronSchedule     ?? process.env.CRON_SCHEDULE ?? DEFAULTS.cronSchedule,
    schedulerEnabled: (s.schedulerEnabled ?? "true") !== "false",
    prompts: {
      filter:     s.promptFilter     ?? DEFAULT_PROMPTS.filter,
      summarize:  s.promptSummarize  ?? DEFAULT_PROMPTS.summarize,
      synthesize: s.promptSynthesize ?? DEFAULT_PROMPTS.synthesize,
    },
  };
}
